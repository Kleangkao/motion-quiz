# Motion Quiz — Android TWA (Bubblewrap)

Trusted Web Activity wrapper for [https://motion-quiz.vercel.app](https://motion-quiz.vercel.app).

**Package:** `com.islanddao.motionquiz`

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
npm run android:update

# Debug APK
npm run android:build:debug
# Output: twa/app/build/outputs/apk/debug/app-debug.apk

# Release APK (requires local signing.properties)
cd twa && gradlew.bat assembleRelease
# Output: twa/app/build/outputs/apk/release/app-release.apk
```

## Release signing

Release keystore lives **outside the repo** (e.g. `%USERPROFILE%\.android\motion-quiz-release.jks`).

Local Gradle reads **`twa/signing.properties`** (gitignored). Template: `twa/signing.properties.example`.

Helper (creates keystore + properties locally, never committed):

```bash
node scripts/create-release-keystore.mjs
```

**Do not commit:** keystore, passwords, `signing.properties`, or APK/AAB outputs.

## Digital Asset Links

Verified TWA requires production `/.well-known/assetlinks.json` matching the **release** certificate SHA-256.

Current production binds package `com.islanddao.motionquiz` to the release fingerprint (see `public/.well-known/assetlinks.json`).

## Emulator vs real device

| Test area | Emulator | Real Android / Seeker |
|-----------|----------|------------------------|
| UI / navigation | Yes | Yes |
| Verified TWA (no URL bar) | Yes (release APK) | Yes |
| Camera / gestures | No (typical AVD: no front camera) | **Required** |
| Wallet / score / NFT | No (no MWA wallet installed) | **Required** |

See `docs/dapp-store-submission/known-limitations.md` for QA notes.

## dApp Store submission

Draft checklists and metadata: `docs/dapp-store-submission/`

Privacy policy (after deploy): https://motion-quiz.vercel.app/privacy.html
