# /pre-commit-check

Quick pre-commit validation. Run this before any git commit to catch issues early.

## Checks (run in order, stop on first CRITICAL failure)

### 1. TypeScript Compilation (CRITICAL)
```bash
npx tsc --noEmit -p packages/shared/tsconfig.json && \
npx tsc --noEmit -p packages/ai/tsconfig.json && \
npx tsc --noEmit -p apps/web/tsconfig.json
```
If any fails: STOP. Fix errors before committing.

### 2. Staged File Standards
For each staged file (`git diff --cached --name-only`):
- No `as any` added (diff check)
- No `console.log` added in production code (API routes, packages/)
- No hardcoded API keys or secrets (grep for `sk-`, `key=`, passwords)
- No `// @ts-ignore` added

### 3. Import Integrity
- Verify no circular imports between packages/shared and packages/ai
- Verify apps/web doesn't import from packages/ai internals (only from index.ts exports)

### 4. Product Philosophy Check
For any file touching UI text or analysis output:
- No "score" or "rating" language (use evidence strength)
- No "rejected" (use "closed")
- No fake confidence numbers

## Output
```
Pre-commit check: PASS / FAIL
- TS compilation: OK
- Standards: OK / N violations found
- Imports: OK
- Philosophy: OK
```
