# Dayflow — implementation plan and release gates

**Status:** Initial implementation scaffold on `feat/dayflow-production-mvp`. Not yet device-tested or Play Store ready.

## Product contract
Dayflow is a consumer-focused, offline-first personal workspace. MVP scope is dashboard, notes, tasks, habits, and basic preferences. No login, cloud sync, analytics, ads, subscriptions, or AI in v1. Data stays in the local SQLite database unless the user explicitly exports it in a later approved feature.

## Current baseline
- Expo + React Native + TypeScript
- Expo Router screen structure
- SQLite initialized with notes, tasks, habits, habit entries, indexes, and schema metadata
- Initial dashboard plus notes, tasks, and habits CRUD screens
- Local-only persistence; no backend credentials or network dependency
- App ID placeholder: `com.spunkytech.dayflow` (must be checked before release)

## Work remaining before production
### P0 — Build integrity
- Install dependencies in a clean environment and resolve Expo SDK package versions using `npx expo install --check`.
- Run TypeScript, lint, and unit tests; fix all errors.
- Add automated tests for repositories, validation, database migrations, and date logic.
- Replace timestamp/random IDs with a collision-safe UUID implementation available in the chosen Expo SDK.
- Add migration strategy beyond the initial schema; verify SQLite transaction behavior and startup recovery.
- Add error boundaries, visible recoverable errors, loading states, empty states, and destructive-action confirmation everywhere.
- Add persistent tab navigation and a settings screen.

### P1 — Product completeness
- Notes: pin/unpin, checklist items, folder support, autosave with truthful save state, delete, search.
- Tasks: due dates, Today/Upcoming/Completed filters, priority editing, reminders, cancellation/rescheduling.
- Habits: weekday schedule, local-date entries, consecutive streak calculation (not total completion count), archive/unarchive.
- Settings: system/light/dark theme, notification permission state, privacy policy, app version, clear local data.
- Dashboard: counts and habit progress based on persisted records, refresh on focus.
- Accessibility: screen-reader labels/state, dynamic type review, contrast, touch targets, keyboard and Android back behavior.

### P2 — Design and privacy
- Integrate approved icon, adaptive icon, splash screen, and final design tokens.
- Review the visual system against the approved mockup on small and large Android devices.
- Publish a privacy policy that accurately describes local storage and any SDK behavior.
- Inventory all SDKs and network behavior before completing Play Console Data safety.
- Avoid analytics/crash-reporting SDKs in v1 unless separately approved and disclosed.

### P3 — Release engineering
- Pin compatible dependencies and commit the lockfile.
- Add CI for install, typecheck, lint, tests, and Expo config validation.
- Create a reproducible signed Android App Bundle using EAS Build or documented local tooling.
- Test on a physical Android device: fresh install, upgrade, airplane mode, process death/restart, low storage, permissions denied, date rollover/time zone change, and accessibility.
- Verify Play Console's current target API, testing-track requirements, account verification, app signing, listing assets, content rating, privacy policy, and Data safety declarations immediately before submission.

## Data integrity and date rules
- Use parameterized SQL; never interpolate user text into SQL.
- Keep foreign keys enabled and use transactions for multi-row changes.
- Store timestamps as ISO-8601 UTC strings, but habit completion keys as local calendar dates in YYYY-MM-DD format.
- Calculate streaks from consecutive local dates and define whether a missed day resets the streak.
- Ensure duplicate habit entries are blocked by the database unique constraint.
- Never report a write as successful until SQLite confirms it.

## Acceptance gates
1. Clean dependency install and Expo compatibility check pass.
2. TypeScript, lint, and automated tests pass.
3. All CRUD operations persist across app restart and work offline.
4. Migrations and data constraints pass automated tests.
5. Manual device QA passes on at least one current Android device and one smaller screen/emulator.
6. Signed release AAB installs and launches without crash; version, app ID, icon and launch screen are correct.
7. Privacy, policy, store listing, testing and target API requirements are verified against current Google Play Console requirements.
8. Human review approves the pull request and release candidate; no auto-merge or automatic publication.

## Budget and status
The plan prioritizes free local tooling and no paid backend. Google Play developer registration and any optional build-service limits may create unavoidable costs. This branch is a starting implementation, not a completed or verified release. No claim of successful build, automated tests, device QA, or Play Store submission is made until those checks are executed and evidenced.
