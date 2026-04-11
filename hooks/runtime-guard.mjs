#!/usr/bin/env node

import process from 'node:process';
import { evaluateRuntimeGuard } from './lib/runtime-guard.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
}

function emitJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function emitStderr(value) {
  process.stderr.write(value.endsWith('\n') ? value : `${value}\n`);
}

async function main() {
  const raw = await readStdin();
  const input = raw.trim() ? JSON.parse(raw) : {};
  const result = evaluateRuntimeGuard(input, process.env);

  if (result.json) {
    emitJson(result.json);
  }

  if (result.stderr) {
    emitStderr(result.stderr);
  }

  process.exit(result.exitCode ?? 0);
}

main().catch((error) => {
  emitStderr(`runtime-guard failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
