# VoiceDoc — product spec & phased TODO

Working title: **VoiceDoc**
Organisation: Evangelical Lutheran Church of Finland (initial deployment)
Stack: Next.js 15 App Router · ESM · Tiptap · Auth.js · PostgreSQL · Drizzle ORM · Anthropic API · Docker

---

## 1. Product overview

VoiceDoc is a self-hosted, voice-first document editor for institutional deployment. A user presses a
single button and speaks; text flows to the cursor. Voice commands (prefixed with a configurable
trigger phrase) control the editor without touching the keyboard. A second trigger phrase routes the
same speech stream to an embedded AI that can read, react to, and write into the document inline —
no mode switch required. A separate AI conversation panel is available for more deliberate interaction.

The dashboard is designed with a car-use constraint: a user should be able to open the app, locate
the right document, and begin dictating in under three taps, without needing to read small text or
navigate nested menus. This constraint shapes touch target sizes, information hierarchy, and the
prominence of the Recent section throughout.

The application ships as a Docker image for self-hosted deployment inside any organisation's
infrastructure.

---

## 2. Architecture

```
voicedoc/
  app/
    (auth)/
      login/page.tsx
      register/page.tsx
    (app)/
      dashboard/page.tsx            document list, folders, recent
      document/[id]/page.tsx        editor
      settings/page.tsx             user preferences
      admin/page.tsx                user management (admin only)
    api/
      auth/[...nextauth]/route.ts
      documents/
        route.ts                    GET list, POST create
        [id]/route.ts               GET, PUT, DELETE
        [id]/share/route.ts         GET shares, POST invite, DELETE revoke
      folders/
        route.ts                    GET list, POST create
        [id]/route.ts               PUT rename, DELETE
      shares/
        link/route.ts               POST create link share, GET resolve token
      ai/
        inline/route.ts             POST: dictation-mode AI
        chat/route.ts               POST: panel-mode AI (streaming)
      users/
        [id]/settings/route.ts      GET, PUT
      health/route.ts
  lib/
    db/
      schema.ts                     Drizzle schema
      index.ts                      db client
      migrate.ts                    run-on-startup migrations
    voice/
      commands.ts                   trigger parser + command dispatcher
      punctuation.ts                inline symbol map
      help.ts                       help command data
    ai/
      context.ts                    Tiptap doc → clean text for prompts
      session.ts                    AiSession + AiTurn types, action log helpers
      commands.ts                   AiResponse → editor.chain() calls
      prompts.ts                    system prompt templates
  components/
    dashboard/
      DocumentRow.tsx               single document row (72px min height)
      FolderAccordion.tsx           folder + inline-expanded children
      ShareSheet.tsx                shared-with-me section row
    editor/
      VoiceEditor.tsx               root editor shell
      Toolbar.tsx                   formatting toolbar
      FontSizeControls.tsx          +/− buttons + size label
      VoiceDock.tsx                 mic button, AI button, transcript area
      TriggerChip.tsx               active trigger pill with session override
      AiPanel.tsx                   conversational AI tray
      HelpOverlay.tsx               full command reference overlay
      AiHighlight.ts                Tiptap decoration: provenance highlight
    shared/
      ShareModal.tsx                invite + copy-link + people list
  Dockerfile
  docker-compose.yml
  docker-compose.override.yml       local dev: hot reload, exposed DB port
```

---

## 3. Data model

