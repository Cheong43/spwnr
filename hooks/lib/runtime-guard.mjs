import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const REQUIRED_TASK_MARKERS = [
  'Plan:',
  'Unit:',
  'Mode:',
  'Worktree:',
  'Blocked:',
  'Owner:',
  'Files:',
  'Claim-Policy:',
  'Risk:',
  'Plan-Approval:',
];

const CLAIM_POLICY_VALUES = new Set(['assigned', 'self-claim']);
const RISK_VALUES = new Set(['low', 'medium', 'high']);
const PLAN_APPROVAL_VALUES = new Set(['not-required', 'required', 'approved']);
const MULTI_AGENT_MODES = new Set(['team']);
const UNASSIGNED_OWNER_VALUES = new Set(['', 'unassigned', 'none', 'pool']);
const NON_EXPLICIT_FILE_SCOPE_VALUES = new Set(['', 'none', 'unscoped']);
const REVIEW_LIKE_TASK_PATTERNS = [/\breview\b/i, /\baudit\b/i, /\binspect\b/i];
const REQUIRED_WORKTREE_TOOL_SEQUENCE = [
  'ToolSearchTool',
  'EnterWorktreeTool',
  'BriefTool',
  'ExitWorktreeTool',
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
  /^\s*(?:[-*]\s*)?(?:\*\*)?unit_id(?:(?:\s*[:：]\s*\*\*)|(?:\*\*)?\s*[:：])\s*`?([^`\n]+?)`?\s*$/gim;

function normalizeText(value) {
  return typeof value === 'string' ? value : '';
}

function hasClearBlockedMarker(description) {
  return /\bBlocked:\s*(no|false|none)\b/i.test(normalizeText(description));
}

function resolveWorkspaceRoots(input = {}) {
  return [
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
}

function buildBlockedMarkerError(phase) {
  if (phase === 'creation') {
    return 'Task creation blocked. `Blocked:` is reserved for current block state and must start as `Blocked: no`. Put sequencing in `Depends-On:` or task graph relations instead.';
  }

  return 'Task completion blocked. Update the task metadata so `Blocked: no` before completing it. Put sequencing in `Depends-On:` or task graph relations instead.';
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

function normalizeMarkerEnum(value) {
  return unwrapMarkerValue(value).toLowerCase();
}

function parseCsvMarkerValue(value) {
  return unwrapMarkerValue(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readTaskContract(description) {
  return {
    mode: normalizeMarkerEnum(readMarkerValue(description, 'Mode:')),
    worktree: normalizeMarkerEnum(readMarkerValue(description, 'Worktree:')),
    owner: unwrapMarkerValue(readMarkerValue(description, 'Owner:')),
    files: parseCsvMarkerValue(readMarkerValue(description, 'Files:')),
    claimPolicy: normalizeMarkerEnum(readMarkerValue(description, 'Claim-Policy:')),
    risk: normalizeMarkerEnum(readMarkerValue(description, 'Risk:')),
    planApproval: normalizeMarkerEnum(readMarkerValue(description, 'Plan-Approval:')),
  };
}

function normalizeTaskFingerprintValue(value) {
  return normalizeText(value).trim();
}

function sameTaskFingerprint(task, input) {
  const inputSubject = normalizeTaskFingerprintValue(input.task_subject);
  const inputDescription = normalizeTaskFingerprintValue(input.task_description);

  if (!inputSubject || !inputDescription) {
    return false;
  }

  return (
    normalizeTaskFingerprintValue(task.subject) === inputSubject &&
    normalizeTaskFingerprintValue(task.description) === inputDescription
  );
}

function compareTaskIdsDescending(left, right) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const leftNumeric = Number.isFinite(leftNumber);
  const rightNumeric = Number.isFinite(rightNumber);

  if (leftNumeric && rightNumeric && leftNumber !== rightNumber) {
    return rightNumber - leftNumber;
  }

  return String(right).localeCompare(String(left));
}

function resolveCurrentTaskMirrorId(openTasks, input) {
  const matches = openTasks.filter((task) => sameTaskFingerprint(task, input));
  if (matches.length === 0) {
    return null;
  }

  matches.sort((left, right) => compareTaskIdsDescending(left.id, right.id));
  return matches[0]?.id ?? null;
}

function hasExplicitFileScope(files) {
  return (
    Array.isArray(files) &&
    files.length > 0 &&
    files.every((entry) => !NON_EXPLICIT_FILE_SCOPE_VALUES.has(entry.toLowerCase()))
  );
}

function readClaudeLaunchPolicy(input = {}) {
  const defaultPolicy = {
    permissionModel: 'explicit_allow_all',
    writeIsolation: {
      mode: 'worktree_required_for_mutation',
      autoEnter: true,
      autoExit: true,
      summaryTool: 'BriefTool',
      discoveryTool: 'ToolSearchTool',
    },
  };

  for (const root of resolveWorkspaceRoots(input)) {
    const policyPath = resolve(root, '.claude-plugin', 'workers.json');
    if (!existsSync(policyPath)) {
      continue;
    }

    try {
      const raw = JSON.parse(readFileSync(policyPath, 'utf-8'));
      const launchPolicy =
        raw && typeof raw === 'object' && raw.launchPolicy && typeof raw.launchPolicy === 'object'
          ? raw.launchPolicy
          : {};
      const claudeCodePolicy =
        launchPolicy &&
        typeof launchPolicy === 'object' &&
        launchPolicy.claude_code &&
        typeof launchPolicy.claude_code === 'object'
          ? launchPolicy.claude_code
          : {};
      const writeIsolation =
        claudeCodePolicy &&
        typeof claudeCodePolicy === 'object' &&
        claudeCodePolicy.writeIsolation &&
        typeof claudeCodePolicy.writeIsolation === 'object'
          ? claudeCodePolicy.writeIsolation
          : {};

      return {
        permissionModel: 'explicit_allow_all',
        writeIsolation: {
          mode: 'worktree_required_for_mutation',
          autoEnter:
            typeof writeIsolation.autoEnter === 'boolean'
              ? writeIsolation.autoEnter
              : defaultPolicy.writeIsolation.autoEnter,
          autoExit:
            typeof writeIsolation.autoExit === 'boolean'
              ? writeIsolation.autoExit
              : defaultPolicy.writeIsolation.autoExit,
          summaryTool:
            writeIsolation.summaryTool === 'BriefTool'
              ? 'BriefTool'
              : defaultPolicy.writeIsolation.summaryTool,
          discoveryTool:
            writeIsolation.discoveryTool === 'ToolSearchTool'
              ? 'ToolSearchTool'
              : defaultPolicy.writeIsolation.discoveryTool,
        },
      };
    } catch {
      return defaultPolicy;
    }
  }

  return defaultPolicy;
}

function taskIsReadOnlyReview(input, contract) {
  const units = extractTaskUnits(input.task_description).map((unitId) => unitId.toLowerCase());
  if (units.length > 0 && units.every((unitId) => unitId === 'review')) {
    return true;
  }

  if (hasExplicitFileScope(contract.files)) {
    return false;
  }

  const subject = normalizeText(input.task_subject);
  return REVIEW_LIKE_TASK_PATTERNS.some((pattern) => pattern.test(subject));
}

function validateClaudeMutationIsolation(input, contract, phase) {
  const launchPolicy = readClaudeLaunchPolicy(input);
  if (launchPolicy.writeIsolation.mode !== 'worktree_required_for_mutation') {
    return null;
  }

  if (taskIsReadOnlyReview(input, contract)) {
    return null;
  }

  if (contract.worktree !== 'required') {
    if (phase === 'creation') {
      return 'Task metadata is invalid. Claude mutating tasks must declare `Worktree: required` when the repo launch policy enforces worktree isolation. Reserve `Worktree: not-required` for read-only review or audit tasks.';
    }

    return 'Task completion blocked. Claude mutating tasks must keep `Worktree: required` through completion when the repo launch policy enforces worktree isolation.';
  }

  return null;
}

function detectFileScopeOverlap(leftFiles, rightFiles) {
  if (!hasExplicitFileScope(leftFiles) || !hasExplicitFileScope(rightFiles)) {
    return [];
  }

  const right = new Set(rightFiles.map((entry) => entry.toLowerCase()));
  return leftFiles.filter((entry) => right.has(entry.toLowerCase()));
}

function validateTaskContractMetadata(input, phase, env = process.env) {
  const contract = readTaskContract(input.task_description);

  if (!CLAIM_POLICY_VALUES.has(contract.claimPolicy)) {
    return 'Task metadata is invalid. `Claim-Policy:` must be `assigned` or `self-claim`.';
  }

  if (!RISK_VALUES.has(contract.risk)) {
    return 'Task metadata is invalid. `Risk:` must be `low`, `medium`, or `high`.';
  }

  if (!PLAN_APPROVAL_VALUES.has(contract.planApproval)) {
    return 'Task metadata is invalid. `Plan-Approval:` must be `not-required`, `required`, or `approved`.';
  }

  const normalizedOwner = contract.owner.trim().toLowerCase();
  if (contract.claimPolicy === 'self-claim' && !UNASSIGNED_OWNER_VALUES.has(normalizedOwner)) {
    return 'Task metadata is invalid. Self-claim tasks must start with `Owner: unassigned`.';
  }

  if (contract.claimPolicy === 'assigned' && UNASSIGNED_OWNER_VALUES.has(normalizedOwner)) {
    return 'Task metadata is invalid. Assigned tasks must declare a concrete `Owner:`.';
  }

  const mutationIsolationError = validateClaudeMutationIsolation(input, contract, phase);
  if (mutationIsolationError) {
    return mutationIsolationError;
  }

  if (
    MULTI_AGENT_MODES.has(contract.mode) &&
    contract.worktree === 'not-required' &&
    !hasExplicitFileScope(contract.files)
  ) {
    return 'Task metadata is invalid. Multi-agent no-worktree tasks must declare explicit `Files:` ownership boundaries.';
  }

  if (contract.risk === 'high' && contract.planApproval === 'not-required') {
    return 'Task metadata is invalid. High-risk tasks must require worker plan approval before implementation.';
  }

  if (phase === 'completion' && contract.planApproval === 'required') {
    return 'Task completion blocked. `Plan-Approval:` is still `required`; update it to `approved` before completing the task.';
  }

  if (phase === 'creation') {
    const conflict = findFileOwnershipConflict(input, contract, env);
    if (conflict) {
      return `Task creation blocked. File ownership overlaps with task ${conflict.task.id}:${conflict.task.subject} on ${conflict.overlaps.join(', ')}. Split the files, assign the same owner, or require a worktree before continuing.`;
    }
  }

  return null;
}

function validateWorktreeLifecycleOnCompletion(input, contract) {
  if (contract.worktree !== 'required' || taskIsReadOnlyReview(input, contract)) {
    return null;
  }

  const transcript = readRecentTranscript(input.transcript_path);
  if (!transcript) {
    return null;
  }

  if (/\bPermissionDenied\b/.test(transcript)) {
    return 'Task completion blocked. The transcript still shows a `PermissionDenied` incident. Mark the task blocked or failed instead of completing it.';
  }

  if (/\bworktree failure\b/i.test(transcript) || /\bfailed tool\b/i.test(transcript)) {
    return 'Task completion blocked. The transcript still shows a worktree or tool failure. Keep the task blocked or failed until the isolation flow succeeds.';
  }

  const seenAnyLifecycleTool = REQUIRED_WORKTREE_TOOL_SEQUENCE.some((toolName) => transcript.includes(toolName));
  if (!seenAnyLifecycleTool) {
    return null;
  }

  let lastIndex = -1;
  for (const toolName of REQUIRED_WORKTREE_TOOL_SEQUENCE) {
    const index = transcript.indexOf(toolName);
    if (index === -1) {
      return `Task completion blocked. Required worktree lifecycle evidence is incomplete. The transcript must show ${REQUIRED_WORKTREE_TOOL_SEQUENCE.join(' -> ')} before completion.`;
    }

    if (index < lastIndex) {
      return `Task completion blocked. Required worktree lifecycle evidence is out of order. The transcript must show ${REQUIRED_WORKTREE_TOOL_SEQUENCE.join(' -> ')} before completion.`;
    }

    lastIndex = index;
  }

  return null;
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
  return /^#+\s+(?:\d+(?:\.\d+)*\.?\s+)?Approved Execution Spec\b/m.test(planContents);
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

function findFileOwnershipConflict(input, contract, env = process.env) {
  if (
    !input.session_id ||
    !MULTI_AGENT_MODES.has(contract.mode) ||
    contract.worktree !== 'not-required' ||
    !hasExplicitFileScope(contract.files)
  ) {
    return null;
  }

  const currentOwner = contract.owner.trim().toLowerCase();
  const openTasks = readOpenTasks(input.session_id, input, env);
  const currentTaskMirrorId = resolveCurrentTaskMirrorId(openTasks, input);
  for (const task of openTasks) {
    if (currentTaskMirrorId && task.id === currentTaskMirrorId) {
      continue;
    }

    if (
      !MULTI_AGENT_MODES.has(task.mode) ||
      task.worktree !== 'not-required' ||
      !hasExplicitFileScope(task.files)
    ) {
      continue;
    }

    const existingOwner = task.owner.trim().toLowerCase();
    const sameAssignedOwner =
      !UNASSIGNED_OWNER_VALUES.has(currentOwner) &&
      !UNASSIGNED_OWNER_VALUES.has(existingOwner) &&
      currentOwner === existingOwner;

    if (sameAssignedOwner) {
      continue;
    }

    const overlaps = detectFileScopeOverlap(contract.files, task.files);
    if (overlaps.length > 0) {
      return { task, overlaps };
    }
  }

  return null;
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

export function evaluateTaskCreated(input, env = process.env) {
  const missing = missingTaskMarkers(input.task_description);
  if (missing.length > 0) {
    return {
      exitCode: 2,
      stderr: `Task creation blocked. Every execution task must include structured metadata fields: ${missing.join(', ')}. Build tasks from approved Execution Units instead of creating ad-hoc planning tasks.`,
    };
  }

  if (!hasClearBlockedMarker(input.task_description)) {
    return {
      exitCode: 2,
      stderr: buildBlockedMarkerError('creation'),
    };
  }

  const validation = validateReferencedPlan(input, { requireApprovedExecutionSpec: true });
  if (validation.exitCode !== 0) {
    return {
      exitCode: validation.exitCode,
      stderr: `Task creation blocked. ${validation.stderr}`,
    };
  }

  const metadataError = validateTaskContractMetadata(input, 'creation', env);
  if (metadataError) {
    return {
      exitCode: 2,
      stderr: metadataError,
    };
  }

  return {
    exitCode: 0,
  };
}

export function evaluateTaskCompleted(input, env = process.env) {
  const description = normalizeText(input.task_description);
  const missing = missingTaskMarkers(description);
  if (missing.length > 0) {
    return {
      exitCode: 2,
      stderr: `Task completion blocked. The task metadata is incomplete: ${missing.join(', ')}.`,
    };
  }

  if (!hasClearBlockedMarker(description)) {
    return {
      exitCode: 2,
      stderr: buildBlockedMarkerError('completion'),
    };
  }

  const validation = validateReferencedPlan(input);
  if (validation.exitCode !== 0) {
    return {
      exitCode: validation.exitCode,
      stderr: `Task completion blocked. ${validation.stderr}`,
    };
  }

  const metadataError = validateTaskContractMetadata(input, 'completion', env);
  if (metadataError) {
    return {
      exitCode: 2,
      stderr: metadataError,
    };
  }

  const lifecycleError = validateWorktreeLifecycleOnCompletion(input, readTaskContract(description));
  if (lifecycleError) {
    return {
      exitCode: 2,
      stderr: lifecycleError,
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
          owner: unwrapMarkerValue(readMarkerValue(task.description ?? '', 'Owner:')),
          files: parseCsvMarkerValue(readMarkerValue(task.description ?? '', 'Files:')),
          mode: normalizeMarkerEnum(readMarkerValue(task.description ?? '', 'Mode:')),
          worktree: normalizeMarkerEnum(readMarkerValue(task.description ?? '', 'Worktree:')),
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
      return evaluateTaskCreated(input, env);
    case 'TaskCompleted':
      return evaluateTaskCompleted(input, env);
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
