import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface DynamicWorkerLineupPolicy {
  minAgents: number
  maxAgents: number
}

export interface DynamicWorkerPolicy {
  selectionMode: 'dynamic'
  registrySource: 'local'
  selectionMethod: 'llm_choose'
  missingPolicy: 'auto_install_local'
  preferredDomain?: string | undefined
  lineup: DynamicWorkerLineupPolicy
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

  return {
    selectionMode: 'dynamic',
    registrySource: 'local',
    selectionMethod: 'llm_choose',
    missingPolicy: 'auto_install_local',
    ...(normalizePreferredDomain(raw.preferredDomain)
      ? { preferredDomain: normalizePreferredDomain(raw.preferredDomain) }
      : {}),
    lineup: sanitizeLineupPolicy(lineupInput, DEFAULT_POLICY.lineup),
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
