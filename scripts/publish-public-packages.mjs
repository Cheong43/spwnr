import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const manifestPaths = [
  'packages/core-types/package.json',
  'packages/adapters/package.json',
  'packages/manifest-schema/package.json',
  'packages/registry/package.json',
  'packages/injector/package.json',
  'apps/spwnr-cli/package.json',
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function npmVersionExists(name, version) {
  try {
    execFileSync('npm', ['view', `${name}@${version}`, 'version', '--json'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch (error) {
    const stderr = error.stderr?.toString() ?? '';
    if (stderr.includes('E404') || stderr.includes('404 Not Found')) {
      return false;
    }
    throw error;
  }
}

function getWorkspaceDeps(manifest, workspaceNames) {
  const dependencySections = [
    manifest.dependencies ?? {},
    manifest.optionalDependencies ?? {},
    manifest.peerDependencies ?? {},
  ];

  return dependencySections.flatMap((section) =>
    Object.entries(section)
      .filter(([name, version]) => workspaceNames.has(name) && typeof version === 'string' && version.startsWith('workspace:'))
      .map(([name]) => name)
  );
}

function topoSort(packages) {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const visited = new Set();
  const visiting = new Set();
  const sorted = [];

  function visit(name) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`Circular workspace publish dependency detected at ${name}`);
    }

    visiting.add(name);
    const pkg = byName.get(name);
    for (const dep of pkg.workspaceDeps) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    sorted.push(pkg);
  }

  for (const pkg of packages) {
    visit(pkg.name);
  }

  return sorted;
}

const packages = manifestPaths
  .map((relativePath) => {
    const manifestPath = join(repoRoot, relativePath);
    const manifest = readJson(manifestPath);
    return {
      name: manifest.name,
      version: manifest.version,
      access: manifest.publishConfig?.access ?? 'public',
      manifest,
    };
  })
  .filter((pkg) => !pkg.manifest.private && pkg.manifest.publishConfig?.access === 'public');

const workspaceNames = new Set(packages.map((pkg) => pkg.name));
for (const pkg of packages) {
  pkg.workspaceDeps = getWorkspaceDeps(pkg.manifest, workspaceNames);
}

const publishOrder = topoSort(packages);

console.log(`Resolved ${publishOrder.length} publishable workspace packages.`);
for (const pkg of publishOrder) {
  const published = npmVersionExists(pkg.name, pkg.version);
  if (published) {
    console.log(`- ${pkg.name}@${pkg.version}: already published`);
    continue;
  }

  if (dryRun) {
    console.log(`- ${pkg.name}@${pkg.version}: would publish`);
    continue;
  }

  console.log(`- ${pkg.name}@${pkg.version}: publishing`);
  execFileSync(
    'pnpm',
    ['--filter', pkg.name, 'publish', '--access', pkg.access, '--no-git-checks', '--provenance'],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    }
  );
}
