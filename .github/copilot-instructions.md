# AI Assistant Rules (ClarissaApp)

Goal: Incrementally evolve the Expo + expo-router app toward the MVP in README.md. Prefer minimal diffs and existing patterns/deps.

## Architecture
- Router: file-based (expo-router). Root stack in `app/_layout.tsx` wraps tab group `(tabs)`.
- Theme: ThemeContext (light/dark/red/system) + `constants/Colors.ts`.
- Tabs: `today`, `calendar`, `profile`; translucent tab bar.
- Themed UI: `components/ThemedText.tsx`, `components/ThemedView.tsx`.

## Conventions
- TS strict, `@/*` alias. ESLint via `eslint-config-expo`.
- Keep screens lean; share logic via `hooks/`, pure utils in `logic/`.
- Persist days as ISO `YYYY-MM-DD` keys; convert to local in UI.
- Use installed dependencies. You may ask BEFORE trying to add new ones. Please don't be afraid to ask for help or clarification.

## Menstruation tracking (Calendar)
- SQLite schema (5 cols exact): `date TEXT UNIQUE`, `pill_taken INTEGER`, `blood_flow INTEGER`, `symptoms INTEGER`, `notes TEXT`.
- Storage service (async, no global state):
   - `loadAllEntries()`, `getEntryByData(date)`, `listEntriesInRange(start,end)`,
      `recordPillIntake(date)`, `recordBloodFlow(date, blood_flow)`,
      `recordSymptom(date, symptoms[])`, `recordNote(date, note)`,
   `addOrUpdateEntry(entry)`.
   - Pill cycle config (single-row table `pill_config`):
   - Table columns: `id INTEGER PRIMARY KEY CHECK (id = 1)`, `cycle_length INTEGER NOT NULL DEFAULT 21`, `break_length INTEGER NOT NULL DEFAULT 7`, `first_pill_date TEXT`.
   - Type `PillConfig`: `{ cycleLength: number; breakLength: number; firstPillDate: string | null }` (dates as ISO `YYYY-MM-DD`).
   - API: `getPillConfig()` and `savePillConfig(cfg)`; values sanitized (cycleLength ≥ 1, breakLength ≥ 0) and normalized to local ISO keys.
- Domain `Entry`: `{ date: string, pillTaken: boolean, bloodFlow: BloodFlow, symptoms?: SymptomKey[], notes?: string }`.
- Symptoms fixed set: `cramps`, `vomiting`, `headache`, `moodChanges`.
- Events: emit `AppEvents.PillConfigChanged` after saving the pill config; listeners (e.g., Calendar) refresh expected pill/break markers accordingly.

## Pill reminder
- Configure in Profile; quick actions in Today.
- Pill cycle config stored in SQLite (`pill_config`) via `getPillConfig`/`savePillConfig`. Fields: cycleLength (active days), breakLength (break days), firstPillDate (start of model).
- Calendar uses the config to compute expected pill vs break days from `firstPillDate` with cycleLength + breakLength, showing non-invasive markers for today/future when no entry exists.
- `expo-notifications`, device timezone, per-weekday HH:MM (scheduling not wired yet; will use the stored config once implemented).

## Today tab
- Show date, pill reminders, quick intake, cycle status, next bleeding.
- Fertile window: 14-day ovulation rule from latest cycle start (pure utils, e.g. `logic/cycle.ts`).

## Patterns from `app-example/`
- Themed components, `useThemeColor`, haptic tabs, translucent background.
- 'app-example' implements best practices for various aspects of the app, including navigation, state management, and performance optimization. Look here for guidance on implementing these patterns in your own app.

## Don’t implement yet
- Encryption, partner sharing, other future items.

## Working style
- Minimal diffs; colocate new screens under `app/` and register in tabs layout.
- Keep APIs async; fetch per screen with local state.