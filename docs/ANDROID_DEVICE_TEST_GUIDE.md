# Dictator Android – device test guide

Dictator Android is now a local-first app: documents live on the device, AI runs through Aidos Engine
(on-device), dictation uses either the Android speech recognizer or Engine's speech-to-text. No
Dictator server or account is needed.

## What was verified, and what was not

| Verified by build/tests in CI-like env | Only read, never run |
|---|---|
| `gradle :dictator-android:assembleDebug` succeeds | Anything on a real device or emulator |
| `:dictator-core:jvmTest` and `:dictator-android:testDebugUnitTest` pass (view models, dictation interpreter, local store, Aidos provider against a fake SDK client, utterance segmenter) | The Engine handshake, approval flow and real chat/STT calls |
| | Microphone capture, `SpeechRecognizer` behaviour, Compose UI layout |

Treat the first device run as the real test of the Engine and dictation paths.

## Build prerequisites

1. JDK 21 for Dictator; the Aidos SDK build needs JDK 17.
2. Android SDK (platform 34) with `ANDROID_HOME` set.
3. Publish the Aidos SDK client locally (until it is published anywhere):
   `cd aidos/sdk && gradle :client:publishToMavenLocal`
4. `cd dictator/dictator-kotlin && gradle :dictator-android:assembleDebug`
   (`--max-workers=1` if Maven Central rate-limits you).

## Install

- Install Aidos Engine (with at least one chat model, and a speech model for Engine dictation).
- `adb install dictator-android/build/outputs/apk/debug/dictator-android-debug.apk`

## Test script

1. **Launch Dictator.** It opens the document list (no login). Dictator announces itself to Engine at
   launch; Engine should show a notification / an entry under *Connected Apps*.
2. **Approve** Dictator in Engine. Settings → *Aidos Engine* card should show "Available"
   (use *Test connection*).
3. **Documents:** create, rename, delete; reopen a document; edit and leave the screen (autosave;
   status line shows saved).
4. **Dictation, system engine** (Settings → Dictation engine → System): tap the mic, grant the
   permission, speak. Partial text appears in the banner, final text is inserted at the cursor.
   Try Finnish (language fi-FI) and "piste", "pilkku", "uusi kappale".
5. **Commands:** say "Computer new paragraph", "Computer undo", "Computer save" (Finnish
   "Tietokone …", Swedish "Dator …"). A command word without the activation word is dictated as text.
6. **Dictation, Aidos engine** (Settings → Dictation engine → Aidos): text appears per utterance
   after a pause (no partial results; whole utterances are transcribed). Expect a delay on first use
   while Engine loads the speech model.
7. **AI:** "Assistant, summarise this" or use the AI sheet. Local (Aidos) requests go through with no
   prompt. Configure a cloud provider in Settings to see the consent dialog (once per provider, and
   again if personal data is detected).
8. **Engine unavailable:** stop Engine or revoke approval; AI requests must fail with an actionable
   message and must NOT fall back to a cloud provider.

## Known limits

- Sync, sharing and login are not wired to the editor (the server is optional and unused).
- The Dictator server URL is read at startup; changing it needs an app restart.
- Provider API keys are stored in plain SharedPreferences (encrypting them is a follow-up).
- Engine is reached over HTTP on loopback; the app ships a network security config allowing cleartext
  to 127.0.0.1/localhost only (plus 10.0.2.2 in debug builds).
- `AIViewModel`, `SyncViewModel`, `ShareViewModel`, `AIPanel`, `AIHistoryScreen` are unused stubs.
- Hilt was replaced with Koin: Hilt 2.52 cannot read Kotlin 2.4 metadata and newer Hilt needs AGP 9.
