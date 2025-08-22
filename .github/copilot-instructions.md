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
- Use only installed dependencies.

## Menstruation tracking (Calendar)
- UI: lightweight custom grid calendar (no heavy lib).
- SQLite schema (5 cols exact): `date TEXT UNIQUE`, `pill_taken INTEGER`, `blood_flow INTEGER`, `symptoms INTEGER`, `notes TEXT`.
- Storage service (async, no global state):
   - `loadAllEntries()`, `getEntryByData(date)`, `listEntriesInRange(start,end)`,
      `recordPillIntake(date)`, `recordBloodFlow(date, blood_flow)`,
      `recordSymptom(date, symptoms[])`, `recordNote(date, note)`,
      `addOrUpdateEntry(entry)`.
- Domain `Entry`: `{ date: string, pillTaken: boolean, bloodFlow: BloodFlow, symptoms?: SymptomKey[], notes?: string }`.
- Symptoms fixed set: `cramps`, `vomiting`, `headache`, `moodChanges`.
- Helpers: `createSymptomBitmask(keys)`, `decodeSymptomBitmask(mask)`; keys are deduped.
- Bitmask is hidden from callers; API uses `SymptomKey[]` and encodes/decodes internally.
- Notes: single string per entry (not an array).

## Pill reminder
- Configure in Profile; quick actions in Today.
- Model 21+7 cycles apart from intake logs.
- `expo-notifications`, device timezone, per-weekday HH:MM.

## Today tab
- Show date, pill reminders, quick intake, cycle status, next bleeding.
- Fertile window: 14-day ovulation rule from latest cycle start (pure utils, e.g. `logic/cycle.ts`).

## Patterns from `app-example/`
- Themed components, `useThemeColor`, haptic tabs, translucent background.

## Don’t implement yet
- Encryption, partner sharing, other future items.

## Working style
- Minimal diffs; colocate new screens under `app/` and register in tabs layout.
- Keep APIs async; fetch per screen with local state.