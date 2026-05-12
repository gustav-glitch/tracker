# Task: GitHub Actions workflow

## Status: done

## Goal
Schedule the tracker on GitHub Actions every ~10 minutes, allow manual runs, and commit the updated `state.json` back to the repo so state persists between runs. Provide a clean off-switch (disable workflow in GH UI).

## Done When
- [ ] `.github/workflows/check.yml` exists with `on: schedule (cron: '*/10 * * * *')` and `workflow_dispatch`
- [ ] Job uses Node 20, runs `npm ci` then `npm run check`
- [ ] After the run, the workflow commits `state.json` only if it changed, with message `chore(state): update [skip ci]`
- [ ] `permissions: contents: write` is set so the default `GITHUB_TOKEN` can push
- [ ] A `concurrency:` group prevents overlapping runs from racing on `state.json`
- [ ] If `npm run check` exits non-zero, the workflow fails (so failures are visible in the Actions UI)
- [ ] README (task 08) documents how to enable, disable, and monitor the workflow

## Context
Task 7 of 8. Depends on all earlier tasks producing a working CLI. This is what makes the tool actually run unattended.

The workflow trusts `npm run check` to do everything: load config, fetch, detect, save state, send notifications. The workflow's only added responsibility is scheduling and committing state back.

## Files
- Create: `.github/workflows/check.yml`

## Approach

### `.github/workflows/check.yml`
```yaml
name: tracker

on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: tracker-state
  cancel-in-progress: false

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Run trackers
        run: npm run check

      - name: Commit state if changed
        run: |
          if [ -n "$(git status --porcelain state.json)" ]; then
            git config user.name  "tracker-bot"
            git config user.email "tracker-bot@users.noreply.github.com"
            git add state.json
            git commit -m "chore(state): update [skip ci]"
            git push
          else
            echo "state.json unchanged"
          fi
```

### Notes on each piece
- `concurrency.group: tracker-state` with `cancel-in-progress: false` means a new scheduled run waits for the previous one rather than cancelling it. Important: prevents two jobs racing on `state.json`.
- `timeout-minutes: 10` ensures a hung fetch can't burn an unbounded slot; the script's per-fetch timeout is 15 s but the cap protects against weirdness.
- `permissions: contents: write` is the minimum needed for the default `GITHUB_TOKEN` to push back. Don't request more.
- The commit step is a plain shell block on purpose — no third-party action needed.
- `[skip ci]` in the commit message prevents this push from triggering anything if other workflows are added later.

## Test Expectations
Workflow YAML can't be unit-tested. Acceptance is manual:
1. After pushing the repo to GitHub, go to **Actions** → **tracker** and confirm scheduled runs are listed (first scheduled run typically takes 5–15 min to appear after the workflow lands on default branch).
2. Click **Run workflow** to fire one manually; verify it succeeds.
3. After a tracker has produced a real signal once, confirm a `chore(state): update` commit lands on the default branch.

## Notes
- Schedules only run on the default branch. Push the workflow to `main` (or whatever the default is) for it to ever fire.
- First scheduled run is often delayed; manual `workflow_dispatch` is the fast smoke-test.
- The off-switch: **Actions → tracker → ⋯ → Disable workflow**. README must document this.
- If the user later wants to keep the main branch tidy, we can switch to committing state to a dedicated `state` branch — note this as a follow-up, do not implement now.
