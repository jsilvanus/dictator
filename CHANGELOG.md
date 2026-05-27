# Changelog

## v1.0.0 — 2026-05-27

Initial release.

### Features

- **Voice dictation** — continuous speech-to-text with click-to-toggle and hold-to-talk modes; interim text preview; automatic punctuation normalisation
- **Command system** — 40+ voice commands via a configurable trigger phrase: deletion, navigation, selection, formatting, document management, mic control, and help
- **Trigger management** — per-session command trigger override; TriggerChip UI; sessionStorage persistence across reloads
- **AI inline mode** — `"Assistant, [request]"` during dictation routes to the inline AI; insert, replace, set-title, and speak actions; Accept/Discard confirmation for destructive changes; provenance highlighting with auto-fade
- **AI panel mode** — full-context conversational chat panel; streaming responses; panel-only actions (annotate, read-back); panel session persisted to database across reloads
- **AI-referencing commands** — `"Computer, delete/bold/undo the last assistant edit"` with text-anchor range resolution
- **Document editor** — Tiptap-based rich text editor with auto-save, version snapshots, word count, font size controls
- **Dashboard** — Recent documents section, folder accordion (one-level), Shared with me section; car-use touch targets
- **Sharing** — direct invite (email lookup), copy-link sharing, permission levels (read/edit), share revocation; optional share invite emails via SMTP
- **Authentication** — email + bcrypt credentials, JWT sessions, admin and editor roles
- **Admin panel** — user creation, deactivation, role management
- **Settings** — language, hold-to-talk, font size, command/AI triggers, TTS voice picker, instance defaults shown as placeholders
- **Docker** — multi-stage image with non-root user; Docker Compose stack with health checks; automatic migrations on startup
- **Security** — Content-Security-Policy headers; rate limiting on all AI endpoints (60 req/user/hour, in-memory; Redis recommended for multi-instance)
