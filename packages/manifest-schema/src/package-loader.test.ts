import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadPackage } from './package-loader.js';

describe('PackageLoader', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'spwnr-loader-test-'));
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const minimalValidManifestYaml = `apiVersion: subagent.io/v0.1
kind: Subagent
metadata:
  name: test-agent
  version: 0.1.0
spec:
  instructions:
    system: ./prompts/system.md
  input:
    schema: ./schemas/input.schema.json
  output:
    schema: ./schemas/output.schema.json
`;

  const minimalValidManifestJson = JSON.stringify({
    apiVersion: 'subagent.io/v0.1',
    kind: 'Subagent',
    metadata: {
      name: 'test-agent',
      version: '0.1.0',
    },
    spec: {
      instructions: {
        system: './prompts/system.md',
      },
      input: {
        schema: './schemas/input.schema.json',
      },
      output: {
        schema: './schemas/output.schema.json',
      },
    },
  });

  it('loads valid package with subagent.yaml', () => {
    const pkgDir = join(tempDir, 'pkg-yaml');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'subagent.yaml'), minimalValidManifestYaml);

    const result = loadPackage(pkgDir);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result.manifest.metadata.name).toBe('test-agent');
      expect(result.result.manifest.spec.instructions.system).toBe('./prompts/system.md');
      expect(result.result.packageDir).toBe(pkgDir);
    }
  });

  it('loads subagent.json when yaml not present', () => {
    const pkgDir = join(tempDir, 'pkg-json');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'subagent.json'), minimalValidManifestJson);

    const result = loadPackage(pkgDir);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result.manifest.metadata.version).toBe('0.1.0');
      expect(result.result.packageDir).toBe(pkgDir);
    }
  });

  it('returns error when manifest file is missing', () => {
    const pkgDir = join(tempDir, 'pkg-missing');
    mkdirSync(pkgDir, { recursive: true });

    const result = loadPackage(pkgDir);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MANIFEST_INVALID');
    }
  });

  it('returns error when manifest validation fails', () => {
    const pkgDir = join(tempDir, 'pkg-invalid');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, 'subagent.yaml'),
      `apiVersion: subagent.io/v0.1
kind: Subagent
metadata:
  name: test-agent
  version: 0.1.0
spec:
  input:
    schema: ./schemas/input.schema.json
`,
    );

    const result = loadPackage(pkgDir);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('instructions');
    }
  });
});
