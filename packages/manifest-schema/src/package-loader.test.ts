import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadPackage } from './package-loader.js';

describe('PackageLoader', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'orchex-loader-test-'));
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
  input:
    schema: ./schemas/input.schema.json
  output:
    schema: ./schemas/output.schema.json
  workflow:
    entry: main
`;

  const minimalValidManifestJson = JSON.stringify({
    apiVersion: 'subagent.io/v0.1',
    kind: 'Subagent',
    metadata: {
      name: 'test-agent',
      version: '0.1.0',
    },
    spec: {
      input: {
        schema: './schemas/input.schema.json',
      },
      output: {
        schema: './schemas/output.schema.json',
      },
      workflow: {
        entry: 'main',
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
      expect(result.result.manifest.metadata.version).toBe('0.1.0');
      expect(result.result.manifest.spec.workflow.entry).toBe('main');
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
      expect(result.result.manifest.metadata.name).toBe('test-agent');
      expect(result.result.packageDir).toBe(pkgDir);
    }
  });

  it('returns error when manifest file missing', () => {
    const pkgDir = join(tempDir, 'pkg-missing');
    mkdirSync(pkgDir, { recursive: true });

    const result = loadPackage(pkgDir);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MANIFEST_INVALID');
      expect(result.error.message).toContain('not found');
    }
  });

  it('returns error for invalid YAML', () => {
    const pkgDir = join(tempDir, 'pkg-invalid-yaml');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'subagent.yaml'), 'invalid: yaml: content: [[[');

    const result = loadPackage(pkgDir);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MANIFEST_INVALID');
    }
  });

  it('returns error for invalid JSON', () => {
    const pkgDir = join(tempDir, 'pkg-invalid-json');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'subagent.json'), '{ invalid json }');

    const result = loadPackage(pkgDir);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MANIFEST_INVALID');
    }
  });

  it('returns error when manifest fails validation', () => {
    const pkgDir = join(tempDir, 'pkg-invalid-manifest');
    mkdirSync(pkgDir, { recursive: true });
    const invalidManifest = `apiVersion: subagent.io/v0.1
kind: Subagent
metadata:
  name: test-agent
spec:
  input:
    schema: ./schemas/input.schema.json
`;
    writeFileSync(join(pkgDir, 'subagent.yaml'), invalidManifest);

    const result = loadPackage(pkgDir);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MANIFEST_INVALID');
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it('resolves relative path correctly', () => {
    const pkgDir = join(tempDir, 'pkg-relative');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'subagent.yaml'), minimalValidManifestYaml);

    const relativePath = './pkg-relative';
    const result = loadPackage(join(tempDir, relativePath));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result.manifest.metadata.name).toBe('test-agent');
    }
  });

  it('returns absolute path in packageDir', () => {
    const pkgDir = join(tempDir, 'pkg-absolute');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'subagent.yaml'), minimalValidManifestYaml);

    const result = loadPackage(pkgDir);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result.packageDir).toBe(pkgDir);
      expect(result.result.packageDir.startsWith('/')).toBe(true);
    }
  });
});
