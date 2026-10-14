# Dayflow

An offline-first personal productivity app for Android, built with Expo, React Native, TypeScript and SQLite.

## MVP
- Home dashboard
- Notes with local persistence
- Tasks with completion state
- Habit tracking
- A consistent light-theme interface (theme selection is not implemented yet)
- No account, cloud sync, analytics, or ads in the initial release

## Current build status

Shared bottom navigation is wired across Home, Notes, Tasks, and Habits. The CI workflow checks Expo dependency compatibility, Expo Doctor, TypeScript, lint, unit tests, and Android JavaScript export. A passing workflow verifies project configuration and the JavaScript bundle; it does not verify a native APK/AAB or on-device behavior. This verifies the JavaScript bundle and project configuration; it does not verify a native APK/AAB or on-device behavior. Continue running the workflow after every app change.

## Local development
1. Install Node.js LTS and the Expo-compatible Android tooling.
2. From this directory run `npm install`.
3. Run `npx expo install --check` and resolve any SDK compatibility warnings.
4. Run `npm run typecheck` and `npx expo start`.
5. Test on a physical Android device, including airplane mode and force-close/relaunch.

## Android build profiles

`eas.json` defines an internal preview APK and a production Android App Bundle (AAB). A cloud build still requires an Expo account, EAS project initialization, and the package ID to be confirmed. From this directory, after signing in to EAS, run `npx eas-cli build --platform android --profile preview` for a device-installable test APK, or `npx eas-cli build --platform android --profile production` for an AAB. These profiles are configuration only; no native binary has been built yet.

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
