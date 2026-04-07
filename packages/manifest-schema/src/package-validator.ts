import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SubagentManifest } from '@orchex/core-types';

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

  // Check 1: spec.input.schema file exists
  const inputSchemaPath = join(packageDir, manifest.spec.input.schema);
  if (!existsSync(inputSchemaPath)) {
    errors.push({
      code: 'MANIFEST_INVALID',
      message: `spec.input.schema file not found: ${manifest.spec.input.schema}`,
      path: inputSchemaPath,
    });
  }

  // Check 2: spec.output.schema file exists
  const outputSchemaPath = join(packageDir, manifest.spec.output.schema);
  if (!existsSync(outputSchemaPath)) {
    errors.push({
      code: 'MANIFEST_INVALID',
      message: `spec.output.schema file not found: ${manifest.spec.output.schema}`,
      path: outputSchemaPath,
    });
  }

  // Check 3: workflow entry file exists
  // Look for workflow/{entry}.yaml or workflow/{entry}.yml
  const entry = manifest.spec.workflow.entry;
  const workflowYaml = join(packageDir, 'workflow', `${entry}.yaml`);
  const workflowYml = join(packageDir, 'workflow', `${entry}.yml`);
  if (!existsSync(workflowYaml) && !existsSync(workflowYml)) {
    errors.push({
      code: 'WORKFLOW_INVALID',
      message: `Workflow entry file not found: workflow/${entry}.yaml`,
      path: workflowYaml,
    });
  }

  // Check 4: skill paths exist (if skills are declared with a path)
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

  // Check 5: strict mode — validate JSON schema files are valid JSON
  if (options.strict) {
    for (const schemaPath of [inputSchemaPath, outputSchemaPath]) {
      if (existsSync(schemaPath)) {
        try {
          JSON.parse(readFileSync(schemaPath, 'utf-8'));
        } catch {
          errors.push({
            code: 'MANIFEST_INVALID',
            message: `Schema file contains invalid JSON: ${schemaPath}`,
            path: schemaPath,
          });
        }
      }
    }
  }

  return errors;
}
