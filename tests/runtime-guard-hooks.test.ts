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

function writePlanArtifact(
  baseDir: string,
  contents: string,
  filename = 'spwnr-demo-2026-04-11.md',
) {
  const planPath = join(baseDir, '.claude', 'plans', filename);
  mkdirSync(join(baseDir, '.claude', 'plans'), { recursive: true });
  writeFileSync(planPath, contents);
  return planPath;
}

function buildPlanArtifactContents({
  revisionStatus,
  unitIds = ['unit-01'],
  includeApprovedExecutionSpec = true,
  approvedExecutionSpecHeading = '## Approved Execution Spec',
  unitLineStyle = 'canonical',
}: {
  revisionStatus?: 'active' | 'superseded';
  unitIds?: string[];
  includeApprovedExecutionSpec?: boolean;
  approvedExecutionSpecHeading?: string;
  unitLineStyle?: 'canonical' | 'bold-colon-inside' | 'plain' | 'fullwidth-colon';
}) {
  const renderUnitLine = (unitId: string) => {
    switch (unitLineStyle) {
      case 'bold-colon-inside':
        return `- **unit_id:** ${unitId}`;
      case 'plain':
        return `- unit_id: ${unitId}`;
      case 'fullwidth-colon':
        return `- **unit_id**： ${unitId}`;
      default:
        return `- **unit_id**: \`${unitId}\``;
    }
  };

  return [
    '# Metadata',
    '',
    revisionStatus ? `- **Revision Status**: \`${revisionStatus}\`` : null,
    '',
    '## Detailed Plan',
    '',
    '### Execution Units',
    '',
    ...unitIds.flatMap((unitId) => [renderUnitLine(unitId), '']),
    includeApprovedExecutionSpec
      ? [approvedExecutionSpecHeading, '', '- mode: pipeline', ''].join('\n')
      : ['## Plan Review Loop', '', '- latest decision: continue', ''].join('\n'),
  ]
    .filter(Boolean)
    .join('\n');
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
  'Mode: pipeline',
  'Worktree: required',
  'Blocked: no',
  'Owner: builder',
  'Files: src/app.tsx, src/app.test.tsx',
  'Claim-Policy: assigned',
  'Risk: medium',
  'Plan-Approval: not-required',
].join('\n');

const reviewTaskDescription = [
  'Plan: .claude/plans/spwnr-demo-2026-04-11.md',
  'Unit: review',
  'Mode: pipeline',
  'Worktree: not-required',
  'Blocked: no',
  'Owner: reviewer',
  'Files: none',
  'Claim-Policy: assigned',
  'Risk: low',
  'Plan-Approval: not-required',
].join('\n');

