```markdown
# spwnr Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill outlines the core development patterns and workflows for the `spwnr` TypeScript codebase. It covers coding conventions, workflow update procedures, and testing practices to ensure consistent, maintainable, and high-quality contributions.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `myFeature.ts`, `userProfile.test.ts`

### Import Style
- Use **relative imports** for modules within the codebase.
  - Example:
    ```typescript
    import { myFunction } from './utils';
    ```

### Export Style
- Use **named exports** rather than default exports.
  - Example:
    ```typescript
    // Good
    export function doThing() { ... }

    // Avoid
    // export default function doThing() { ... }
    ```

### Commit Message Patterns
- Mixed types, often prefixed with `refactor`.
- Aim for concise, descriptive messages (~57 characters on average).
  - Example: `refactor: simplify workflow step validation logic`

## Workflows

### Update Workflow Skill and Documentation
**Trigger:** When you want to enhance, refactor, or clarify workflow skills, protocols, or execution modes.  
**Command:** `/update-skill`

1. **Edit Skill Files**
   - Update one or more `SKILL.md` files under:
     - `skills/workflow-*`
     - `skills/using-spwnr-workflow/`
2. **Update Documentation**
   - Edit related docs such as:
     - `docs/guide/claude-plugin-workflow.md`
     - `README.md`
     - Any relevant `commands/*.md` files
3. **Modify or Add Tests**
   - Ensure tests reflect the new or updated skill structures.
   - Example test file: `tests/repo-plugin-smoke.test.ts`
4. **Update Metadata**
   - If necessary, update plugin or package metadata to match the changes.

**Example:**
```bash
# Edit the relevant SKILL.md
vim skills/workflow-example/SKILL.md

# Update documentation
vim docs/guide/claude-plugin-workflow.md

# Run or add tests
npm test

# Commit your changes
git add .
git commit -m "refactor: update workflow skill and documentation"
git push
```

## Testing Patterns

- **Framework:** Unknown (not detected), but test files follow the pattern `*.test.*`.
- Place test files alongside or near the code they test, using camelCase naming.
  - Example: `userActions.test.ts`
- Tests should cover new or updated skill structures and workflows.

**Example:**
```typescript
import { someFunction } from './someModule';

test('someFunction returns correct value', () => {
  expect(someFunction()).toBe('expected');
});
```

## Commands

| Command         | Purpose                                                        |
|-----------------|----------------------------------------------------------------|
| /update-skill   | Update or refactor workflow-related skills and documentation   |

```