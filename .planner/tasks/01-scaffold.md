# Task: Scaffold the project

## Status: done

## Goal
Initialize the empty `tracker/` directory as a Node + TypeScript project with vitest, ready for source files in subsequent tasks.

## Done When
- [ ] `git init` has been run; `.gitignore` ignores `node_modules/`, `dist/`, `.env`, `.DS_Store`
- [ ] `package.json` declares Node 20+, `"type": "module"`, scripts: `check`, `test`, `typecheck`, `dev`
- [ ] `tsconfig.json` is strict, ESM, NodeNext module resolution, target ES2022
- [ ] `vitest.config.ts` exists (default config is fine)
- [ ] `npm install` succeeds
- [ ] `npm run typecheck` succeeds (with an empty `src/index.ts` placeholder if needed)
- [ ] `npm test` runs (zero tests pass is fine)

## Context
This is task 1 of 8. Greenfield directory. All later tasks assume this scaffold exists. Keep it minimal — no linter, no prettier, no husky. We can add later.

## Files
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts` (placeholder export so typecheck passes)
- Create: `README.md` (one-line stub; full README comes in task 08)
- Run: `git init`, `npm install`

## Approach

### `package.json`
```json
{
  "name": "tracker",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "check": "tsx src/cli.ts",
    "dev": "tsx watch src/cli.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "cheerio": "^1.0.0",
    "js-yaml": "^4.1.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.12.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```
Verify these versions resolve at install time; bump to latest stable if any are stale.

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

### `vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: false } });
```

### `.gitignore`
```
node_modules/
dist/
.env
.DS_Store
*.log
```

### `src/index.ts`
```ts
export {};
```
(Replaced in task 04 by real entrypoint — exists now only so `tsc --noEmit` has something to read.)

### `README.md`
Single line: `# tracker — work in progress (see .planner/plan.md)`. Real README comes in task 08.

## Test Expectations
No source tests yet. Acceptance is purely that the toolchain works: `npm install`, `npm test`, `npm run typecheck` all exit 0.

## Notes
- Do NOT add ESLint, Prettier, Husky, or a CI lint workflow. Keep the surface area small.
- Do NOT create a remote repo or push. Local `git init` only.
