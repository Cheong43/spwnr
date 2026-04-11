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

function normalizeText(value) {
  return typeof value === 'string' ? value : '';
}

export function missingTaskMarkers(description) {
  const text = normalizeText(description);
  return REQUIRED_TASK_MARKERS.filter((marker) => !text.includes(marker));
}

export function evaluateTaskCreated(input) {
  const missing = missingTaskMarkers(input.task_description);
  if (missing.length === 0) {
    return { exitCode: 0 };
  }

  return {
    exitCode: 2,
    stderr: `Task creation blocked. Every execution task must include structured metadata fields: ${missing.join(', ')}. Build tasks from approved Execution Units instead of creating ad-hoc planning tasks.`,
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

export function readOpenTasks(sessionId, env = process.env) {
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
        return {
          id: task.id ?? name.replace(/\.json$/, ''),
          subject: task.subject ?? 'unknown',
          status: task.status ?? 'unknown',
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((task) => task.status === 'pending' || task.status === 'in_progress');
}

export function evaluateStop(input, env = process.env) {
  if (input.stop_hook_active) {
    return { exitCode: 0 };
  }

  const openTasks = readOpenTasks(input.session_id, env);
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
