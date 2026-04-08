import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SubagentManifest } from '@spwnr/core-types';

export interface LayoutError {
  code: string;
  message: string;
  path?: string;
}

export function validatePackageLayout(
  packageDir: string,
  manifest: SubagentManifest,
  options: { strict?: boolean } = {},
): LayoutError[] {
  const errors: LayoutError[] = [];

  const agentPath = join(packageDir, manifest.spec.agent.path);
  if (!existsSync(agentPath)) {
    errors.push({
      code: 'MANIFEST_INVALID',
      message: `spec.agent.path file not found: ${manifest.spec.agent.path}`,
      path: agentPath,
    });
  }

  const declaredSchemaPaths = Object.entries(manifest.spec.schemas ?? {}).reduce<Array<{
    schemaKind: string;
    relativePath: string;
    absolutePath: string;
  }>>((paths, [schemaKind, schemaPath]) => {
    if (!schemaPath) {
      return paths;
    }

    paths.push({
      schemaKind,
      relativePath: schemaPath,
      absolutePath: join(packageDir, schemaPath),
    });
    return paths;
  }, []);

  for (const schema of declaredSchemaPaths) {
    if (!existsSync(schema.absolutePath)) {
      errors.push({
        code: 'MANIFEST_INVALID',
        message: `spec.schemas.${schema.schemaKind} file not found: ${schema.relativePath}`,
        path: schema.absolutePath,
      });
    }
  }

  // Check 2: skill paths exist (if skills are declared with a path)
  if (manifest.spec.skills?.refs) {
    for (const skill of manifest.spec.skills.refs) {
      if (skill.path) {
        const skillDir = join(packageDir, skill.path);
        if (!existsSync(skillDir)) {
          errors.push({
            code: 'MANIFEST_INVALID',
            message: `Skill path not found: ${skill.path} (skill: ${skill.name})`,
            path: skillDir,
          });
        }
      }
    }
  }

  // Check 3: strict mode — validate declared JSON schema files are valid JSON
  if (options.strict) {
    for (const schema of declaredSchemaPaths) {
      if (existsSync(schema.absolutePath)) {
        try {
          JSON.parse(readFileSync(schema.absolutePath, 'utf-8'));
        } catch {
          errors.push({
            code: 'MANIFEST_INVALID',
            message: `Schema file contains invalid JSON: ${schema.absolutePath}`,
            path: schema.absolutePath,
          });
        }
      }
    }
  }

  return errors;
}
