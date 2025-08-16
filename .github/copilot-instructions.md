# AI Assistant Project Instructions

These instructions orient AI coding agents for this Expo + React Native + TypeScript project.

## Current State (Do NOT assume future features exist)
The live app code is minimal: [app/_layout.tsx](../app/_layout.tsx) defines a bare [`Stack`](../app/_layout.tsx) and [app/index.tsx](../app/index.tsx) renders placeholder text. The feature ideas in [README.md](../README.md) are NOT implemented yet—treat them as background only unless the user explicitly requests work on a specific item (e.g. menstruation tracker, pill reminder, encryption).

## Navigation & Routing
- Uses `expo-router` with typed routes (see [.expo/types/router.d.ts](../.expo/types/router.d.ts)).
- File-based routing: each file under `app/` becomes a route. Current active structure is flat (only index).
- Reference implementation for a tabbed layout exists in the template folder: [app-example/app/(tabs)/_layout.tsx](../app-example/app/(tabs)/_layout.tsx), plus example routes: [app-example/app/(tabs)/index.tsx](../app-example/app/(tabs)/index.tsx), [app-example/app/(tabs)/explore.tsx](../app-example/app/(tabs)/explore.tsx).
- To introduce tabs in the real app: create `app/(tabs)/_layout.tsx` (copy & adapt the example), then move `index.tsx` inside `(tabs)` or create new screens; keep grouping folder names in parentheses (expo-router "group") so they don't affect URL segments.

## Theming & UI Example Patterns (from template)
- Color + theme abstraction lives in [app-example/constants/Colors.ts](../app-example/constants/Colors.ts) and hooks: [app-example/hooks/useThemeColor.ts](../app-example/hooks/useThemeColor.ts), [app-example/hooks/useColorScheme.ts](../app-example/hooks/useColorScheme.ts).
- Reusable themed primitives: [app-example/components/ThemedText.tsx](../app-example/components/ThemedText.tsx), [app-example/components/ThemedView.tsx](../app-example/components/ThemedView.tsx).
- Motion/Haptics examples: [app-example/components/HapticTab.tsx](../app-example/components/HapticTab.tsx).
- Parallax & layout example: [app-example/components/ParallaxScrollView.tsx](../app-example/components/ParallaxScrollView.tsx).
When porting patterns, keep the abstraction boundary: base color map → hook layer → themed components → feature screens.

## TypeScript & Paths
- Strict mode enabled in [tsconfig.json](../tsconfig.json); avoid using `any`.
- Path alias `@/*` maps to project root (see `"paths"` in [tsconfig.json](../tsconfig.json)). Prefer `import X from "@/app/...";` only when it improves clarity; relative imports are fine for short paths.

## Linting & Style
- ESLint config: [eslint.config.js](../eslint.config.js) (Expo flat config). Run with `npm run lint`.
- VS Code organizes imports & member sorting on save via [.vscode/settings.json](../.vscode/settings.json); avoid manual large-scale reordering that fights tooling.

## Scripts & Tooling
- Primary workflow:
  - Start dev: `npx expo start` (preferred). Test in browser and Expo Go on iPhone.
  - There is a declared script `"reset-project"` calling `./scripts/reset-project.js`, but the template script currently resides at [app-example/scripts/reset-project.js](../app-example/scripts/reset-project.js). Do NOT invoke or "fix" it unless the user asks—flag the mismatch if relevant.
- No test framework configured yet—do not invent test directories.

## Assets & Config
- App config: [app.json](../app.json) (icons, splash, typedRoutes experiment).
- Icons & splash paths referenced there must remain valid when moving files; keep relative path correctness.

## Privacy & Data Handling
- README stresses local encrypted storage, but no storage/encryption layer exists yet. Before adding persistence:
  - Ask for the chosen library (e.g. Expo SecureStore vs. custom).
  - Clarify data schema for cycle entries / reminders.
Do not scaffold speculative storage code without an explicit request.

## Adding New Features
When implementing a requested feature:
1. Confirm navigation impact (new group? new tab?).
2. Reuse or port themed primitives from `app-example` instead of duplicating style logic.
3. Maintain typed routes; add new file so `.expo/types/router.d.ts` regenerates (handled by Expo tooling).

## Safe Defaults
- Keep components small; colocate feature-specific helpers within feature folder instead of polluting root.
- Prefer functional, stateless components first; introduce state management only upon explicit need.

## When Unsure
Ask the user to clarify BEFORE:
- Introducing a state management library.
- Selecting a storage/encryption approach.
- Refactoring folder structure.

Respond concisely; reference concrete files (link them) when proposing changes.