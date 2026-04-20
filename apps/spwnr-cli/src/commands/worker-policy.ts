import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface DynamicWorkerLineupPolicy {
  minAgents: number
  maxAgents: number
}

export interface ClaudeWriteIsolationPolicy {
  mode: 'worktree_required_for_mutation'
  autoEnter: boolean
  autoExit: boolean
  summaryTool: 'BriefTool'
  discoveryTool: 'ToolSearchTool'
}

export interface ClaudeLaunchPolicy {
  permissionModel: 'explicit_allow_all'
  writeIsolation: ClaudeWriteIsolationPolicy
}

export interface DynamicWorkerPolicy {
  selectionMode: 'dynamic'
  registrySource: 'local'
  selectionMethod: 'llm_choose'
  missingPolicy: 'auto_install_local'
  preferredDomain?: string | undefined
  lineup: DynamicWorkerLineupPolicy
  launchPolicy: {
    claude_code: ClaudeLaunchPolicy
  }
}

export interface LoadedWorkerPolicy {
  path: string | null
  source: 'default' | 'file'
  policy: DynamicWorkerPolicy
}

const DEFAULT_POLICY: DynamicWorkerPolicy = {
  selectionMode: 'dynamic',
  registrySource: 'local',
  selectionMethod: 'llm_choose',
  missingPolicy: 'auto_install_local',
  lineup: {
    minAgents: 1,
    maxAgents: 4,
  },
  launchPolicy: {
    claude_code: {
      permissionModel: 'explicit_allow_all',
      writeIsolation: {
        mode: 'worktree_required_for_mutation',
        autoEnter: true,
        autoExit: true,
        summaryTool: 'BriefTool',
        discoveryTool: 'ToolSearchTool',
      },
    },
  },
} satisfies DynamicWorkerPolicy

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizePreferredDomain(input: unknown): string | undefined {
  return typeof input === 'string' && input.trim().length > 0
    ? input
    : undefined
}

function normalizeDynamicWorkerPolicy(input: unknown): DynamicWorkerPolicy {
  const raw = isRecord(input) ? input : {}
  const lineupInput = isRecord(raw.lineup) ? raw.lineup : undefined
  const launchPolicyInput = isRecord(raw.launchPolicy) ? raw.launchPolicy : undefined

  return {
    selectionMode: 'dynamic',
    registrySource: 'local',
    selectionMethod: 'llm_choose',
    missingPolicy: 'auto_install_local',
    ...(normalizePreferredDomain(raw.preferredDomain)
      ? { preferredDomain: normalizePreferredDomain(raw.preferredDomain) }
      : {}),
    lineup: sanitizeLineupPolicy(lineupInput, DEFAULT_POLICY.lineup),
    launchPolicy: {
      claude_code: sanitizeClaudeLaunchPolicy(
        launchPolicyInput?.claude_code,
        DEFAULT_POLICY.launchPolicy.claude_code,
      ),
    },
  }
}

function sanitizeLineupPolicy(
  input: Partial<DynamicWorkerLineupPolicy> | undefined,
  fallback: DynamicWorkerLineupPolicy,
): DynamicWorkerLineupPolicy {
  const minAgents = Math.max(1, Number(input?.minAgents ?? fallback.minAgents))
  const maxAgents = Math.max(minAgents, Number(input?.maxAgents ?? fallback.maxAgents))

  return {
    minAgents,
    maxAgents,
  }
}

function sanitizeClaudeLaunchPolicy(
  input: unknown,
  fallback: ClaudeLaunchPolicy,
): ClaudeLaunchPolicy {
  const raw = isRecord(input) ? input : {}
  const writeIsolationInput = isRecord(raw.writeIsolation) ? raw.writeIsolation : undefined

  return {
    permissionModel: 'explicit_allow_all',
    writeIsolation: {
      mode: 'worktree_required_for_mutation',
      autoEnter:
        typeof writeIsolationInput?.autoEnter === 'boolean'
          ? writeIsolationInput.autoEnter
          : fallback.writeIsolation.autoEnter,
      autoExit:
        typeof writeIsolationInput?.autoExit === 'boolean'
          ? writeIsolationInput.autoExit
          : fallback.writeIsolation.autoExit,
      summaryTool:
        writeIsolationInput?.summaryTool === 'BriefTool'
          ? 'BriefTool'
          : fallback.writeIsolation.summaryTool,
      discoveryTool:
        writeIsolationInput?.discoveryTool === 'ToolSearchTool'
          ? 'ToolSearchTool'
          : fallback.writeIsolation.discoveryTool,
    },
  }
}

export function loadWorkerPolicy(cwd: string = process.cwd()): LoadedWorkerPolicy {
  const policyPath = resolve(cwd, '.claude-plugin', 'workers.json')

  if (!existsSync(policyPath)) {
    return {
      path: null,
      source: 'default',
      policy: DEFAULT_POLICY,
    }
  }

  const raw = JSON.parse(readFileSync(policyPath, 'utf-8'))

  return {
    path: policyPath,
    source: 'file',
    policy: normalizeDynamicWorkerPolicy(raw),
  }
}
