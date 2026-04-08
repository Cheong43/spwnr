# repo-navigator

Navigates repository structure and reads relevant source files.

## Tool Binding Notes

Use the file-reading and search bindings exposed by the current host. Keep this skill host-neutral so it can be reused across Claude Code, Codex, Copilot, and OpenCode.

## Capabilities

- List files matching glob patterns
- Read file contents
- Resolve import and dependency relationships
- Find nearby tests and implementation files
