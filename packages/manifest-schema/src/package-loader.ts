import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { validateManifest } from './manifest-validator.js';
import type { SubagentManifest } from '@orchex/core-types';

export interface LoadResult {
  manifest: SubagentManifest;
  packageDir: string;
}

export interface LoadError {
  code: string;
  message: string;
}

export type LoadOutcome =
  | { success: true; result: LoadResult }
  | { success: false; error: LoadError };

export function loadPackage(packageDir: string): LoadOutcome {
  // 1. Resolve to absolute path
  const absDir = resolve(packageDir);

  // 2. Look for subagent.yaml first, then subagent.json
  const yamlPath = join(absDir, 'subagent.yaml');
  const jsonPath = join(absDir, 'subagent.json');

  let manifestContent: string;
  let isYaml = false;

  if (existsSync(yamlPath)) {
    manifestContent = readFileSync(yamlPath, 'utf-8');
    isYaml = true;
  } else if (existsSync(jsonPath)) {
    manifestContent = readFileSync(jsonPath, 'utf-8');
    isYaml = false;
  } else {
    // 3. If neither exists: return error
    return {
      success: false,
      error: {
        code: 'MANIFEST_INVALID',
        message: 'Manifest file not found: subagent.yaml or subagent.json',
      },
    };
  }

  // 4. Parse YAML or JSON (catch parse errors)
  let parsed: unknown;
  try {
    if (isYaml) {
      parsed = parseYaml(manifestContent);
    } else {
      parsed = JSON.parse(manifestContent);
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'MANIFEST_INVALID',
        message: `Failed to parse manifest: ${error instanceof Error ? error.message : 'unknown error'}`,
      },
    };
  }

  // 5. Call validateManifest(parsed)
  const validationResult = validateManifest(parsed);

  // 6. If validation fails: return error
  if (!validationResult.success) {
    return {
      success: false,
      error: {
        code: 'MANIFEST_INVALID',
        message: validationResult.errors.map((e) => `${e.path}: ${e.message}`).join('\n'),
      },
    };
  }

  // 7. Return success
  return {
    success: true,
    result: {
      manifest: validationResult.data,
      packageDir: absDir,
    },
  };
}
