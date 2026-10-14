# Dayflow

An offline-first personal productivity app for Android, built with Expo, React Native, TypeScript and SQLite.

## MVP
- Home dashboard
- Notes with local persistence
- Tasks with completion state
- Habit tracking
- Light/dark/system theme foundation
- No account, cloud sync, analytics, or ads in the initial release

## Current build status

Shared bottom navigation is now wired across Home, Notes, Tasks, and Habits. A GitHub Actions workflow validates Expo dependency compatibility, TypeScript, and the Android JavaScript bundle on changes. The first run must pass before this baseline can be called build-verified.

## Local development
1. Install Node.js LTS and the Expo-compatible Android tooling.
2. From this directory run `npm install`.
3. Run `npx expo install --check` and resolve any SDK compatibility warnings.
4. Run `npm run typecheck` and `npx expo start`.
5. Test on a physical Android device, including airplane mode and force-close/relaunch.

## Release checklist
- Confirm the package ID is available and the Dayflow name/logo are cleared for use.
- Add production app icon, adaptive icon, splash screen and store screenshots.
- Verify database migrations and destructive actions on-device.
- Validate notification behavior and permission-denied paths.
- Publish privacy policy and accurately complete Play Console Data safety.
- Build a signed Android App Bundle with EAS Build or local Gradle tooling.
- Complete the Play Console testing requirements for the developer account.
- Review current Google Play target API and policy requirements before submission.

## Important
This repository is a development baseline, not a claim of Play Store readiness. Do not submit until device QA, legal/privacy review, accessibility checks and a signed release build have passed. The app name and application ID are provisional until checked.
