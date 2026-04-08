import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const sourceDir = join(repoRoot, 'site', 'registry-portal');
const outputDir = join(repoRoot, 'site-dist', 'registry-portal');
const registryIndexPath = join(repoRoot, 'vendor', 'spwnr-registry', 'registry-index.json');
const fallbackIndex = {
  generatedAt: new Date().toISOString(),
  totalTemplates: 0,
  templates: [],
};

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(sourceDir, outputDir, { recursive: true });

const indexPayload = existsSync(registryIndexPath)
  ? JSON.parse(readFileSync(registryIndexPath, 'utf-8'))
  : fallbackIndex;

const registrySiteUrl = process.env.SPWNR_REGISTRY_SITE_URL ?? 'https://cheong43.github.io/spwnr-registry/';

writeFileSync(
  join(outputDir, 'registry-index.json'),
  `${JSON.stringify(indexPayload, null, 2)}\n`,
  'utf-8',
);

writeFileSync(
  join(outputDir, 'portal-config.js'),
  `window.__SPWNR_PORTAL_CONFIG__ = ${JSON.stringify({ registrySiteUrl }, null, 2)};\n`,
  'utf-8',
);

console.log(`Built Spwnr registry portal at ${outputDir}`);