```typescript
// users
id            uuid PK
email         text UNIQUE NOT NULL
password_hash text NOT NULL
name          text NOT NULL
role          enum('admin','editor') DEFAULT 'editor'
settings      jsonb DEFAULT '{}'
created_at    timestamptz DEFAULT now()

// folders
id            uuid PK
owner_id      uuid FK → users.id ON DELETE CASCADE
name          text NOT NULL
created_at    timestamptz DEFAULT now()

// documents
id            uuid PK
owner_id      uuid FK → users.id ON DELETE CASCADE
folder_id     uuid FK → folders.id ON DELETE SET NULL   -- null = unfiled
title         text NOT NULL DEFAULT 'Untitled'
content       jsonb NOT NULL DEFAULT '{}'               -- ProseMirror JSON
word_count    integer GENERATED
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()

// document_versions
id            uuid PK
document_id   uuid FK → documents.id ON DELETE CASCADE
content       jsonb NOT NULL
saved_at      timestamptz DEFAULT now()
-- kept for last 20 versions per document; older pruned on save

// shares
id            uuid PK
document_id   uuid FK → documents.id ON DELETE CASCADE
shared_by     uuid FK → users.id
shared_with   uuid FK → users.id   -- null for link shares
token         text UNIQUE           -- for copy-link sharing; null for direct invites
permission    enum('read','edit')
expires_at    timestamptz           -- null = permanent
created_at    timestamptz DEFAULT now()

// ai_sessions (optional; starts as React state, persisted in Phase 10)
id            uuid PK
document_id   uuid FK → documents.id ON DELETE CASCADE
user_id       uuid FK → users.id
mode          enum('inline','panel')
turns         jsonb NOT NULL DEFAULT '[]'   -- AiTurn[]
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

### User settings schema (jsonb)

```typescript
{
  commandTrigger:    string   // default "Computer"
  aiTrigger:         string   // default "Assistant"
  language:          string   // default "en-US"  (fi-FI, sv-SE supported)
  ttsEnabled:        boolean  // default true
  ttsVoice:          string   // Web Speech API voice name
  holdToTalk:        boolean  // default false (click-to-toggle)
  viewFontSize:      'S'|'M'|'L'|'XL'|'XXL'  // default 'M'
}
```

### Session state (React, not persisted — except where noted)

```typescript
{
  temporaryTrigger:    string | null       // persisted in sessionStorage
  currentMode:         'idle' | 'dictating' | 'command' | 'ai-inline' | 'ai-panel'
  aiPanelOpen:         boolean
  lastDictatedRange:   { from: number; to: number } | null
  inlineAiSession:     AiSession
  panelAiSession:      AiSession
}
```

---

## 4. Dashboard design

### 4.1 Car-use principle

The dashboard must support a three-tap golden path: open app → find document → begin dictating.
All interactive elements observe a minimum touch target of 72 × 72 px (rows) or 44 × 44 px
(action buttons). No hover-only interactions. Font sizes no smaller than 14 px for any content
the user needs to read.

### 4.2 Layout

**Recent section** — top of the page, always visible without scrolling on a phone. Shows the
5 most recently edited documents across all folders. This is the primary navigation surface
for daily use. Large rows with title (15 px, weight 500), relative edit time ("14 min ago"),
and word count. A share icon button sits at the right edge of every row.

**New document button** — full-width, 72 px tall, dashed border, sits above Recent. One tap
creates a document and opens the editor.

**All documents section** — below Recent. Folders render as accordion rows; tapping a folder
expands it inline (no page navigation). One nesting level only. Unfiled documents appear
below all folders as a flat list. Each folder shows its document count when collapsed.

**Shared with me section** — at the bottom. Shows documents shared by other users. Visually
distinct (info-colour icon). Shows sharer name and permission level.

### 4.3 Folder accordion behaviour

Tapping a folder row toggles it open/closed in place. The row's border-bottom collapses and
the children list appears immediately below, visually connected (shared left/right/bottom
border, no gap). The folder icon changes from `ti-folder` to `ti-folder-open`. A chevron
rotates 90°. Only one folder can be open at a time; opening a second closes the first.

---

## 5. Sharing

### 5.1 Share entry points

- Dashboard document row: share icon button (44 × 44 px tap target) on the right of every row.
- Editor topbar: "Share" button next to the font size controls.
- Both open the same `ShareModal` component.

### 5.2 Share modal panels

**Invite panel** — email input + permission selector (Can edit / Can view) + Send button.
Sends a POST to `/api/documents/[id]/share` which creates a `shares` row with `shared_with`
set to the resolved user id and emails a notification (if SMTP is configured).

**Copy link panel** — displays a shortened token URL. Permission selector applies to anyone
with the link. "Copy" button copies to clipboard. POST `/api/shares/link` creates a `shares`
row with `token` set and `shared_with` null.

**People with access panel** — lists owner (cannot be removed) and all current shares with
name, avatar, and permission. Each share has a Remove button (DELETE `/api/documents/[id]/share`).

### 5.3 Recipient experience

Shared documents appear in the recipient's "Shared with me" dashboard section. If the
recipient has no account, the invite email contains a registration link pre-filled with their
email that links the share on registration. Read-only shares render the editor with toolbar
and voice dock hidden; dictation is disabled.

---

## 6. Font size

Font size is a **view preference**, not a document formatting change. It scales how the editor
renders on screen; the ProseMirror document JSON is unaffected.

### 6.1 Size levels

| Level | Body | H1 | H2 | H3 |
|---|---|---|---|---|
| S | 14 px | 23 px | 18 px | 16 px |
| M | 16 px | 26 px | 21 px | 18 px | ← default
| L | 20 px | 33 px | 26 px | 22 px |
| XL | 24 px | 39 px | 31 px | 27 px |
| XXL | 28 px | 46 px | 37 px | 32 px |

Heading sizes are em-based multiples; they scale automatically from the body size:
H1 = 1.625×, H2 = 1.3×, H3 = 1.125×.

### 6.2 Implementation

```css
.editor-wrap {
  --vd-font-size: 16px;   /* set from user settings on load */
}
.tiptap p, .tiptap li  { font-size: var(--vd-font-size); }
.tiptap h1             { font-size: calc(var(--vd-font-size) * 1.625); }
.tiptap h2             { font-size: calc(var(--vd-font-size) * 1.3); }
.tiptap h3             { font-size: calc(var(--vd-font-size) * 1.125); }
```

### 6.3 Controls

`FontSizeControls.tsx` renders in the editor topbar as a compact button group:
`[ − ][ M ][ + ]` where the centre label shows the current level name. Each button is 40 × 36 px.
Keyboard shortcuts: `Cmd+=` (larger), `Cmd+−` (smaller). Changes persist to user settings
(debounced 500 ms — no API call on every tap).

---

## 7. Voice input system

### 7.1 Push-to-talk

The mic button is the primary entry point. Two interaction models selectable per user:

- **Click-to-toggle** (default): one click starts recording, another stops.
- **Hold-to-talk**: hold the button; release stops. Useful in noisy environments.

A `SpeechRecognition` session is kept alive across natural pauses (`continuous: true`,
`interimResults: true`). The session is not closed between sentences — only on explicit stop.

### 7.2 Trigger phrase system

Two configurable trigger phrases operate simultaneously within any active recognition session.
Both are scanned on every `onresult` event before text is committed.

| Trigger | Default | Function |
|---|---|---|
| Command trigger | `"Computer"` | Routes post-trigger text to the command parser |
| AI trigger | `"Assistant"` | Routes post-trigger text to the inline AI handler |

**Detection:** scan for `/\b{trigger}[,\s]/i`. On match, text before the trigger is committed
to the editor; text after is routed to the appropriate handler.

**Multiple triggers in one utterance** are processed sequentially left-to-right:

> *"The grace of God is sufficient. Assistant, rephrase that more poetically. Computer, new
> paragraph. This is the heart of our message."*

Execution order: commit text → AI inline request → execute `new paragraph` → commit text.

### 7.3 Temporary command trigger override

When the user is writing content that contains the command trigger word as normal text, they
can swap the command trigger for the session.

- Voice: `"Computer, change trigger to Jarvis"` → session override applied immediately.
- UI: click the trigger chip in the dock to open an inline text input.

The override is shown as an amber pill in the dock with a `×` reset button.
It is stored in `sessionStorage` (survives reload within the same tab).
The AI trigger has no voice override path — only via user settings.

### 7.4 Inline punctuation map

Applied during the pre-commit normalisation pass. No trigger phrase needed.

| Spoken | Inserted | Spoken | Inserted |
|---|---|---|---|
| period / full stop | `.` | open quote | `"` |
| comma | `,` | close quote | `"` |
| question mark | `?` | open parenthesis | `(` |
| exclamation mark | `!` | close parenthesis | `)` |
| colon | `:` | em dash | `—` |
| semicolon | `;` | hyphen | `-` |
| new line | `↵` | new paragraph | `¶¶` |

