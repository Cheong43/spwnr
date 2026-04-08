import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  AdapterRegistry,
  createDefaultAdapterRegistry,
  type SessionComposition,
  type StaticMaterialization,
} from '@spwnr/adapters';
import type { HostScope, HostType, SubagentManifest } from '@spwnr/core-types';
import { RegistryService } from '@spwnr/registry';

export interface InjectStaticOptions {
  packageName: string;
  version?: string;
  host: HostType;
  scope?: HostScope;
  targetDir?: string;
  registry?: RegistryService;
  adapterRegistry?: AdapterRegistry;
}

export interface InjectStaticResult extends StaticMaterialization {
  packageName: string;
  version: string;
  installedDir: string;
}

export interface ComposeSessionOptions {
  packageName: string;
  version?: string;
  host: HostType;
  scope?: HostScope;
  format?: 'json' | 'shell';
  registry?: RegistryService;
  adapterRegistry?: AdapterRegistry;
}

export interface ComposeSessionResult {
  packageName: string;
  version: string;
  installedDir: string;
  host: HostType;
  format: 'json' | 'shell';
  content: string;
  descriptor: SessionComposition['descriptor'];
  previewOnly: boolean;
  warnings: string[];
}

interface PreparedInjection {
  installedDir: string;
  version: string;
  manifest: SubagentManifest;
  registry: RegistryService;
  closeRegistry: boolean;
  adapterRegistry: AdapterRegistry;
}

export async function injectStatic(options: InjectStaticOptions): Promise<InjectStaticResult> {
  const prepared = await prepareInjection(options);
  try {
    const adapter = prepared.adapterRegistry.require(options.host);
    const compiled = adapter.compile({
      manifest: prepared.manifest,
      packageDir: prepared.installedDir,
    });

    const scope = options.scope ?? 'project';
    const targetDir = options.targetDir ?? resolveDefaultStaticTarget(options.host, scope);
    const result = adapter.materializeStatic(compiled, {
      directory: targetDir,
      scope,
    });

    return {
      ...result,
      packageName: options.packageName,
      version: prepared.version,
      installedDir: prepared.installedDir,
    };
  } finally {
    if (prepared.closeRegistry) {
      prepared.registry.close();
    }
  }
}

export async function composeSession(options: ComposeSessionOptions): Promise<ComposeSessionResult> {
  const prepared = await prepareInjection(options);
  try {
    const adapter = prepared.adapterRegistry.require(options.host);
    const compiled = adapter.compile({
      manifest: prepared.manifest,
      packageDir: prepared.installedDir,
    });

    const composition = adapter.composeSession(compiled, {
      scope: options.scope ?? 'project',
    });

    return {
      packageName: options.packageName,
      version: prepared.version,
      installedDir: prepared.installedDir,
      host: options.host,
      format: options.format ?? 'json',
      content:
        options.format === 'shell'
          ? composition.shellCommand
          : `${JSON.stringify(composition.descriptor, null, 2)}\n`,
      descriptor: composition.descriptor,
      previewOnly: composition.previewOnly ?? false,
      warnings: composition.warnings ?? [],
    };
  } finally {
    if (prepared.closeRegistry) {
      prepared.registry.close();
    }
  }
}

export function resolveDefaultStaticTarget(host: HostType, scope: HostScope): string {
  if (scope === 'user') {
    const home = homedir();
    switch (host) {
      case 'claude_code':
        return join(home, '.claude', 'agents');
      case 'copilot':
        return join(home, '.copilot', 'agents');
      case 'opencode':
        return join(home, '.config', 'opencode', 'agents');
      case 'codex':
        return join(home, '.codex', 'agents');
    }
  }

  switch (host) {
    case 'claude_code':
      return join(process.cwd(), '.claude', 'agents');
    case 'copilot':
      return join(process.cwd(), '.github', 'agents');
    case 'opencode':
      return join(process.cwd(), '.opencode', 'agents');
    case 'codex':
      return join(process.cwd(), '.codex', 'agents');
  }
}

async function prepareInjection(
  options: Pick<InjectStaticOptions, 'packageName' | 'version' | 'host' | 'registry' | 'adapterRegistry'>,
): Promise<PreparedInjection> {
  const registry = options.registry ?? new RegistryService();
  const closeRegistry = !options.registry;
  const installResult = await registry.install(options.packageName, options.version ?? 'latest');
  const info = registry.info(options.packageName, installResult.version);

  return {
    registry,
    closeRegistry,
    installedDir: installResult.installedDir,
    version: installResult.version,
    manifest: info.manifest,
    adapterRegistry: options.adapterRegistry ?? createDefaultAdapterRegistry(),
  };
}
