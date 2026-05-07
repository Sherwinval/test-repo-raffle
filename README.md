# Entry Upload + Raffle Management

## Updated Frontend Structure

```text
client/src
  App.jsx
  main.jsx
  features/
    entry-upload/
      EntryUpload.jsx
      entryUpload.logic.js
      entryUpload.service.js
    raffle/
      RaffleRandomizer.jsx
      raffle.logic.js
      raffle.service.js
  components/
    TabNavigator.jsx
    ui/
      EntriesTable.jsx
      EventSelector.jsx
  utils/
    cryptoRandom.js
    fileParser.js
    validators.js
  hooks/
  constants/
    app.constants.js
  styles/
    global.css
```

## Conventions

- `main.jsx` is bootstrap-only and must not include feature logic.
- Feature folders own their UI (`.jsx`), logic (`.logic.js`), and external calls (`.service.js`).
- Shared helpers are placed under `components`, `utils`, `hooks`, and `constants`.
- Path alias `@` points to `client/src` (configured in `client/vite.config.js`).
- Named exports are used across the new modules.

## Tabs

- `Entry Upload`: event selection, file selection, duplicate confirmation, upload progress, and entry preview table.
- `Raffle Randomizer`: loads event entries, draws winners, excludes already drawn winners, and supports reset.

## Randomizer Algorithm (No Math.random / Math.floor)

`utils/cryptoRandom.js` uses `crypto.getRandomValues()` with rejection sampling:

1. Generate a 32-bit random integer from Web Crypto.
2. Reject values in the modulo-bias range.
3. Use `value % maxExclusive` as the uniform index.
4. Generate an entropy fingerprint (`hex`) for each draw for auditability.

This keeps winner selection fair and reproducible at the audit level (via fingerprint records).

## Adding a New Feature

1. Create `client/src/features/<feature-name>/`.
2. Add:
   - `<FeatureName>.jsx`
   - `<featureName>.logic.js`
   - `<featureName>.service.js`
3. Add shared UI in `client/src/components/ui` only if reusable.
4. Wire feature into `App.jsx` tabs or route shell.
