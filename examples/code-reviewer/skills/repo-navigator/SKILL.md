# repo-navigator

Navigates repository structure and reads relevant source files.

## Capabilities

- List files matching glob patterns
- Read file contents
- Resolve import/dependency relationships
- Find related test files

## Usage

```yaml
skill: repo-navigator
input:
  patterns: [glob patterns]
  rootDir: <repo root>
output:
  files: [{ path, content }]
```
