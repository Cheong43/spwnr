---
description: Audit dynamic worker readiness and recovery steps by using the worker-audit skill.
---

# Spwnr Workflow Workers Command

Use the `worker-audit` skill for the full worker inspection behavior.

This command is only a thin entrypoint. Keep worker-audit logic out of this file.

Guardrails:

- audit `.claude-plugin/workers.json` when present, otherwise treat the built-in default dynamic worker policy as active; then audit the local registry and injected Claude agents
- treat this command as a registry health and readiness audit plus install or inject recovery surface
- use it when `/spwnr:task` cannot resolve a suitable lineup and needs the user to install or inject missing agents before retrying
- prefer `sync-registry`, `resolve-workers`, and `inject` guidance only when the audit exposes gaps
