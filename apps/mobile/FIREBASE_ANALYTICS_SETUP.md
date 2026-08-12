# Firebase Analytics setup

The mobile app records screen views and module-open events through React Native
Firebase Analytics. It uses the employee's internal numeric ID only; names,
email addresses, phone numbers, and free-text content are never sent.

## One-time Firebase Console setup

1. Create a Firebase project and enable Google Analytics during project setup.
2. Register the Android app with package name `com.zhao.family`, then download
   `google-services.json` to `apps/mobile/google-services.json`.
3. Register the iOS app with bundle ID `com.zhao.family`, then download
   `GoogleService-Info.plist` to `apps/mobile/GoogleService-Info.plist`.
4. In the Google Analytics property, register these user properties:
   `restaurant_id` and `employee_job_role`.
5. Mark only business-critical custom events as conversions; `module_opened`
   is intended for usage reporting, not a conversion by default.

## Expo configuration

The native Firebase file paths and both React Native Firebase plugins are
already configured in `app.json`.

`disableSPM` is required because this Expo app uses static iOS frameworks.
It keeps React Native Firebase's Firebase dependencies on CocoaPods, avoiding
the unsupported SPM and static-linkage combination during `pod install`.
The local `with-google-utilities-modular-headers` config plugin then enables
module maps only for `GoogleUtilities`, which FirebaseCoreInternal needs when
CocoaPods integrates it as a static library.

Build with EAS development or production builds. Firebase Analytics cannot run
inside Expo Go because it requires native modules.
