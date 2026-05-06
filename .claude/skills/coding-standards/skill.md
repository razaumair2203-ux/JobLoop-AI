# /coding-standards

Enforce JobLoop AI coding standards on changed or new files. Run this BEFORE committing code.

## Standards Checklist

### TypeScript
- [ ] Strict mode: no `any` types (use proper types or `unknown` with narrowing)
- [ ] No non-null assertions (`!`) without a preceding guard check
- [ ] Discriminated unions for variant types (not string enums)
- [ ] `as const` for literal types in mock/fixture data
- [ ] Generic functions have type constraints where applicable

### Naming
- [ ] Files: kebab-case (`cloud-matcher.ts`, not `cloudMatcher.ts`)
- [ ] Types/Interfaces: PascalCase (`CloudNode`, `ScorecardResult`)
- [ ] Functions/variables: camelCase (`analyzeWithCloud`, `getDevResponse`)
- [ ] Constants: UPPER_SNAKE for true constants (`MUTATION_DIRECTIVES`, `SENIORITY_KEYWORDS`)
- [ ] Boolean variables: prefix with `is`, `has`, `should`, `can`

### Architecture
- [ ] Shared types go in `packages/shared/src/types.ts`
- [ ] Shared constants go in `packages/shared/src/constants.ts`
- [ ] AI logic stays in `packages/ai/src/` (never in apps/web)
- [ ] API routes must have auth guard (supabase.auth.getUser + !user check)
- [ ] No business logic in API routes — delegate to packages/ai functions
- [ ] Dev mode uses provider.ts abstraction, not inline conditionals

### Error Handling
- [ ] API routes: try/catch with meaningful error messages and correct HTTP status
- [ ] AI parsing: use `safeParseJSON()` from utils.ts, never raw `JSON.parse` on AI output
- [ ] File operations: wrap in try/catch with context in error message
- [ ] Never silently swallow errors (empty catch blocks)

### Product Philosophy (CRITICAL)
- [ ] No opaque scores — use evidence strength labels ("strong", "related", "gap")
- [ ] No "rejected" language — use "closed" for applications
- [ ] Advocate framing — bridge strategies, not discouragement
- [ ] No fabrication — if Cloud lacks evidence, acknowledge the gap
- [ ] Evidence source descriptions in plain language, no icons or numerical scores

### Comments
- [ ] Public APIs: JSDoc with @param and @returns
- [ ] Complex logic: brief comment explaining WHY, not WHAT
- [ ] No TODO without a tracking reference (Phase 2, ticket number, etc.)
- [ ] Remove stale comments that describe code that changed

### Imports
- [ ] Group: node builtins > external packages > internal (@jobloop/) > relative
- [ ] Use `import type` for type-only imports
- [ ] No circular imports between packages

## How to Run
1. Read the changed files (git diff or specific file list)
2. Check each file against the standards above
3. Report violations with file:line references
4. Fix violations automatically where safe to do so
5. Report what was fixed vs what needs human decision