describe('runtime guard helpers', () => {
  it('detects missing task markers', () => {
    expect(missingTaskMarkers('Plan: x\nUnit: u1')).toEqual([
      'Mode:',
      'Worktree:',
      'Blocked:',
      'Owner:',
      'Files:',
      'Claim-Policy:',
      'Risk:',
      'Plan-Approval:',
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
    expect(result.stderr).toContain('Mode:');
  });

  it('allows task creation when structured metadata is present', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    expect(
      evaluateTaskCreated({
        hook_event_name: 'TaskCreated',
        task_subject: 'Execute unit-01',
        task_description: validTaskDescription,
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('allows task creation when the plan unit_id marker uses colon-inside-bold markdown', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({ unitLineStyle: 'bold-colon-inside' }));

    expect(
      evaluateTaskCreated({
        hook_event_name: 'TaskCreated',
        task_subject: 'Execute unit-01',
        task_description: validTaskDescription,
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('allows task creation when the plan unit_id marker uses plain or fullwidth-colon variants', () => {
    for (const unitLineStyle of ['plain', 'fullwidth-colon'] as const) {
      const dir = makeTempDir();
      writePlanArtifact(dir, buildPlanArtifactContents({ unitLineStyle }));

      expect(
        evaluateTaskCreated({
          hook_event_name: 'TaskCreated',
          task_subject: 'Execute unit-01',
          task_description: validTaskDescription,
          cwd: dir,
        }),
      ).toEqual({ exitCode: 0 });
    }
  });

  it('allows task creation when sequencing is recorded in Depends-On while Blocked stays clear', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    expect(
      evaluateTaskCreated({
        hook_event_name: 'TaskCreated',
        task_subject: 'Execute unit-01',
        task_description: [validTaskDescription, 'Depends-On: unit-00'].join('\n'),
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('allows task creation when legacy single-lane metadata is still present', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    expect(
      evaluateTaskCreated({
        hook_event_name: 'TaskCreated',
        task_subject: 'Execute unit-01',
        task_description: validTaskDescription.replace('Mode: pipeline', 'Mode: single-lane'),
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('allows task creation when deprecated metadata is still present', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    const legacyTaskDescription = [
      validTaskDescription,
      'Depends-On: none',
      'Done: implementation and tests complete',
      'Capability: frontend-delivery',
      'Approved Execution Spec: present',
      'Heartbeat: 5m',
    ].join('\n');

    expect(
      evaluateTaskCreated({
        hook_event_name: 'TaskCreated',
        task_subject: 'Execute unit-01',
        task_description: legacyTaskDescription,
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('blocks task creation when sequencing is encoded in Blocked metadata', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    const result = evaluateTaskCreated({
      hook_event_name: 'TaskCreated',
      task_subject: 'Execute unit-01',
      task_description: validTaskDescription.replace('Blocked: no', 'Blocked: unit-00'),
      cwd: dir,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Blocked: no');
    expect(result.stderr).toContain('Depends-On:');
  });

  it('blocks task creation when a high-risk unit skips worker plan approval', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    const result = evaluateTaskCreated({
      hook_event_name: 'TaskCreated',
      task_subject: 'Execute unit-01',
      task_description: validTaskDescription
        .replace('Risk: medium', 'Risk: high')
        .replace('Plan-Approval: not-required', 'Plan-Approval: not-required'),
      cwd: dir,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('High-risk tasks');
    expect(result.stderr).toContain('plan approval');
  });

  it('blocks task creation when a Claude mutating task tries to skip required worktree isolation', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    const result = evaluateTaskCreated({
      hook_event_name: 'TaskCreated',
      task_subject: 'Execute unit-01',
      task_description: validTaskDescription
        .replace('Worktree: required', 'Worktree: not-required'),
      cwd: dir,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Claude mutating tasks');
    expect(result.stderr).toContain('Worktree: required');
  });

  it('allows read-only review tasks to keep Worktree: not-required', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({ unitIds: ['review'] }));

    expect(
      evaluateTaskCreated({
        hook_event_name: 'TaskCreated',
        task_subject: 'Review unit-01 output',
        task_description: reviewTaskDescription,
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('ignores the current task mirror when conflict detection reads session task state', () => {
    const claudeHome = makeTempDir();
    const taskDir = join(claudeHome, 'tasks', 'session-1');
    const workspace = makeTempDir();
    const currentTaskDescription = validTaskDescription.replace('Mode: pipeline', 'Mode: team');

    mkdirSync(taskDir, { recursive: true });
    writePlanArtifact(workspace, buildPlanArtifactContents({}));
    writeFileSync(
      join(taskDir, '6.json'),
      JSON.stringify({
        id: '6',
        subject: 'Execute unit-01',
        description: currentTaskDescription,
        status: 'pending',
      }),
    );

    expect(
      evaluateTaskCreated(
        {
          hook_event_name: 'TaskCreated',
          task_subject: 'Execute unit-01',
          task_description: currentTaskDescription,
          session_id: 'session-1',
          cwd: workspace,
        },
        {
          CLAUDE_HOME: claudeHome,
        },
      ),
    ).toEqual({ exitCode: 0 });
  });

  it('accepts backtick-wrapped relative plan paths in task metadata', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    expect(
      evaluateTaskCreated({
        hook_event_name: 'TaskCreated',
        task_subject: 'Execute unit-01',
        task_description: validTaskDescription.replace(
          'Plan: .claude/plans/spwnr-demo-2026-04-11.md',
          'Plan: `.claude/plans/spwnr-demo-2026-04-11.md`',
        ),
        working_directory: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('blocks task creation when the plan artifact lacks Approved Execution Spec', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({ includeApprovedExecutionSpec: false }));

    const result = evaluateTaskCreated({
      hook_event_name: 'TaskCreated',
      task_subject: 'Execute unit-01',
      task_description: validTaskDescription,
      cwd: dir,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Approved Execution Spec');
    expect(result.stderr).toContain('referenced plan artifact');
  });

  it('allows task creation when Approved Execution Spec uses a numbered heading', () => {
    const dir = makeTempDir();
    writePlanArtifact(
      dir,
      buildPlanArtifactContents({
        approvedExecutionSpecHeading: '## 10. Approved Execution Spec',
      }),
    );

    expect(
      evaluateTaskCreated({
        hook_event_name: 'TaskCreated',
        task_subject: 'Execute unit-01',
        task_description: validTaskDescription,
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('blocks task creation when the referenced plan revision is superseded', () => {
    const dir = makeTempDir();
    writePlanArtifact(
      dir,
      buildPlanArtifactContents({
        revisionStatus: 'superseded',
        unitIds: ['site-build'],
      }),
    );

    const result = evaluateTaskCreated({
      hook_event_name: 'TaskCreated',
      task_subject: 'Execute site-build',
      task_description: validTaskDescription.replace('Unit: unit-01', 'Unit: site-build'),
      cwd: dir,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('superseded');
    expect(result.stderr).toContain('latest active plan revision');
  });

  it('blocks task creation when the task unit is missing from the active plan revision', () => {
    const dir = makeTempDir();
    writePlanArtifact(
      dir,
      buildPlanArtifactContents({
        unitIds: ['unit-01'],
      }),
    );

    const result = evaluateTaskCreated({
      hook_event_name: 'TaskCreated',
      task_subject: 'Execute unknown-unit',
      task_description: validTaskDescription.replace('Unit: unit-01', 'Unit: unit-99'),
      cwd: dir,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('`Unit:`');
    expect(result.stderr).toContain('active plan revision');
  });

  it('prefers the newest plan revision during a material re-plan', () => {
    const dir = makeTempDir();
    writePlanArtifact(
      dir,
      buildPlanArtifactContents({
        revisionStatus: 'superseded',
        unitIds: ['site-build'],
      }),
    );
    writePlanArtifact(
      dir,
      buildPlanArtifactContents({
        revisionStatus: 'active',
        unitIds: ['3d-scene'],
      }),
      'spwnr-demo-2026-04-11-r2.md',
    );

    const staleTaskResult = evaluateTaskCreated({
      hook_event_name: 'TaskCreated',
      task_subject: 'Execute site-build',
      task_description: validTaskDescription.replace('Unit: unit-01', 'Unit: site-build'),
      cwd: dir,
    });
    const replannedTaskResult = evaluateTaskCreated({
      hook_event_name: 'TaskCreated',
      task_subject: 'Execute 3d-scene',
      task_description: validTaskDescription
        .replace('Plan: .claude/plans/spwnr-demo-2026-04-11.md', 'Plan: .claude/plans/spwnr-demo-2026-04-11-r2.md')
        .replace('Unit: unit-01', 'Unit: 3d-scene'),
      cwd: dir,
    });

    expect(staleTaskResult.exitCode).toBe(2);
    expect(staleTaskResult.stderr).toContain('superseded');
    expect(replannedTaskResult).toEqual({ exitCode: 0 });
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
    expect(result.stderr).toContain('Depends-On:');
  });

  it('allows completion when metadata is complete and unblocked', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    expect(
      evaluateTaskCompleted({
        hook_event_name: 'TaskCompleted',
        task_subject: 'Execute unit-01',
        task_description: validTaskDescription,
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('allows completion for read-only review tasks with Worktree: not-required', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({ unitIds: ['review'] }));

    expect(
      evaluateTaskCompleted({
        hook_event_name: 'TaskCompleted',
        task_subject: 'Review unit-01 output',
        task_description: reviewTaskDescription,
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('allows completion when legacy single-lane metadata is still present', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    expect(
      evaluateTaskCompleted({
        hook_event_name: 'TaskCompleted',
        task_subject: 'Execute unit-01',
        task_description: validTaskDescription.replace('Mode: pipeline', 'Mode: single-lane'),
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('allows completion when deprecated metadata is still present', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    const legacyTaskDescription = [
      validTaskDescription,
      'Depends-On: none',
      'Done: implementation and tests complete',
      'Capability: frontend-delivery',
      'Approved Execution Spec: present',
      'Heartbeat: 5m',
    ].join('\n');

    expect(
      evaluateTaskCompleted({
        hook_event_name: 'TaskCompleted',
        task_subject: 'Execute unit-01',
        task_description: legacyTaskDescription,
        cwd: dir,
      }),
    ).toEqual({ exitCode: 0 });
  });

  it('blocks completion when worker plan approval is still pending', () => {
    const dir = makeTempDir();
    writePlanArtifact(dir, buildPlanArtifactContents({}));

    const result = evaluateTaskCompleted({
      hook_event_name: 'TaskCompleted',
      task_subject: 'Execute unit-01',
      task_description: validTaskDescription
        .replace('Risk: medium', 'Risk: high')
        .replace('Plan-Approval: not-required', 'Plan-Approval: required'),
      cwd: dir,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Plan-Approval');
    expect(result.stderr).toContain('approved');
  });

  it('blocks completion when the required worktree lifecycle is incomplete in the transcript', () => {
    const dir = makeTempDir();
    const transcript = join(dir, 'transcript.jsonl');
    writePlanArtifact(dir, buildPlanArtifactContents({}));
    writeFileSync(
      transcript,
      [
        '{"tool_name":"ToolSearchTool"}',
        '{"tool_name":"EnterWorktreeTool"}',
        '{"tool_name":"BriefTool"}',
      ].join('\n'),
    );

    const result = evaluateTaskCompleted({
      hook_event_name: 'TaskCompleted',
      task_subject: 'Execute unit-01',
      task_description: validTaskDescription,
      cwd: dir,
      transcript_path: transcript,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('worktree lifecycle evidence');
    expect(result.stderr).toContain('ExitWorktreeTool');
  });

  it('blocks completion when the transcript still shows a permission denial', () => {
    const dir = makeTempDir();
    const transcript = join(dir, 'transcript.jsonl');
    writePlanArtifact(dir, buildPlanArtifactContents({}));
    writeFileSync(
      transcript,
      [
        '{"tool_name":"ToolSearchTool"}',
        '{"tool_name":"EnterWorktreeTool"}',
        '{"hook_event_name":"PermissionDenied"}',
      ].join('\n'),
    );

    const result = evaluateTaskCompleted({
      hook_event_name: 'TaskCompleted',
      task_subject: 'Execute unit-01',
      task_description: validTaskDescription,
      cwd: dir,
      transcript_path: transcript,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('PermissionDenied');
    expect(result.stderr).toContain('blocked or failed');
  });

  it('blocks completion when the referenced plan revision is superseded', () => {
    const dir = makeTempDir();
    writePlanArtifact(
      dir,
      buildPlanArtifactContents({
        revisionStatus: 'superseded',
        unitIds: ['unit-01'],
      }),
    );

    const result = evaluateTaskCompleted({
      hook_event_name: 'TaskCompleted',
      task_subject: 'Execute unit-01',
      task_description: validTaskDescription,
      cwd: dir,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('superseded');
  });

  it('blocks completion when the task unit is absent from the active revision', () => {
    const dir = makeTempDir();
    writePlanArtifact(
      dir,
      buildPlanArtifactContents({
        unitIds: ['unit-02'],
      }),
    );

    const result = evaluateTaskCompleted({
      hook_event_name: 'TaskCompleted',
      task_subject: 'Execute unit-01',
      task_description: validTaskDescription,
      cwd: dir,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('`Unit:`');
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
    const workspace = makeTempDir();
    mkdirSync(taskDir, { recursive: true });
    writePlanArtifact(workspace, buildPlanArtifactContents({}));
    writeFileSync(
      join(taskDir, '1.json'),
      JSON.stringify({
        id: '1',
        subject: 'Execute unit-01',
        description: validTaskDescription,
        status: 'in_progress',
      }),
    );

    const result = evaluateStop(
      {
        hook_event_name: 'Stop',
        session_id: 'session-1',
        stop_hook_active: false,
        cwd: workspace,
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

  it('ignores open tasks that belong to superseded plan revisions', () => {
    const claudeHome = makeTempDir();
    const taskDir = join(claudeHome, 'tasks', 'session-1');
    const workspace = makeTempDir();
    mkdirSync(taskDir, { recursive: true });
    writePlanArtifact(
      workspace,
      buildPlanArtifactContents({
        revisionStatus: 'superseded',
        unitIds: ['site-build'],
      }),
    );
    writeFileSync(
      join(taskDir, '1.json'),
      JSON.stringify({
        id: '1',
        subject: 'Execute site-build',
        description: validTaskDescription.replace('Unit: unit-01', 'Unit: site-build'),
        status: 'in_progress',
      }),
    );

    expect(
      evaluateStop(
        {
          hook_event_name: 'Stop',
          session_id: 'session-1',
          stop_hook_active: false,
          cwd: workspace,
        },
        {
          CLAUDE_HOME: claudeHome,
        },
      ),
    ).toEqual({ exitCode: 0 });
  });

  it('blocks only on tasks tied to the active revision during a re-plan', () => {
    const claudeHome = makeTempDir();
    const taskDir = join(claudeHome, 'tasks', 'session-1');
    const workspace = makeTempDir();
    mkdirSync(taskDir, { recursive: true });
    writePlanArtifact(
      workspace,
      buildPlanArtifactContents({
        revisionStatus: 'superseded',
        unitIds: ['site-build'],
      }),
    );
    writePlanArtifact(
      workspace,
      buildPlanArtifactContents({
        revisionStatus: 'active',
        unitIds: ['3d-scene'],
      }),
      'spwnr-demo-2026-04-11-r2.md',
    );
    writeFileSync(
      join(taskDir, '1.json'),
      JSON.stringify({
        id: '1',
        subject: 'Execute site-build',
        description: validTaskDescription.replace('Unit: unit-01', 'Unit: site-build'),
        status: 'in_progress',
      }),
    );
    writeFileSync(
      join(taskDir, '2.json'),
      JSON.stringify({
        id: '2',
        subject: 'Execute 3d-scene',
        description: validTaskDescription
          .replace('Plan: .claude/plans/spwnr-demo-2026-04-11.md', 'Plan: .claude/plans/spwnr-demo-2026-04-11-r2.md')
          .replace('Unit: unit-01', 'Unit: 3d-scene'),
        status: 'pending',
      }),
    );

    const result = evaluateStop(
      {
        hook_event_name: 'Stop',
        session_id: 'session-1',
        stop_hook_active: false,
        cwd: workspace,
      },
      {
        CLAUDE_HOME: claudeHome,
      },
    );

    expect(result.json).toEqual({
      decision: 'block',
      reason: expect.stringContaining('2:Execute 3d-scene'),
    });
    expect(result.json.reason).not.toContain('1:Execute site-build');
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
