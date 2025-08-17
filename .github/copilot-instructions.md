# AI Assistant Working Rules (ClarissaApp)

Purpose: Help incrementally evolve the current Expo + expo-router app into the feature set described in [README.md](../README.md) without prematurely implementing future/aspirational items.

## Current Architecture Snapshot
- Navigation: File‑system routing via expo-router. Root stack: [app/_layout.tsx](../app/_layout.tsx) declares a single stack screen for the tab group `(tabs)`.
- Theming: ThemeContext is provided in [app/_layout.tsx](../app/_layout.tsx), supporting 'light', 'dark', 'red', and 'system' modes. The effective theme is resolved using [hooks/useColorScheme.ts](../hooks/useColorScheme.ts) and propagated via context.
- StatusBar: Status bar style and background color are set dynamically based on the effective theme.
- Tab Navigator: [app/(tabs)/_layout.tsx](../app/(tabs)/_layout.tsx) configures 3 tabs (`today`, `calendar`, `profile`). Tab bar colors and background are themed using color tokens from [constants/Colors.ts](../constants/Colors.ts) and the current theme context. The tab bar background is translucent, implemented via `BlurView` for iOS and a semi-transparent `View` for Android/web. Each tab screen file (e.g. [app/(tabs)/today.tsx](../app/(tabs)/today.tsx)) exports a functional component using themed primitives and local `StyleSheet`.
- Themed Components: Use [components/ThemedText.tsx](../components/ThemedText.tsx) and [components/ThemedView.tsx](../components/ThemedView.tsx) for presentational primitives, with color resolution via theme context.
- Example (reference) architecture lives in the scaffolded template under `app-example/` (ignored by git per [.gitignore](../.gitignore)). Use these as patterns when introducing similar functionality into `components/`, `constants/`, `hooks/` in the main app.

## Tooling & Conventions
- TypeScript strict mode enabled: see [tsconfig.json](../tsconfig.json). Path alias `@/*` maps to repo root; prefer `import { X } from '@/components/X'` once such modules exist.
- ESLint: Flat config via [eslint.config.js](../eslint.config.js) using `eslint-config-expo`. Assume formatting + import/order cleanup handled on save per [.vscode/settings.json](../.vscode/settings.json).
- No test framework configured yet—do not invent one unless explicitly requested.
- Keep new screens colocated under `app/` following expo-router rules; if adding a new tab, add both the file (e.g. `app/(tabs)/pill-reminder.tsx`) and a `<Tabs.Screen name="pill-reminder" />` entry inside [app/(tabs)/_layout.tsx](../app/(tabs)/_layout.tsx).
- Avoid premature abstraction: replicate the simple style pattern (local `StyleSheet.create`) until thematic system is migrated from `app-example`.

## External Dependencies in Use
- Core runtime: Expo SDK 53 ([package.json](../package.json)) with React 19 & React Native 0.79.
- Navigation: `expo-router` (file-based).
- Theming: ThemeContext, useColorScheme, and color tokens from [constants/Colors.ts](../constants/Colors.ts).
- Planned (already installed but not yet integrated in code): `expo-sqlite` (local structured storage), `expo-notifications` (local scheduling).
- UI libs included: `@expo/vector-icons`, `expo-blur`, `expo-image`, `react-native-reanimated` (ensure proper babel/plugin setup if introducing animations—Expo bare setup already handles basic config).

## Incremental Feature Evolution Guidelines (Do NOT implement automatically)
When asked to implement:
1. Menstruation tracking (Calendar tab):
   - Prefer a lightweight custom grid (no heavy calendar lib) inside [app/(tabs)/calendar.tsx](../app/(tabs)/calendar.tsx) or extracted to `components/calendar/`.
   - Plan data schema first for SQLite (table for cycle entries: date (ISO), blood_flow ENUM None|Light|Medium|Heavy, symptoms (bitmask or JSON), notes TEXT, created_at INTEGER).
2. Pill reminder (Profile tab initially for settings; Today tab for quick actions):
   - Model pill cycles (21 active + 7 break) separately from raw intake logs.
   - Use `expo-notifications` with device local timezone; allow per-weekday times (store as HH:MM strings + timezone offset).
3. Today tab aggregation:
   - Derive fertile window using simple 14-day ovulation rule from most recent cycle start; keep logic pure (e.g. future `logic/cycle.ts`).

Only scaffold data access / state modules when expressly requested; do not guess encryption (future feature).

## Pattern References from app-example (When Migrating)
- Themed components pattern: Wrap RN primitives and inject theme colors (see `app-example/components/ThemedText.tsx`).
- Color resolution hook pattern: `useThemeColor` selecting token based on color scheme.
- Haptic tab interaction: `HapticTab.tsx` shows how to wrap tab bar buttons—adapt into `Tab.Screen` `tabBarButton` prop in [app/(tabs)/_layout.tsx](../app/(tabs)/_layout.tsx) if/when needed.
- Background blur / translucency: `components/ui/TabBarBackground.*` pattern for platform‑specific overrides.

## Code Style & Structure Expectations
- Prefer functional components with explicit return types if logic grows.
- Keep screen files lean; extract reusable logic into `hooks/` and pure calculation utilities into `logic/` (directory exists but is empty—populate intentionally).
- Use UTC date serialization (ISO yyyy-mm-dd) for persisted calendar days; convert to local only in UI.

## Common Tasks
- Start dev server: `npx expo start` (see [package.json](../package.json)).
- Platform shortcuts: `npm run android`, `npm run ios`, `npm run web`.
- Lint: `npm run lint`. Fix-on-save already configured. Do not run Lint unless expressly requested.

## What NOT to Do Automatically
- Do not implement encryption or partner sharing (explicitly future scope).

## When Generating Code
- Use existing installed deps only. You may ask the user BEFORE if you think a new dependency is needed.
- Reference files with the `@/` alias when moving toward shared modules.
- Maintain minimal diff: show only inserted/changed regions using the repository’s established comment markers if updating existing files.

Please request clarification if a feature spec conflicts with current scope or if data model decisions are ambiguous.