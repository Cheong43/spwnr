# diff-reader

Reads and parses git diffs into structured representations.

## Capabilities

- Parse unified diff format
- Extract changed files, hunks, and line-level changes
- Identify added/removed/modified lines
- Map line numbers to context

## Usage

```yaml
skill: diff-reader
input:
  diff: <git diff output>
  baseRef: <base ref>
output:
  changedFiles: [list of file paths]
  hunks: [structured diff hunks]
```