---

## 8. Command vocabulary

All commands require the active command trigger prefix. Destructive whole-document commands
require spoken confirmation (`"Computer, confirm"` within 5 seconds).

### Deletion

| Command | Action |
|---|---|
| delete word / delete last word | remove word before cursor |
| delete sentence / delete last sentence | remove sentence before cursor |
| delete paragraph / delete last paragraph | remove current paragraph |
| delete line | remove current line |
| delete selection | remove selected range |
| delete that | remove the last dictated segment (tracked range) |
| clear document | clear all — requires confirmation |

### Navigation

| Command | Action |
|---|---|
| go to start / go to beginning | cursor → document start |
| go to end | cursor → document end |
| beginning of paragraph | cursor → start of current paragraph |
| end of paragraph | cursor → end of current paragraph |
| next paragraph | jump forward one paragraph |
| previous paragraph | jump back one paragraph |
| find [text] | move cursor to first match |

### Editing

| Command | Action |
|---|---|
| undo | undo last editor transaction |
| redo | redo |
| select word / sentence / paragraph / all | selection |
| copy / cut | clipboard on selection |

### Formatting

| Command | Action |
|---|---|
| bold / italic / underline | toggle mark on selection or next word |
| heading one / two / three | set heading level |
| normal text / plain text | clear heading / list formatting |
| bullet list / numbered list | list block |
| blockquote / code / code block | block types |

### Document

| Command | Action |
|---|---|
| save | manual save |
| new document | create new document, navigate to it |
| set title [text] | update document title |
| print | open browser print dialog |

### Mic control

| Command | Action |
|---|---|
| stop / stop listening | end recognition session |
| pause | suspend recognition, keep session warm |
| resume | resume from pause |

### Trigger management

| Command | Action |
|---|---|
| change trigger to [word] | session override for command trigger |
| reset trigger | clear session override |

### Help

| Command | Action |
|---|---|
| help | TTS reads categories; opens help overlay |
| help [category] | filtered overlay (navigation, editing, formatting, document, AI, triggers) |

### AI-referencing commands

These commands operate on the AI session log and require a session reference alongside the
editor. The pattern is:

```
[operation] [the] (last|previous|second|third) (assistant|AI) (edit|change|addition|insertion)
```

`last` resolves to the most recent accepted turn; `previous` / `second` to one before that;
`third` to two before. Discarded turns are skipped.

| Command | Action |
|---|---|
| select the last assistant edit | resolve range, set text selection there |
| go to the last assistant edit | move cursor to start of resolved range |
| delete the last assistant edit | resolve range, `deleteRange()` |
| bold / italic / underline the last assistant edit | resolve range, apply mark |
| heading [N] the last assistant edit | resolve range, apply heading |
| undo the last assistant edit | targeted undo: delete afterContent, re-insert beforeContent |
| restore the last assistant edit | re-insert the most recently discarded turn's afterContent |
| replace the last assistant edit | resolve range, set selection (user dictates the replacement) |

**Range resolution** uses text anchoring, not stored editor positions, because positions drift
as the user types after an AI action. The first 60 characters of `turn.afterContent` are
searched in the live document text using `editor.getText().indexOf(anchor)`, then mapped to
a ProseMirror `{ from, to }` range via a `textOffsetToRange()` utility. If the text is not
found, the command tells the user: *"That edit no longer exists in the document."*

---

## 9. AI integration

### 9.1 AI session model

Each AI mode maintains a separate session object. Both start as React state; panel sessions
can optionally be persisted to the `ai_sessions` table (Phase 10).

```typescript
type AiTurn = {
  id:            string
  timestamp:     number
  userRequest:   string          // what the user said/typed
  action:        AiAction        // the action that was executed
  beforeContent: string | null   // original text (for replace/delete actions)
  afterContent:  string | null   // text the AI produced
  cursorContext: string          // paragraph where cursor was at time of action
  accepted:      boolean | null  // null = pending confirmation
  discardedAt:   number | null   // timestamp if discarded; null otherwise
  docVersion:    number          // document version counter at time of action
}

type AiSession = {
  documentId:        string
  mode:              'inline' | 'panel'
  turns:             AiTurn[]
  currentDocVersion: number      // incremented on every Tiptap onUpdate event
}
```

