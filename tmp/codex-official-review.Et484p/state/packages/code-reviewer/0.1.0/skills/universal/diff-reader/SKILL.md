# diff-reader

Reads and parses git diffs into structured representations.

## Tool Binding Notes

Use the diff-reading bindings available in the current host. This universal version should stay host-agnostic and must not name Claude Code, Codex, Copilot, or OpenCode specific tool identifiers.

## Capabilities

- Parse unified diff format
- Extract changed files, hunks, and line-level changes
- Identify added/removed/modified lines
- Map line numbers to surrounding context
