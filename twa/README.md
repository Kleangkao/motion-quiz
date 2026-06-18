# Motion Quiz — Android TWA (Bubblewrap)

Trusted Web Activity wrapper for [https://motion-quiz.vercel.app](https://motion-quiz.vercel.app).

## Prerequisites

- JDK 17+ (Android Studio JBR works)
- Android SDK (`ANDROID_HOME` or `%LOCALAPPDATA%\Android\Sdk`)
- Bubblewrap CLI: `npx @bubblewrap/cli@1.24.1`

Configure once (user machine, not committed):

```json
// ~/.bubblewrap/config.json
{
  "jdkPath": "C:\\Program Files\\Android\\Android Studio\\jbr",
  "androidSdkPath": "C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk"
}
```

## Commands

From repo root:

```bash
# Regenerate Android project from twa-manifest.json
npx @bubblewrap/cli update --directory=twa --skipVersionUpgrade

# Debug APK (Gradle debug signing when --skipSigning)
npx @bubblewrap/cli build --directory=twa --skipSigning

# Or Gradle directly:
cd twa && ./gradlew assembleDebug
```

Debug APK output: `twa/app/build/outputs/apk/debug/app-debug.apk`

## Release signing (not configured)

Release keystore is **not** created yet. Before dApp Store submission:

1. Create release keystore (user approval required).
2. Update `twa/twa-manifest.json` `signingKey.path` and `alias`.
3. Add **release** SHA-256 to `public/.well-known/assetlinks.json` on production.
4. Build signed release: `npx @bubblewrap/cli build --directory=twa`

## Digital Asset Links

Verified TWA requires `assetlinks.json` on production matching the **release** certificate.

The repo may include a **debug-only** fingerprint for emulator smoke tests — replace before submission.

## Emulator install

```bash
adb install -r twa/app/build/outputs/apk/debug/app-debug.apk
```
