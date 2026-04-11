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
  preferredDomain?: string
  lineup: DynamicWorkerLineupPolicy
}

export interface LoadedWorkerPolicy {
  path: string | null
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
    return { path: null, policy: DEFAULT_POLICY }
  }

  const raw = JSON.parse(readFileSync(policyPath, 'utf-8')) as Partial<DynamicWorkerPolicy>

  return {
    path: policyPath,
    policy: {
      selectionMode: 'dynamic',
      registrySource: 'local',
      selectionMethod: 'llm_choose',
      missingPolicy: 'auto_install_local',
      preferredDomain: typeof raw.preferredDomain === 'string' && raw.preferredDomain.trim().length > 0
        ? raw.preferredDomain
        : DEFAULT_POLICY.preferredDomain,
      lineup: sanitizeLineupPolicy(raw.lineup, DEFAULT_POLICY.lineup),
    },
  }
}
