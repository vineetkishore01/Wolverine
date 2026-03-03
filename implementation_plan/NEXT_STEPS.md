# SmallClaw AI Handoff Plan
**Target**: Native "Option 2" deployment of SmallClaw on macOS.

## Context
This project was previously located within iCloud Drive on this machine, which caused macOS `EPERM` system permission blocks when trying to run `npm install`. 
The user has now physically moved this folder out of iCloud Drive into a non-syncing local directory so that the AI can install dependencies freely.

## Immediate Action Items for the AI Agent
When the user says "ready" or initializes this new workspace, please execute the following steps natively in this repository:

### 1. Verification
- Verify the current working directory is no longer inside the `iCloud Drive` path (using `pwd`).
- Make sure you are in the project root containing `package.json`.

### 2. Dependency Installation
- Run `rm -rf node_modules package-lock.json` to clear any potentially corrupted artifacts from the user's previous iCloud sync attempts.
- Run `npm install` cleanly in this new location. It should succeed without the iCloud sync hooks blocking nested folder creation.

### 3. Build & Initialize
- Execute `npm run build` to compile the TypeScript files in `src/` into the `dist/` folder.
- Execute `npx tsx src/cli/index.ts onboard` to trigger the application's native setup wizard.

### 4. Verification
- Check if Playwright correctly cached its headless browsers.
- Make sure that when the application logic runs, the agent's actions are correctly restricted to the `~/localclaw/workspace/` sandbox directory.

## Constraints
* Do not attempt to use `sudo` or Homebrew to install Docker Desktop on this machine, as the user lacks the permission hierarchy to fix Homebrew cache permissions. 
* Do not use `npm link` right away to keep the initial footprint clean; rely on `npx tsx` instead, as specified in Option 2.
