# Aidos SDK Integration Plan

Status: Proposed 2026-08-16
Scope: `dictator-kotlin/` (Android port) only
Canonical plan: `docs/dictator-sdk-integration-plan.md` in [`jsilvanus/aidos`](https://github.com/jsilvanus/aidos) — that repo owns the SDK, the Engine, and the RFC. This document covers Dictator's half and the assumptions it depends on.

## What this gets Dictator

Aidos Engine is a separate Android app that loads local models once and serves several apps on the
device over a loopback HTTP API — LLM chat, embeddings, and whisper-backed speech-to-text. Aidos
SDK is the client library for it. Integrating it gives Dictator:

1. **A local AI provider** alongside Claude, OpenAI, Ollama and the Dictator service, with no
   per-request egress and no API key.
2. **Offline dictation.** This is the larger prize. `AndroidVoiceServiceImpl` currently uses
   `android.speech.SpeechRecognizer`, which on most devices is cloud-backed — so a privacy-first
   editor built for a church deployment ships its users' dictated speech off-device by default
   today. Routing dictation through Engine's on-device whisper is what makes Dictator's privacy
   claims true of its primary input path.
Embeddings are deliberately **not** on this list. Aidos Engine serves them and the SDK exposes
them, but nothing in Dictator consumes vectors — grepping both the web app and `dictator-kotlin`
turns up only `EmbeddedPackagingStrategy.ts` and `c2pa-manifest.ts`, which are "embedded" in the
unrelated file-packaging sense. See "Embeddings, and why they are not a phase here" below.

**The Next.js web app is out of scope by construction.** The SDK reaches Engine over `127.0.0.1`
on the same Android device; a server cannot do that. Nothing in `lib/ai/providers/` changes.

## What Dictator depends on from the Aidos side

None of the Dictator phases below can start against a working Engine until these land. They are
tracked in the canonical plan as S0–S4.

| Phase | What | Why Dictator needs it |
|---|---|---|
| S0 | The SDK compiles at all | `sdk/` is currently red in CI: a missing brace, undeclared `kernel` and serialization dependencies, and Kotlin 2.1.0 against the rest of the repo's 2.4.10 |
| S1 | Handshake permission `signature` → `normal` | Dictator is signed with a different certificate, so today it gets a `SecurityException` at `bindService` and never reaches the user-approval screen that was built for exactly this case |
| S2 | A real SDK client: Binder handshake, three-state approval result, OkHttp transport, **SSE streaming**, typed capability negotiation | `EngineClientImpl.initialize()` currently contains no Binder code and returns `false` unconditionally |
| S3 | Published artifacts on GitHub Packages | How Dictator consumes it |
| S4 | Real token streaming in Engine | Engine's SSE currently chunks an already-complete response, so first-token latency equals full generation time |

Dictator depends on `aidos-sdk-client` only — the artifact with **no** dependency on Aidos's
`kernel` contract types. The `ModelAdapter` bindings ship separately as `aidos-sdk-adapters` for
Aidos Agent's use.

## D0 · Toolchain upgrade

**This is a prerequisite, not a choice, and it is the riskiest phase in the plan.**

`dictator-kotlin` is on Kotlin 1.9.25 and Java 11. Aidos is on Kotlin 2.4.10 and
`jvmToolchain(21)`. A 2.4.10 AAR cannot be read by a 1.9.25 compiler, so there is no version of
this integration that avoids the upgrade.

- Kotlin 1.9.25 → 2.4.10 across `dictator-core` and `dictator-android`.
- JVM 11 → 21.
- Knock-on work: Compose moves to the `kotlin("plugin.compose")` Gradle plugin; SQLDelight 2.0.1
  needs a Kotlin-2.x-compatible release; Hilt 2.50's `kapt` should move to KSP.
- `.github/workflows/ci.yml` does not build `dictator-kotlin` at all today — add a Gradle job in
  this same PR, so regressions from a change this broad are visible rather than discovered later.

This touches every Kotlin module in the Android port, so it should land on its own, first, before
any Aidos-specific code.

**Done when:** `cd dictator-kotlin && ./gradlew build` passes on Kotlin 2.4.10 / JVM 21, in CI.

## D1 · LLM chat through Engine

One structural constraint shapes this phase: **`dictator-core` is a KMP module with only a `jvm()`
target, and the SDK is Android-only.** `AidosProvider` cannot live in `dictator-core`.

- **Provider registration seam.** `AiProviderFactory.createProvider` is a hardcoded `when` over
  `ModelProvider` today. Add a registration hook so a platform module can contribute a provider.
  `ModelProvider.AIDOS` and the seam live in `dictator-core`; the implementation lives in
  `dictator-android` and registers itself at startup.
- **`AidosProvider : BaseAiProvider`** in `dictator-android`: `askInline` against the
  non-streaming endpoint, `chat` against the SDK's SSE flow, mapped to Dictator's existing
  `AiStreamChunk` vocabulary (`Delta` / `Complete` / `Error`).
- **Privacy policy entry.** `ProviderPolicyManager` gains an `aidos` policy with
  `processingLocations = ["local"]`, `dataRetentionDays = 0`, `usesDataForTraining = false` — the
  shape the existing `ollama` entry uses, distinguished as on-device via Aidos Engine.
- **Check the privacy gates.** `SensitiveDataDetector` and the privacy-approval path must not
  raise cloud-egress warnings for a provider that never leaves the device. A local provider
  tripping a "this will be sent to a third party" dialog would be both wrong and would train users
  to dismiss the warning that matters.
- **Availability UI in settings**, driven by the SDK's single degradation signal: Engine not
  installed (offer install), approval pending (deep-link to Engine's Connected Apps screen),
  incompatible API version, or ready. Falls back to the user's configured provider when Engine is
  unavailable.

**Done when:** a user selects Aidos as their provider, dictation-mode AI and the chat panel both
work against a real Engine, and uninstalling Engine falls back cleanly instead of erroring.

## D2 · Offline dictation

Opt-in, **alongside** `SpeechRecognizer` rather than replacing it — for a concrete UX reason, not
caution. `SpeechRecognizer` delivers continuous partial results, and Dictator's trigger-phrase
parsing and text-to-cursor flow are built on that. Engine's `/v1/audio/transcriptions` is
utterance-at-a-time and returns no partials.

- Audio capture via `AudioRecord` with utterance segmentation, buffered to WAV, posted to Engine.
- Shipped as an "offline dictation" mode with its tradeoff stated in the UI: no partial results,
  higher per-utterance latency, nothing leaves the device.
- Existing voice-command parsing and punctuation normalization are unchanged — they operate on
  transcribed text and do not care which engine produced it.

**Done when:** a user can dictate a document in airplane mode with Engine installed.

## Embeddings, and why they are not a phase here

The SDK serves embeddings — that is fixed, and does not depend on Dictator wanting them. What is
missing is a consumer: adding a provider method with no caller ships plumbing that rots until
something uses it.

The feature that would use it is semantic search over dictated documents, and it carries design
questions that have nothing to do with talking to Aidos Engine:

- **Where do vectors live?** A new SQLDelight table — and a decision about whether it participates
  in the offline-first sync layer or is explicitly excluded from it.
- **What gets embedded?** Whole documents, or paragraphs. Paragraphs are the interesting answer,
  because Dictator already has paragraph-level identity and provenance to hang them off.
- **When are they recomputed?** Every recompute is an Engine call, and Engine may not be installed.
- **How is similarity searched?** SQLite has no native vector index.
- **What is the actual feature?** "Search my documents by meaning" and "surface related passages
  while dictating" are different products with different latency budgets.

That gets scoped on its own merits. When it is, the SDK side is already built and waiting.

## Sequencing

D0 is independent of all Aidos-side work and should start immediately; it is the long pole. D1
needs D0 plus S1 and S3. D2 follows D1.

## Risks

- **D0's blast radius is the whole Android port.** Mitigated by doing it first, alone, with CI
  added in the same PR.
- **The first-run approval path crosses an app boundary** via a `PendingIntent` into Engine's
  Connected Apps screen. It needs to be walked on a real device, not reasoned about.
- **Two Engine-side gaps affect what D1 can be tested against**: Engine's handshake still returns
  hardcoded placeholder models, and its SSE is not yet true token streaming. Both are tracked as
  S1 and S4 on the Aidos side.
