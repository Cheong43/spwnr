import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  evaluatePermissionDenied,
  evaluateStop,
  evaluateTaskCompleted,
  evaluateTaskCreated,
  evaluateTeammateIdle,
  missingTaskMarkers,
} from '../hooks/lib/runtime-guard.mjs';

const tempDirs = new Set<string>();

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'spwnr-hook-test-'));
  tempDirs.add(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.clear();
});

const validTaskDescription = [
  'Plan: .claude/plans/spwnr-demo-2026-04-11.md',
  'Unit: unit-01',
  'Depends-On: none',
  'Done: implementation and tests complete',
  'Capability: frontend-delivery',
  'Mode: team',
  'Worktree: not-required',
  'Approved Execution Spec: present',
  'Blocked: no',
].join('\n');

describe('runtime guard helpers', () => {
  it('detects missing task markers', () => {
    expect(missingTaskMarkers('Plan: x\nUnit: u1')).toEqual([
      'Depends-On:',
      'Done:',
      'Capability:',
      'Mode:',
      'Worktree:',
      'Approved Execution Spec:',
      'Blocked:',
    ]);
  });
});

describe('TaskCreated guard', () => {
  it('blocks ad-hoc task creation without required metadata', () => {
    const result = evaluateTaskCreated({
      hook_event_name: 'TaskCreated',
      task_subject: 'Draft plan',
      task_description: 'Plan: x',
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Task creation blocked');
    expect(result.stderr).toContain('Depends-On:');
  });

  it('allows task creation when structured metadata is present', () => {
    expect(
      evaluateTaskCreated({
        hook_event_name: 'TaskCreated',
        task_subject: 'Execute unit-01',
        task_description: validTaskDescription,
      }),
    ).toEqual({ exitCode: 0 });
  });
});

describe('TaskCompleted guard', () => {
  it('blocks completion when the task is marked blocked', () => {
    const result = evaluateTaskCompleted({
      hook_event_name: 'TaskCompleted',
      task_subject: 'Execute unit-01',
      task_description: validTaskDescription.replace('Blocked: no', 'Blocked: yes'),
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Blocked: no');
  });

  it('allows completion when metadata is complete and unblocked', () => {
    expect(
      evaluateTaskCompleted({
        hook_event_name: 'TaskCompleted',
        task_subject: 'Execute unit-01',
        task_description: validTaskDescription,
      }),
    ).toEqual({ exitCode: 0 });
  });
});

describe('TeammateIdle guard', () => {
  it('blocks idle teammates that did not update task state or send an incident', () => {
    const dir = makeTempDir();
    const transcript = join(dir, 'transcript.jsonl');
    writeFileSync(transcript, '{"type":"assistant","message":"still working"}\n');

    const result = evaluateTeammateIdle({
      hook_event_name: 'TeammateIdle',
      teammate_name: 'builder',
      transcript_path: transcript,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('TaskUpdate');
    expect(result.stderr).toContain('SendMessage');
  });

  it('allows idle when recent transcript activity includes a task update', () => {
    const dir = makeTempDir();
    const transcript = join(dir, 'transcript.jsonl');
    writeFileSync(transcript, '{"tool_name":"TaskUpdate","status":"completed"}\n');

    expect(
      evaluateTeammateIdle({
        hook_event_name: 'TeammateIdle',
        teammate_name: 'builder',
        transcript_path: transcript,
      }),
    ).toEqual({ exitCode: 0 });
  });
});

describe('PermissionDenied guard', () => {
  it('allows retry in auto mode', () => {
    expect(
      evaluatePermissionDenied({
        hook_event_name: 'PermissionDenied',
        permission_mode: 'auto',
      }),
    ).toEqual({
      json: {
        hookSpecificOutput: {
          hookEventName: 'PermissionDenied',
          retry: true,
        },
      },
    });
  });

  it('does nothing outside auto mode', () => {
    expect(
      evaluatePermissionDenied({
        hook_event_name: 'PermissionDenied',
        permission_mode: 'default',
      }),
    ).toEqual({ exitCode: 0 });
  });
});

describe('Stop guard', () => {
  it('blocks stop when shared tasks are still open', () => {
    const claudeHome = makeTempDir();
    const taskDir = join(claudeHome, 'tasks', 'session-1');
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(
      join(taskDir, '1.json'),
      JSON.stringify({
        id: '1',
        subject: 'Execute unit-01',
        status: 'in_progress',
      }),
    );

    const result = evaluateStop(
      {
        hook_event_name: 'Stop',
        session_id: 'session-1',
        stop_hook_active: false,
      },
      {
        CLAUDE_HOME: claudeHome,
      },
    );

    expect(result.json).toEqual({
      decision: 'block',
      reason: expect.stringContaining('Shared tasks are still open'),
    });
  });

  it('allows stop when no open tasks remain or the stop hook already re-fired', () => {
    expect(
      evaluateStop({
        hook_event_name: 'Stop',
        session_id: 'session-1',
        stop_hook_active: true,
      }),
    ).toEqual({ exitCode: 0 });
  });
});
