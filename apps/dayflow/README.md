# Dayflow

An offline-first personal productivity app for Android, built with Expo, React Native, TypeScript and SQLite.

## MVP
- Home dashboard with editable daily focus and local summary stats
- Notes with search, pinning, editing, and a warning before discarding unsaved changes
- Tasks with completion state, priority, due-date choices, and filters
- Habit tracking with daily check-ins and archive support
- Local profile nickname and workspace settings (daily-focus visibility and week-start preference)
- A consistent light-theme interface (theme selection is not implemented yet)
- No account, cloud sync, analytics, or ads in the initial release

## Current build status

Shared bottom navigation is wired across Home, Notes, Tasks, and Habits; Profile and Settings are available from the Home screen. The latest verified debug build is available from the [Dayflow Android checks workflow](https://github.com/spunkytechai/Spunky-Tech/actions/runs/38659199929) as the `dayflow-android-debug-apk` artifact. Subsequent commits require their own successful build run before they can be considered verified. The CI workflow checks Expo dependency compatibility, Expo Doctor, TypeScript, lint, unit tests, and Android JavaScript export. It also generates a native Android project, builds a debug APK, and uploads it as the `dayflow-android-debug-apk` workflow artifact when that job succeeds. A debug APK is for installation/testing only; it is not a signed Play Store release AAB and does not replace physical-device QA.

## Local development
1. Install Node.js LTS and the Expo-compatible Android tooling.
2. From this directory run `npm install`.
3. Run `npx expo install --check` and resolve any SDK compatibility warnings.
4. Run `npm run typecheck` and `npx expo start`.
5. Test on a physical Android device, including airplane mode and force-close/relaunch.

## Android build profiles

`eas.json` defines an internal preview APK and a production Android App Bundle (AAB). A cloud build still requires an Expo account, EAS project initialization, and the package ID to be confirmed. From this directory, after signing in to EAS, run `npx eas-cli build --platform android --profile preview` for a device-installable test APK, or `npx eas-cli build --platform android --profile production` for an AAB. The EAS profiles are configuration only until an EAS build is run. CI is configured to build a separate debug APK without EAS credentials; the release AAB still requires an authenticated EAS or local signed build.

## Release checklist
- Confirm the package ID is available and the Dayflow name/logo are cleared for use.
- Add production app icon, adaptive icon, splash screen and store screenshots.
- Verify unsaved-note protection and settings persistence after app restart.
- Verify database migrations and destructive actions on-device.
- Validate notification behavior and permission-denied paths.
- Publish privacy policy and accurately complete Play Console Data safety.
- Build a signed Android App Bundle with EAS Build or local Gradle tooling.
- Complete the Play Console testing requirements for the developer account.
- Review current Google Play target API and policy requirements before submission.

## Important
This repository is a development baseline, not a claim of Play Store readiness. Do not submit until device QA, legal/privacy review, accessibility checks and a signed release build have passed. The app name and application ID are provisional until checked.