`docVersion` is a simple integer incremented on every `onUpdate` event. Before referencing
`turn.afterContent` in a command or context prompt, compare `turn.docVersion` against
`session.currentDocVersion`. If they differ, include a note: *"The document was modified by
the user after this action."* If the text itself is not found via anchoring, note that it no
longer exists.

### 9.2 Context construction per call

Context is always built fresh from the live editor state plus the session log. No stale
snapshots are ever passed to the API.

**Inline context** (cursor-focused, ~1500 tokens):
- Document title, word count, language
- Two paragraphs before cursor + current paragraph
- Current selection if any
- Last 3 accepted AI turns (userRequest, afterContent, docVersion delta note if applicable)

**Panel context** (full document, ~4000 tokens):
- All inline context fields
- Full document as plain text (truncated at limit)
- Last 10–20 panel turns

### 9.3 AI action schema

```typescript
type AiAction =
  | { type: 'insert_at_cursor'; content: string }
  | { type: 'replace_selection'; content: string }
  | { type: 'set_title'; content: string }
  | { type: 'annotate'; range: string; comment: string }   // panel only
  | { type: 'read_back'; target: 'selection' | 'last_paragraph' }  // panel only
  | { type: 'speak' }
  | { type: 'none' }

type AiResponse = {
  speech:          string    // always present; TTS if ttsEnabled
  action:          AiAction
  requiresConfirm: boolean   // true for replacements and insertions > 30 words
  explanation:     string    // shown in dock status
}
```

### 9.4 Confirmation and provenance

If `requiresConfirm` is true: text is staged, Accept/Discard chips appear in the dock,
and `turn.accepted` remains `null` until resolved. If false: action applies immediately
and `turn.accepted` is set to `true`.

AI-inserted text receives a `AiHighlight` Tiptap decoration (not a persistent mark):
a purple left border (`border-left: 2px solid #7F77DD`). Auto-fades after 4 seconds
if not pending confirmation. Accept: remove decoration, leave text.
Discard: `deleteRange()`, remove decoration, mark `turn.discardedAt`.

### 9.5 Inline vs panel session scope

| | Inline session | Panel session |
|---|---|---|
| Context size | ~1500 tokens | ~4000 tokens |
| Turns kept | last 3–5 | last 10–20 |
| Persisted | no (React state only) | optional (ai_sessions table) |
| Survives navigation | no | yes (if persisted) |
| Available actions | insert, replace, set_title, speak | all including annotate, read_back |

### 9.6 "Do it again" resolution

With the session log in context, the model can handle the full range of continuation requests:

| Request | Resolution |
|---|---|
| "do it again" | Repeat last action's transform on current cursor context |
| "do it again to the next paragraph" | Same transform, different target |
| "actually make it even simpler" | Uses `afterContent` from last turn as new input |
| "undo what you just did" | Reads `beforeContent`, replaces `afterContent` range |
| "restore the last one" | Re-inserts most recently discarded turn's `afterContent` |

---

## 10. Authentication

Auth.js v5 credentials provider. Email + bcrypt (12 rounds). JWT session, 7-day expiry.

Roles:
- `editor`: create/read/update/delete own documents; manage own shares; change own settings.
- `admin`: all of the above plus user management (create, deactivate, change roles) and
  access to instance-level settings.

Route protection via Next.js middleware: all `/app/*`, `/api/documents/*`, `/api/folders/*`,
`/api/shares/*`, `/api/ai/*` require a valid session. `/api/health` and share token
resolution (`/api/shares/link?token=…`) are public.

First-run: `npm run db:seed` creates the initial admin user from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` env vars. Idempotent.

---

## 11. Deployment

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | yes | — | JWT signing secret |
| `NEXTAUTH_URL` | yes | — | Public URL of the app |
| `ANTHROPIC_API_KEY` | yes | — | Anthropic API key |
| `ADMIN_EMAIL` | seed only | — | First admin user email |
| `ADMIN_PASSWORD` | seed only | — | First admin user password |
| `COMMAND_TRIGGER_DEFAULT` | no | `"Computer"` | Instance default command trigger |
| `AI_TRIGGER_DEFAULT` | no | `"Assistant"` | Instance default AI trigger |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | no | — | Share invite emails |

### Docker

```yaml
# docker-compose.yml
services:
  app:
    build: .
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://voicedoc:${DB_PASSWORD}@db:5432/voicedoc
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      db: { condition: service_healthy }
    ports: ["3000:3000"]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      retries: 3

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: voicedoc
      POSTGRES_USER: voicedoc
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U voicedoc"]
      interval: 10s
      retries: 5

volumes:
  pgdata:
