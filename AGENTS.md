# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- Settings View Pattern: When working on `SettingsView`, inputs must bind to the local `cachedState`, NOT the live `useExtensionState()`. The `cachedState` acts as a buffer for user edits, isolating them from the `ContextProxy` source-of-truth until the user explicitly clicks "Save". Wiring inputs directly to the live state causes race conditions.

- Running Tests: Vitest is available inside the `src/` directory. Always run tests from `src/` using `npx vitest run <path>` where `<path>` is relative to `src/`. Do NOT run `vitest` from the repository root — it will not be found. Examples:
    - `cd src && npx vitest run core/environment/__tests__/getEnvironmentDetails.spec.ts`
    - `cd src && npx vitest run services/glob/__tests__/list-files.spec.ts`
    - `cd src && npx vitest run` (runs all tests in src/)
