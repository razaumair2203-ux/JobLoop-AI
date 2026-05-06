# /tech-debt-pass

Run a technical debt audit on the codebase. Execute ALL of the following checks and report findings grouped by severity (CRITICAL > WARNING > INFO).

## Steps

### 1. TypeScript Compilation
Run `tsc --noEmit` for each package/app:
```bash
npx tsc --noEmit -p packages/shared/tsconfig.json
npx tsc --noEmit -p packages/ai/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
```
Fix any errors found. Report warnings.

### 2. Dead Code & Unused Exports
- Grep for `export` declarations across packages/ai/src and packages/shared/src
- Cross-reference with imports in apps/web/src and other consumers
- Flag exports with zero consumers

### 3. Type Safety Violations
Search for these patterns and flag each:
- `as any` or `as unknown` (grep pattern: `as any|as unknown`)
- Non-null assertions `!` that aren't preceded by a guard (grep pattern: `\w+!\.` or `\w+!\[`)
- `// @ts-ignore` or `// @ts-expect-error`
- `Record<string, any>` or `Record<string, unknown>` in shared types (should be typed)

### 4. Security Surface
Check API routes (`apps/web/src/app/api/`) for:
- Auth guard present (must call `supabase.auth.getUser()` and check `!user`)
- Input validation (check request body parsing)
- No raw SQL or string interpolation in queries
- File upload size limits enforced

### 5. Error Handling Consistency
Check that all `try/catch` blocks:
- Log errors with context (not just `console.error(err)`)
- Return appropriate HTTP status codes in API routes
- Don't silently swallow errors

### 6. Dependency Health
```bash
npm audit --omit=dev 2>&1 | tail -20
npm outdated 2>&1 | head -20
```

### 7. Missing Infrastructure
Flag if any of these are absent:
- [ ] ESLint config at monorepo root
- [ ] Prettier config
- [ ] Pre-commit hooks (husky/lint-staged)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment variable validation (Zod schema for env)

## Output Format
```
## Tech Debt Report — [date]

### CRITICAL (must fix before next deploy)
- [file:line] description

### WARNING (fix within sprint)
- [file:line] description

### INFO (nice to have)
- [file:line] description

### Infrastructure Missing
- [ ] item

### Summary
- X critical / Y warning / Z info findings
- TS compilation: PASS/FAIL
- Security: X/Y routes have auth guards
```