```

Migrations run automatically on app startup via `lib/db/migrate.ts` (Drizzle `migrate()`),
called from `instrumentation.ts` before the server begins serving traffic.

---
---

# Phased TODO

Each phase is independently deployable and builds strictly on the previous one.
Phases 1–4 have no dependency on the Anthropic API.

---

## Phase 1 — Project scaffold

> Goal: runnable skeleton, CI passing, Docker building.

1. Initialise Next.js 15 project: `npx create-next-app@latest --app --ts --eslint`. Verify `"type": "module"` in `package.json`.
2. Install Drizzle ORM + `drizzle-kit` + `postgres` driver. Add `drizzle.config.ts` pointing to `lib/db/schema.ts`.
3. Write `lib/db/schema.ts`: `users`, `folders`, `documents`, `document_versions`, `shares` tables with all columns from spec section 3.
4. Write `lib/db/index.ts`: singleton postgres client from `DATABASE_URL`.
5. Write `lib/db/migrate.ts`: calls Drizzle `migrate()`. Import in `instrumentation.ts` so it runs before traffic is served.
6. Generate initial migration: `npx drizzle-kit generate`. Commit the migration file.
7. Write `lib/env.ts`: zod schema validating all required env vars. Throw on startup if any are missing. Import early in `instrumentation.ts`.
8. Write `Dockerfile`: multi-stage, `node:20-alpine`, `npm ci --omit=dev`, `next build` with `output: 'standalone'`, runner stage, non-root user `nextjs:nodejs`, expose 3000.
9. Write `docker-compose.yml` per spec section 11: app + postgres with health checks and named volume.
10. Write `docker-compose.override.yml`: exposes DB on `5432`, mounts source for hot reload, sets `NODE_ENV=development`.
11. Write `.env.example` with all variables from spec section 11.
12. Write `app/api/health/route.ts`: `GET` pings the database, returns `{ status, version, db }`. Returns `503` if DB unreachable.
13. Configure ESLint with `@typescript-eslint` + import-order rule enforcing ESM paths. Add `prettier` with consistent config.
14. Add GitHub Actions workflow: `lint`, `typecheck`, `build` jobs on push to `main`. Cache `node_modules`.

---

## Phase 2 — Auth & user management

> Goal: login works; admin can manage users; settings page exists.

1. Install `next-auth@beta` (v5). Write `auth.ts` with credentials provider: find user by email, verify bcrypt hash, return `{ id, name, email, role }` in session.
2. Write `middleware.ts`: protect `/app/*`, `/api/documents/*`, `/api/folders/*`, `/api/shares/*`, `/api/ai/*`, `/api/users/*`. Redirect unauthenticated to `/login`.
3. Build `/login` page: email + password form, error state, `signIn()` call, redirect to dashboard on success. Touch targets ≥ 44 px.
4. Write `npm run db:seed`: creates admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Idempotent (skip if email exists). Uses bcrypt round 12.
5. Write `lib/auth/session.ts`: `getRequiredSession()` helper — throws `401` if no session; returns typed `{ userId, role }`. Use in every API route.
6. Write `GET /api/users` (admin only): list all users with id, name, email, role, created_at.
7. Write `POST /api/users` (admin only): create user with name, email, hashed password, role.
8. Write `PATCH /api/users/[id]` (admin only): update role or set `deactivated_at`.
9. Build `/app/admin` page: user list table, create-user form, deactivate button per row. Guard with role check in `page.tsx`.
10. Build `/app/settings` page stub: form with name, language selector (`en-US`, `fi-FI`, `sv-SE`), hold-to-talk toggle, `viewFontSize` selector, command trigger, AI trigger, TTS enabled, TTS voice. Save via `PUT /api/users/[id]/settings`.
11. Write `PUT /api/users/[id]/settings`: validate with zod, update `settings` jsonb, return updated settings.
12. Add logout button in a shared topbar component. Display name and role badge.
13. Write vitest integration test: valid login returns session cookie; wrong password returns 401.

---

## Phase 3 — Document CRUD & editor core

> Goal: documents can be created, edited, and auto-saved; Tiptap renders.

1. Install Tiptap: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-character-count`.
2. Build `VoiceEditor.tsx`: initialise Tiptap with `StarterKit`, `Placeholder`, `CharacterCount`. Accept `initialContent` and `onUpdate` props. Set `--vd-font-size` CSS custom property from user settings on mount.
3. Build `Toolbar.tsx`: Bold, Italic, Underline, H1/H2/H3, Normal, Bullet list, Ordered list, Blockquote, Code, Undo, Redo. Wire each to `editor.chain()`.
4. Build `FontSizeControls.tsx`: `[ − ][ M ][ + ]` button group in the editor topbar. Reads `viewFontSize` from settings context. Updates CSS custom property on the editor wrapper immediately. Persists via `PUT /api/users/[id]/settings` debounced 500 ms.
5. Add `Cmd+=` / `Cmd+−` keyboard shortcuts in `VoiceEditor` for font size, matching toolbar buttons.
6. Write `GET /api/documents`: return user's own documents plus accepted shares, `{ id, title, word_count, updated_at, folder_id, shared_by? }` ordered by `updated_at DESC`.
7. Write `POST /api/documents`: create with empty content. Accept optional `folder_id`. Return new document.
8. Write `GET /api/documents/[id]`: return full document. Also return if user has a `shares` row for it. Return `403` otherwise.
9. Write `PUT /api/documents/[id]`: update `title`, `content`, `word_count`, `updated_at`. `403` if not owner or editor-share.
10. Write `DELETE /api/documents/[id]`: delete document + versions + shares. Owner only.
11. Build `/app/document/[id]`: load document, render `VoiceEditor`. Inline-editable title in topbar (updates on blur). Back button → dashboard.
12. Implement auto-save: debounce 2 s after last `onUpdate`. Show "Saved" / "Saving…" / "Unsaved" badge.
13. Snapshot on every 10th auto-save: insert `document_versions` row. Prune to last 20 per document in same transaction.
14. Show word count in toolbar right side from `CharacterCount`.

---

## Phase 4 — Dashboard, folders & sharing

> Goal: dashboard is fast to navigate; folders work; share modal is complete.

1. Build `/app/dashboard` page layout: topbar (logo, settings icon, user pill), full-width "New document" button (72 px tall, dashed border), Recent section, All documents section, Shared with me section.
2. Build `DocumentRow.tsx`: 72 px min-height, title (15 px weight 500), relative edit time + word count (11 px muted), share icon button (44 × 44 px tap target) at right edge.
3. Populate Recent section: top 5 documents from `GET /api/documents` sorted by `updated_at`, rendered as `DocumentRow` components. No folder grouping — flat, fast to scan.
4. Write `GET /api/folders`: return user's folders with document counts.
5. Write `POST /api/folders`: create folder with name.
6. Write `PUT /api/folders/[id]`: rename.
7. Write `DELETE /api/folders/[id]`: delete folder; documents become unfiled (ON DELETE SET NULL).
8. Build `FolderAccordion.tsx`: folder row (64 px min-height, folder icon, name, count, chevron). Click toggles children open/closed inline. Max one open at a time. Folder icon swaps to `ti-folder-open`. Children are `DocumentRow` components at slightly reduced padding.
9. Render All documents section: list of `FolderAccordion` components then unfiled documents as flat `DocumentRow` list. "New folder" button at bottom of section.
10. Render Shared with me section: documents where `shares.shared_with = userId`. Info-colour file icon. Meta shows sharer name and permission level.
11. Build `ShareModal.tsx` with three panels: Invite (email input + permission + Send), Copy link (token URL + permission + Copy button), People with access (owner + shares list with Remove buttons).
12. Wire `GET /api/documents/[id]/share`: return current shares for a document.
13. Wire `POST /api/documents/[id]/share`: create direct invite share. Resolve email to user id. If user not found and SMTP configured, send invite email with registration link.
14. Wire `DELETE /api/documents/[id]/share` with share id param: revoke a specific share.
15. Wire `POST /api/shares/link`: create or return existing link share for a document. Returns `{ token, url }`.
16. Wire `GET /api/shares/link?token=`: public endpoint, resolves token to document id, returns minimal document metadata and permission. Used by the editor to load a shared document without an authenticated session.

---

## Phase 5 — Voice dictation pipeline

> Goal: push-to-talk works; speech flows to cursor; punctuation normalises.

1. Write `hooks/useSpeechRecognition.ts`: wraps `window.SpeechRecognition` with `continuous: true`, `interimResults: true`. Exposes `start()`, `stop()`, `pause()`, `resume()`, `onInterim(text)`, `onFinal(text)` callbacks.
2. Read `language` from user settings context; pass as `recognition.lang`. Reload when settings change without page reload.
3. Read `holdToTalk` from settings; switch mic button between click-to-toggle and mousedown/mouseup behaviour accordingly.
4. Build `VoiceDock.tsx`: mic button (teal active state), AI button (purple, sparkle icon, placeholder), transcript area (live interim text + label), `TriggerChip`, language selector, status text.
5. Display interim results in the transcript area as italic muted text while the user speaks. Replace with final result on commit.
6. Commit final `onFinal` results via `editor.commands.insertContent()` at cursor.
7. Write `lib/voice/punctuation.ts`: spoken-word → symbol map. Apply to final results before commit via case-insensitive word-boundary regex pass.
8. Handle `"new line"` → insert `\n`; `"new paragraph"` → `editor.commands.splitBlock()`.
9. Track last-dictated range: after each commit store `{ from: editor.state.selection.from - text.length, to: editor.state.selection.from }` in session state.
10. Handle `SpeechRecognition` errors: `not-allowed` → show microphone permission error in dock with link to browser settings; `no-speech` → silent timeout, keep session alive; `network` → show retry button; `aborted` → auto-restart.
11. Animate a subtle ring pulse on the mic button while listening. Apply amber outline while paused.
12. On explicit stop or page unload: `recognition.stop()`, clear interim display, reset to idle state.

---

## Phase 6 — Command system

> Goal: `"Computer, [command]"` correctly executes all editor operations.

1. Write `lib/voice/commands.ts`: `parseTriggers(text, commandTrigger, aiTrigger)` returns an ordered array of `{ type: 'text' | 'command' | 'ai', content: string }` segments. Handle multiple triggers in one utterance sequentially.
2. Pipe each `onFinal` result through `parseTriggers` in `VoiceDock`. Dispatch in order: text → insert, command → `executeCommand`, ai → Phase 8 stub.
3. Write `executeCommand(command: string, editor: Editor, session: AiSession): boolean`. Returns `true` if matched, `false` if unknown. Log unmatched commands to dock status area.
4. Implement deletion: `delete word`, `delete sentence`, `delete paragraph`, `delete selection`, `delete that` (uses `lastDictatedRange`), `delete line`.
5. Implement `clear document` with two-step confirmation: stage warning in dock; second `"confirm"` command within 5 s executes.
6. Implement undo / redo.
7. Implement selection: `select word`, `select sentence`, `select paragraph`, `select all`.
8. Implement navigation: `go to start`, `go to end`, `beginning of paragraph`, `end of paragraph`, `next paragraph`, `previous paragraph`, `find [text]`.
9. Implement formatting: `bold`, `italic`, `underline`, `heading [1-3]`, `normal text`, `bullet list`, `numbered list`, `blockquote`, `code`, `code block`.
10. Implement document commands: `save`, `new document`, `set title [text]`, `print`.
11. Implement mic control: `stop`, `pause`, `resume`.
12. Show amber command badge in transcript area when command mode detected. Apply amber border to mic button during command execution. Return to teal on completion.
13. Write `lib/voice/help.ts`: all commands grouped by category with descriptions and example utterances. Categories: navigation, editing, formatting, document, AI, triggers.
14. Write unit tests (vitest) for `parseTriggers`: plain text, single command, AI trigger, multiple triggers interleaved, unknown command pass-through.

---

## Phase 7 — Trigger management & help

> Goal: session trigger override works; help command opens the overlay.

1. Load `commandTrigger` and `aiTrigger` from settings context into `useSpeechRecognition` and `parseTriggers` on mount. Re-read on settings save without page reload.
2. Parse `"change trigger to [word]"` in `executeCommand`: extract word, set `temporaryTrigger` in session state, update active trigger in the recognition hook immediately.
3. Build `TriggerChip.tsx`: shows active command trigger. Override active → amber pill with `×` reset. No override → neutral pill. Click (no override) opens inline text input.
4. Wire `×` button and `"reset trigger"` command to clear `temporaryTrigger`.
5. Persist `temporaryTrigger` in `sessionStorage`. Restore on page reload within same tab.
6. Show AI trigger as a secondary non-editable label in the dock's tooltip (accessible via long-press or hover). No voice override path for AI trigger.
7. Implement `"help"` command: TTS reads category names if `ttsEnabled`; open `HelpOverlay`.
8. Implement `"help [category]"` command: open overlay pre-filtered to that category.
9. Build `HelpOverlay.tsx`: full-height drawer in normal flow (no `position: fixed`). Sections per category. Shows both current triggers and session override status. Keyboard shortcut reference column.
10. Add `Cmd+/` (`Ctrl+/`) keyboard shortcut to toggle overlay.
11. Add `?` icon button in editor topbar as non-voice fallback to open overlay.
12. Add a `"help"` entry in `help.ts` itself ("say '[trigger], help' to open this panel").
13. Update settings page: display both trigger fields with instance default shown as placeholder. Add note explaining session override.

---

## Phase 8 — AI session model & inline mode

> Goal: `"Assistant, [request]"` works during dictation; AI writes into the document; session log is maintained.

1. Write `lib/ai/session.ts`: `AiTurn` and `AiSession` types. Helper functions: `resolveAiTurnByPosition(position, session)` (maps 'last'/'previous'/'second'/'third' to a turn, skipping discarded), `recordTurn(session, turn)`, `markAccepted(session, turnId)`, `markDiscarded(session, turnId)`.
2. Write `lib/ai/session.ts`: `resolveAiTurnRange(turn, editor)` — text-anchor search using `turn.afterContent.trim().slice(0, 60)` against `editor.getText()`, mapped to `{ from, to }` via `textOffsetToRange(editor, offset, length)`.
3. Write `textOffsetToRange(editor, offset, length)`: walks `editor.state.doc` using `nodesBetween` to convert a plain-text offset to ProseMirror `{ from, to }`. Handle block node boundaries (+1 per block).
4. Initialise `inlineAiSession` in `VoiceEditor` state. Increment `session.currentDocVersion` on every Tiptap `onUpdate` event.
5. Write `lib/ai/context.ts`: `buildInlineContext(editor, session, selection)` — cursor paragraph + two preceding + title + word count + language + selection + last 3 accepted turns with docVersion delta note if `currentDocVersion !== turn.docVersion`.
6. Write `lib/ai/prompts.ts`: inline system prompt. Instructs the model to respond with `AiResponse` JSON only. Includes full action schema, `requiresConfirm` rules, available action types.
7. Write `POST /api/ai/inline/route.ts`: validate session, build context, call `claude-sonnet-4-6`, parse JSON, return `AiResponse`. Rate limit: 60 requests/user/hour (in-memory `Map`; return `429` with `Retry-After`).
8. Dispatch AI-trigger segments from `parseTriggers` to `executeAiInline(content, editor, session)`. Show "AI thinking…" in dock status during request.
9. Implement `insert_at_cursor`: if not `requiresConfirm`, `editor.commands.insertContent()` + `recordTurn()` with `accepted: true`. If `requiresConfirm`, stage with decoration + show Accept/Discard chips.
10. Write `AiHighlight.ts`: Tiptap `Decoration` plugin. Purple left-border class on staged range. Auto-clear after 4 s if not pending. Accept: remove decoration, `markAccepted()`. Discard: `deleteRange()`, `markDiscarded()`.
11. Implement `replace_selection`: stage replacement, show Accept/Discard. Accept applies; Discard restores original.
12. Implement `set_title`: update title field, always `requiresConfirm: true`.
13. Implement `speak`: `SpeechSynthesisUtterance` from `response.speech`, using `ttsVoice` setting.
14. Show `response.explanation` in dock status for 5 s after execution. Apply purple pulse ring to mic button while request is in flight.

---

## Phase 9 — AI-referencing voice commands

> Goal: `"Computer, delete/bold/undo the last assistant edit"` works reliably.

1. Add AI-referencing command pattern to `executeCommand`: regex matching `(operation) [the] (last|previous|second|third) (assistant|AI) (edit|change|addition|insertion)`.
2. Implement `select the last assistant edit`: call `resolveAiTurnByPosition` then `resolveAiTurnRange`; if range found, `editor.commands.setTextSelection(range)`.
3. Implement `go to the last assistant edit`: resolve range, move cursor to `range.from`.
4. Implement `delete the last assistant edit`: resolve range, `editor.commands.deleteRange(range)`, `markDiscarded()`.
5. Implement formatting commands on AI range: `bold`, `italic`, `underline`, `heading [N]` — resolve range, select it, apply the mark or node type.
6. Implement targeted undo (`undo the last assistant edit`): resolve range using `turn.afterContent`, `deleteRange()`, `insertContentAt(range.from, turn.beforeContent)`, `markDiscarded()`. This is distinct from `editor.commands.undo()` — it targets one specific edit regardless of what the user did after it.
7. Implement `restore the last assistant edit`: find the most recently discarded turn (`turn.discardedAt !== null`, most recent first), insert `turn.afterContent` at current cursor position, `markAccepted()`.
8. Implement `replace the last assistant edit`: resolve range, `setTextSelection(range)` — user then dictates replacement text over the selection.
9. Handle "range not found" case in all above commands: notify dock status area with spoken TTS message "That edit no longer exists in the document."
10. Handle "no AI turns" case: notify "No assistant edits have been made in this session."
11. Add all AI-referencing commands to `help.ts` under the "AI" category with example utterances.
12. Write vitest unit tests for `resolveAiTurnByPosition`: last, previous, second, third; all discarded; empty session.
13. Write vitest unit tests for `resolveAiTurnRange`: text present, text not present, partial match.

---

## Phase 10 — AI conversational panel

> Goal: the AI button opens a full-context chat panel; conversation persists across reloads.

1. Build `AiPanel.tsx`: conversation tray above dock in normal flow. CSS `max-height` transition. User bubbles (gray), AI bubbles (purple-tinted). TTS play button and Copy button per AI bubble.
2. Wire sparkle AI button to toggle `aiPanelOpen`. Pressing AI button while dictating switches voice routing to panel (mic stays active, output goes to panel as user messages).
3. Initialise `panelAiSession` in `VoiceEditor` state. Increment `currentDocVersion` on `onUpdate` (shared with inline session counter).
4. Write `lib/ai/context.ts` `buildPanelContext(editor, session)`: full document text truncated at 4000 tokens, all inline context fields, last 15 panel turns with delta notes.
5. Write `POST /api/ai/chat/route.ts`: receives context + history + new message. Streams response via `ReadableStream`. Parse JSON envelope at stream end to extract `action`.
6. Stream AI text into the panel bubble in real time. Execute `action` after stream completes.
7. Implement panel-only actions: `annotate` (add Tiptap comment mark to resolved text range), `read_back` (TTS reads selection or last paragraph).
8. Persist panel session to `ai_sessions` table on every new turn: `upsert` by `(document_id, user_id, mode='panel')`. Load on document open if a session exists.
9. Add "Clear conversation" button in panel header: clear React state + delete `ai_sessions` row.
10. Ensure mutual exclusivity: mic button shows teal (routing to editor) or purple (routing to panel). Switching between AI panel and dictation modes is seamless.
11. Add `POST /api/ai/chat` rate limit: 60 requests/user/hour, shared counter with inline endpoint.
12. Add "Copy response" icon button on each AI bubble.

---

## Phase 11 — Settings, Docker & deployment

> Goal: all settings are complete; Docker image builds cleanly; app is production-ready.

1. Complete `/app/settings` page: all fields from spec section 3 settings schema. TTS voice picker populated from `speechSynthesis.getVoices()` filtered to selected language. Session override status displayed if active with a "clear override" button.
2. Ensure settings changes propagate to active voice hook and font size CSS without page reload. Use a React context (`SettingsContext`) that `VoiceEditor` and `VoiceDock` both subscribe to.
3. Add instance-level defaults from `COMMAND_TRIGGER_DEFAULT` and `AI_TRIGGER_DEFAULT` env vars. New users inherit these. Settings page shows instance default as placeholder text when field is empty.
4. Write final `Dockerfile`: `node:20-alpine` builder, `npm ci --omit=dev`, `next build --output=standalone`, runner stage copying `.next/standalone`. Non-root user `nextjs:nodejs`. Expose 3000.
5. Complete `docker-compose.yml` per spec section 11: health checks on both services, named volume, `depends_on` with `condition: service_healthy`.
6. Add optional SMTP env vars to `docker-compose.yml` and `.env.example`. Write `lib/email.ts`: sends share invite emails using nodemailer if SMTP is configured; silently skips if not.
7. Write `docker-compose.override.yml`: DB port exposed, source mount, `NODE_ENV=development`, `NEXTAUTH_URL=http://localhost:3000`.
8. Write deployment `README.md`: clone, copy env, `docker compose up -d`, seed, first login, upgrade procedure (pull, rebuild, restart — migrations auto-run).
9. Add `Content-Security-Policy` header in `next.config.ts`: `connect-src 'self' api.anthropic.com`; `script-src 'self' 'nonce-...'`; `media-src 'self'`.
10. Implement rate limiting on all `/api/ai/*` routes using a shared in-memory `RateLimiter` class: `Map<userId, { count, resetAt }>`. Return `429` with `Retry-After` header. Note Redis as a future upgrade for multi-instance deployments.
11. Full end-to-end Docker test: build image, `compose up`, seed, create user, create folder, create document in folder, dictate, command, AI inline, AI panel, share document, verify share link works unauthenticated.
12. Write `CHANGELOG.md` with `v1.0.0` entry. Tag release in git.
