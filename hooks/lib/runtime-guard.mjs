import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const REQUIRED_TASK_MARKERS = [
  'Plan:',
  'Unit:',
  'Depends-On:',
  'Done:',
  'Capability:',
  'Mode:',
  'Worktree:',
  'Approved Execution Spec:',
  'Blocked:',
];

const RECENT_TEAM_SIGNAL_PATTERNS = [
  /\bTaskUpdate\b/,
  /\bSendMessage\b/,
  /"hook_event_name":"TaskCompleted"/,
];

const SYNTHETIC_TASK_UNITS = new Set(['integration', 'review']);
const PLAN_REVISION_FILENAME_PATTERN = /^(spwnr-.+?-\d{4}-\d{2}-\d{2})(?:-r(\d+))?\.md$/i;
const PLAN_REVISION_STATUS_PATTERN =
  /^\s*(?:[-*]\s*)?(?:\*\*)?Revision Status(?:\*\*)?\s*:\s*`?(active|superseded)`?\s*$/gim;
const PLAN_UNIT_ID_PATTERN =
  /^\s*(?:[-*]\s*)?(?:\*\*)?unit_id(?:\*\*)?\s*:\s*`?([^`\n]+?)`?\s*$/gim;

function normalizeText(value) {
  return typeof value === 'string' ? value : '';
}

export function missingTaskMarkers(description) {
  const text = normalizeText(description);
  return REQUIRED_TASK_MARKERS.filter((marker) => !text.includes(marker));
}

function readMarkerValue(description, marker) {
  const text = normalizeText(description);
  const line = text
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(marker));

  return line ? line.slice(marker.length).trim() : '';
}

function unwrapMarkerValue(value) {
  let normalized = normalizeText(value).trim();
  if (!normalized) {
    return '';
  }

  const markdownLinkMatch = normalized.match(/^\[[^\]]+\]\((.+)\)$/);
  if (markdownLinkMatch) {
    normalized = markdownLinkMatch[1].trim();
  }

  while (
    (normalized.startsWith('`') && normalized.endsWith('`')) ||
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('<') && normalized.endsWith('>'))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

function resolvePlanArtifactPath(input) {
  const planPath = unwrapMarkerValue(readMarkerValue(input.task_description, 'Plan:'));
  return resolvePlanArtifactPathFromValue(planPath, input);
}

function resolvePlanArtifactPathFromValue(planPathValue, input = {}) {
  const planPath = unwrapMarkerValue(planPathValue);
  if (!planPath) {
    return null;
  }

  if (planPath.startsWith('/')) {
    return planPath;
  }

  const candidateRoots = [
    input.cwd,
    input.working_directory,
    input.workspace_path,
    input.workspace_root,
    input.project_path,
    input.project_root,
    input.repo_path,
    process.env.PWD,
    process.cwd(),
  ].filter(Boolean);

  for (const root of candidateRoots) {
    const candidatePath = resolve(root, planPath);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return resolve(candidateRoots[0] ?? process.cwd(), planPath);
}

function planContainsApprovedExecutionSpec(planContents) {
  return /^#+\s+Approved Execution Spec\b/m.test(planContents);
}

function extractTaskUnits(description) {
  const rawUnits = unwrapMarkerValue(readMarkerValue(description, 'Unit:'));
  if (!rawUnits) {
    return [];
  }

  return rawUnits
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function extractPlanRevisionIdentity(planPath) {
  const filename = planPath.split('/').pop() ?? '';
  const match = filename.match(PLAN_REVISION_FILENAME_PATTERN);
  if (!match) {
    return null;
  }

  return {
    family: match[1],
    revision: Number(match[2] ?? '1'),
  };
}

function extractPlanRevisionStatus(planContents) {
  const matches = [...planContents.matchAll(PLAN_REVISION_STATUS_PATTERN)];
  if (matches.length === 0) {
    return null;
  }

  return matches.at(-1)?.[1]?.toLowerCase() ?? null;
}

function extractPlanUnitIds(planContents) {
  const unitIds = new Set();

  for (const match of planContents.matchAll(PLAN_UNIT_ID_PATTERN)) {
    const unitId = unwrapMarkerValue(match[1]).trim();
    if (unitId) {
      unitIds.add(unitId);
    }
  }

  return unitIds;
}

function hasNewerPlanRevision(planPath) {
  const identity = extractPlanRevisionIdentity(planPath);
  if (!identity) {
    return false;
  }

  const directory = planPath.slice(0, planPath.lastIndexOf('/'));
  if (!directory || !existsSync(directory)) {
    return false;
  }

  return readdirSync(directory).some((filename) => {
    const match = filename.match(PLAN_REVISION_FILENAME_PATTERN);
    if (!match || match[1] !== identity.family) {
      return false;
    }

    return Number(match[2] ?? '1') > identity.revision;
  });
}

function readPlanArtifactState(planPath) {
  const contents = readFileSync(planPath, 'utf-8');
  const explicitStatus = extractPlanRevisionStatus(contents);
  const status =
    explicitStatus === 'superseded' || hasNewerPlanRevision(planPath) ? 'superseded' : 'active';

  return {
    contents,
    status,
    unitIds: extractPlanUnitIds(contents),
  };
}

function validateReferencedPlan(input, options = {}) {
  const { requireApprovedExecutionSpec = false } = options;
  const description = normalizeText(input.task_description);
  const planPath = resolvePlanArtifactPath(input);
  if (!planPath || !existsSync(planPath)) {
    return {
      exitCode: 2,
      stderr: 'The referenced plan artifact could not be read from `Plan:`. Persist the shared plan file before continuing.',
    };
  }

  const planState = readPlanArtifactState(planPath);
  if (planState.status === 'superseded') {
    return {
      exitCode: 2,
      stderr:
        'The referenced plan artifact is superseded. Continue from the latest active plan revision instead of using the previous task graph.',
    };
  }

  if (requireApprovedExecutionSpec && !planContainsApprovedExecutionSpec(planState.contents)) {
    return {
      exitCode: 2,
      stderr:
        'The referenced plan artifact does not contain an `Approved Execution Spec` section yet. Write the execution spec back to the active plan revision before continuing.',
    };
  }

  const taskUnits = extractTaskUnits(description);
  if (
    taskUnits.length > 0 &&
    planState.unitIds.size > 0 &&
    taskUnits.some((unitId) => !SYNTHETIC_TASK_UNITS.has(unitId) && !planState.unitIds.has(unitId))
  ) {
    return {
      exitCode: 2,
      stderr:
        'The task references a `Unit:` that is not present in the active plan revision. Rebuild the task graph from the latest execution units before continuing.',
    };
  }

  return {
    exitCode: 0,
    planPath,
    planState,
  };
}

export function evaluateTaskCreated(input) {
  const missing = missingTaskMarkers(input.task_description);
  if (missing.length > 0) {
    return {
      exitCode: 2,
      stderr: `Task creation blocked. Every execution task must include structured metadata fields: ${missing.join(', ')}. Build tasks from approved Execution Units instead of creating ad-hoc planning tasks.`,
    };
  }

  const validation = validateReferencedPlan(input, { requireApprovedExecutionSpec: true });
  if (validation.exitCode !== 0) {
    return {
      exitCode: validation.exitCode,
      stderr: `Task creation blocked. ${validation.stderr}`,
    };
  }

  return {
    exitCode: 0,
  };
}

export function evaluateTaskCompleted(input) {
  const description = normalizeText(input.task_description);
  const missing = missingTaskMarkers(description);
  if (missing.length > 0) {
    return {
      exitCode: 2,
      stderr: `Task completion blocked. The task metadata is incomplete: ${missing.join(', ')}.`,
    };
  }

  if (!/\bBlocked:\s*(no|false|none)\b/i.test(description)) {
    return {
      exitCode: 2,
      stderr: 'Task completion blocked. Update the task metadata so `Blocked: no` before completing it.',
    };
  }

  const validation = validateReferencedPlan(input);
  if (validation.exitCode !== 0) {
    return {
      exitCode: validation.exitCode,
      stderr: `Task completion blocked. ${validation.stderr}`,
    };
  }

  return { exitCode: 0 };
}

function readRecentTranscript(transcriptPath, maxLines = 120) {
  if (!transcriptPath || !existsSync(transcriptPath)) {
    return '';
  }

  const content = readFileSync(transcriptPath, 'utf-8');
  const lines = content.trim().split('\n');
  return lines.slice(-maxLines).join('\n');
}

export function evaluateTeammateIdle(input) {
  const recentTranscript = readRecentTranscript(input.transcript_path);
  const hasRecentStatusSignal = RECENT_TEAM_SIGNAL_PATTERNS.some((pattern) => pattern.test(recentTranscript));
  if (hasRecentStatusSignal) {
    return { exitCode: 0 };
  }

  return {
    exitCode: 2,
    stderr: `Teammate ${input.teammate_name ?? 'unknown'} is about to go idle without updating shared state. Before stopping, either call TaskUpdate for the active task or send a structured incident to the lead with SendMessage.`,
  };
}

export function evaluatePermissionDenied(input) {
  if (input.permission_mode !== 'auto') {
    return { exitCode: 0 };
  }

  return {
    json: {
      hookSpecificOutput: {
        hookEventName: 'PermissionDenied',
        retry: true,
      },
    },
  };
}

export function getClaudeHome(env = process.env) {
  if (env.CLAUDE_HOME) {
    return resolve(env.CLAUDE_HOME);
  }

  if (env.HOME) {
    return join(env.HOME, '.claude');
  }

  return join(homedir(), '.claude');
}

export function readOpenTasks(sessionId, input = {}, env = process.env) {
  if (!sessionId) {
    return [];
  }

  const taskDir = join(getClaudeHome(env), 'tasks', sessionId);
  if (!existsSync(taskDir)) {
    return [];
  }

  return readdirSync(taskDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const absolutePath = join(taskDir, name);
      try {
        const task = JSON.parse(readFileSync(absolutePath, 'utf-8'));
        const planPath = resolvePlanArtifactPathFromValue(
          readMarkerValue(task.description ?? '', 'Plan:'),
          input,
        );
        const planStatus =
          planPath && existsSync(planPath) ? readPlanArtifactState(planPath).status : 'unknown';
        return {
          id: task.id ?? name.replace(/\.json$/, ''),
          subject: task.subject ?? 'unknown',
          description: task.description ?? '',
          status: task.status ?? 'unknown',
          planStatus,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((task) => task.planStatus !== 'superseded')
    .filter((task) => task.status === 'pending' || task.status === 'in_progress');
}

export function evaluateStop(input, env = process.env) {
  if (input.stop_hook_active) {
    return { exitCode: 0 };
  }

  const openTasks = readOpenTasks(input.session_id, input, env);
  if (openTasks.length === 0) {
    return { exitCode: 0 };
  }

  const summary = openTasks
    .slice(0, 3)
    .map((task) => `${task.id}:${task.subject}`)
    .join(', ');

  return {
    json: {
      decision: 'block',
      reason: `Shared tasks are still open (${summary}). Re-check the queue with TaskList and TaskGet, update blocked tasks, or finish the remaining execution before stopping.`,
    },
  };
}

export function evaluateRuntimeGuard(input, env = process.env) {
  switch (input.hook_event_name) {
    case 'TaskCreated':
      return evaluateTaskCreated(input);
    case 'TaskCompleted':
      return evaluateTaskCompleted(input);
    case 'TeammateIdle':
      return evaluateTeammateIdle(input);
    case 'PermissionDenied':
      return evaluatePermissionDenied(input);
    case 'Stop':
      return evaluateStop(input, env);
    default:
      return { exitCode: 0 };
  }
}
