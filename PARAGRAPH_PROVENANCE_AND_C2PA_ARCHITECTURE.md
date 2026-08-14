# Paragraph-Level Provenance and C2PA Export Architecture

## Executive Summary

This document describes the design for integrating paragraph-level provenance tracking and C2PA (Coalition for Content Provenance and Authenticity) export/save functionality into the existing Dictator application. The implementation preserves the existing AI provenance infrastructure while adding stable paragraph identity, content hashing, and cryptographically verifiable C2PA manifests.

## 1. Existing Architecture Analysis

### 1.1 Current Provenance Model

**AI Turn Provenance** (`aiTurnProvenance` table):
- Tracks source: `'human-dictated' | 'human-written' | 'ai-generated' | 'ai-modified'`
- Stores confidence: `0-1` for AI-generated content
- Records content scope: `'full-document' | 'selected-text' | 'context-snippet'`
- Device, user, timestamp, policy reference
- Thinking content and budget tokens for extended thinking
- Review status (reviewedAt timestamp)

**AI Turn Model** (`AiTurn` type):
- `beforeContent`: state before AI transformation
- `afterContent`: state after AI transformation
- `docVersion`: document version at time of turn
- `acceptedAt`, `discardedAt`: user acceptance/rejection
- Embeds full `AiTurnProvenance` structure

**AI Sessions**:
- Document-scoped, per-user, per-mode (inline/panel)
- Track sequence of turns over document lifetime

### 1.2 Document Representation

**Storage**:
- Content stored as JSONB in `documents.content`
- Format: TipTap/ProseMirror JSON schema

**Editor**:
- TipTap (@tiptap/react v2.26.1)
- ProseMirror nodes and marks
- StarterKit includes undo/redo history

**Current Limitations**:
- No stable paragraph IDs
- No content hashing
- No cross-document paragraph linkage
- Copy/paste not integrated with provenance

### 1.3 Export Architecture

**Formats Implemented**:
- JSON: comprehensive metadata export
- Markdown: document with HTML-comment provenance annotations
- CSV: timeline of edits

**Current Approach**:
- AI history exported alongside content
- No C2PA manifest generation
- Format-specific, no common abstraction

### 1.4 What Exists That We Can Reuse

1. **AI Provenance Types**: `AiContentSource`, `AiRequestScope`, `AiTurnProvenance`
2. **AI Turn Tracking**: turn history with acceptance/rejection
3. **Export Pipeline**: format-specific handlers
4. **Version History**: document versions stored in `documentVersionSnapshots`
5. **Privacy Infrastructure**: existing types for telemetry, data deletion tracking
6. **Database Schema**: relationships and migrations established

## 2. Stable Paragraph Identity

### 2.1 Design

**Principle**: Paragraph identity is stable metadata within document content, not derived from position or content.

**Implementation**:
- Extend TipTap/ProseMirror node attributes
- Each paragraph node carries `id: string` (format: `p_<random-uuid>`)
- IDs survive:
  - Editing (content changes)
  - Reordering (move operations)
  - Copy/paste (creates new ID)
  - Undo/redo (preserved in history)

**Paragraph Definition**:
- TipTap paragraph nodes (heading, paragraph block elements)
- List items (li) if tracking item-level provenance is needed
- Code blocks, blockquotes, etc.

**Initialization**:
- New paragraphs: generate ID when node created
- Migration: on document load, assign IDs to paragraphs lacking them
- Consistency: ID never changes for same logical paragraph in same document

**Copy/Paste Semantics**:
```
original paragraph p_A
    ↓
copy operation
    ↓
pasted paragraph p_B (new ID)
    ↓
internal reference: p_B originates from p_A
```

### 2.2 Storage

**In-Document** (TipTap node):
```typescript
// ProseMirror node
{
  type: 'paragraph',
  attrs: {
    id: 'p_550e8400-e29b-41d4-a716-446655440000'
  },
  content: [{ type: 'text', text: 'Paragraph content' }]
}
```

**Database** (if needed for queries):
- `paragraph_provenances` table maintains paragraph-to-provenance mapping
- Allows efficient querying by paragraph ID
- Stores current content hash

### 2.3 TipTap Extension

Create `ParagraphIdentity` extension:
```typescript
// lib/tiptap/ParagraphIdentity.ts
export const ParagraphIdentity = Extension.create({
  name: 'paragraphIdentity',
  
  addAttributes() {
    return {
      id: {
        default: () => generateParagraphId(),
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({ 'data-id': attributes.id }),
      },
    }
  },
  
  onUpdate({ editor }) {
    // Ensure all paragraphs have IDs
    ensureParagraphIds(editor);
  },
});
```

## 3. Content Hashing

### 3.1 Canonicalization

**Goal**: Identical paragraph content always produces identical hash, regardless of internal representation.

**Canonical Form**:
1. Extract paragraph's text content (plaintext)
2. Normalize newlines: `\r\n` → `\n`, `\r` → `\n`
3. UTF-8 encoding
4. Unicode normalization (NFKC) for consistency
5. Trim only leading/trailing document-level whitespace, preserve internal
6. Empty paragraph: hash of empty string

**Example**:
```
Content: "  The service begins at 10.  "
Canonical: "The service begins at 10."
Hash: SHA-256(UTF-8 bytes)
```

**Rationale**:
- Plaintext ensures content equivalence regardless of markup (bold, italic, etc.)
- Normalization ensures consistency across platforms
- Hash represents the semantic content, not editor metadata

### 3.2 Implementation

```typescript
// lib/provenance/content-hashing.ts
import crypto from 'crypto';

export function canonicalizeContent(text: string): string {
  // Normalize newlines
  let canonical = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  
  // Unicode normalization (NFKC)
  canonical = canonical.normalize('NFKC');
  
  // Trim leading/trailing whitespace (but only at document boundaries)
  canonical = canonical.trim();
  
  return canonical;
}

export function hashContent(text: string): string {
  const canonical = canonicalizeContent(text);
  const hash = crypto
    .createHash('sha256')
    .update(canonical, 'utf8')
    .digest('hex');
  return hash;
}

export function verifyContentHash(text: string, expectedHash: string): boolean {
  return hashContent(text) === expectedHash;
}
```

### 3.3 When Hashing Occurs

1. **On Export**: hash current paragraph content
2. **On C2PA Generation**: include hash in manifest
3. **On Verification**: recompute hash and compare with manifest
4. **On Copy/Paste**: hash both source and destination to establish linkage

## 4. Paragraph-Level Provenance

### 4.1 Data Model

**Paragraph Provenance Event** (conceptual):
```typescript
interface ParagraphProvenanceEvent {
  // Stable reference
  paragraphId: string;
  
  // Content state
  contentHash: string;
  contentHashAlgorithm: 'sha256';
  
  // Event type and timing
  eventType: 'human-dictated' | 'human-edit' | 'ai-generation' | 'ai-modification' | 'human-acceptance' | 'human-rejection';
  timestamp: number;
  
  // Source information
  source: AiContentSource; // or more specific
  confidence?: number; // for AI-generated
  device: string;
  userId: string;
  
  // Related AI session (if applicable)
  aiSessionId?: string;
  aiTurnId?: string;
  
  // Change details
  previousHash?: string; // hash before this event
  selectionScope?: AiRequestScope;
  
  // Review/acceptance
  reviewedAt?: number;
  reviewedBy?: string;
}
```

**Paragraph Provenance History**:
```typescript
interface ParagraphProvenance {
  // Identity
  id: string; // UUID
  documentId: string;
  paragraphId: string;
  
  // Current state
  currentContentHash: string;
  currentContent?: string; // optional, for verification
  
  // History
  events: ParagraphProvenanceEvent[];
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}
```

### 4.2 Database Schema

```sql
CREATE TABLE paragraph_provenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  paragraph_id TEXT NOT NULL,
  current_content_hash TEXT NOT NULL,
  current_content TEXT, -- optional, for verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(document_id, paragraph_id)
);

CREATE TABLE paragraph_provenance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_provenance_id UUID NOT NULL REFERENCES paragraph_provenances(id) ON DELETE CASCADE,
  
  -- Event metadata
  event_type TEXT NOT NULL, -- 'human-dictated', 'human-edit', 'ai-generation', etc.
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Content state
  content_hash TEXT NOT NULL,
  previous_hash TEXT,
  content_hash_algorithm TEXT DEFAULT 'sha256',
  
  -- Source
  source TEXT NOT NULL, -- 'human-dictated', 'human-written', 'ai-generated', 'ai-modified'
  confidence NUMERIC(3, 2), -- 0-1 for AI content
  device TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- AI context (if applicable)
  ai_session_id UUID REFERENCES ai_sessions(id),
  ai_turn_id TEXT,
  selection_scope TEXT, -- 'full-document', 'selected-text', 'context-snippet'
  
  -- Review
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_paragraph_events_provenance ON paragraph_provenance_events(paragraph_provenance_id);
CREATE INDEX idx_paragraph_events_ai_session ON paragraph_provenance_events(ai_session_id);
```

### 4.3 Tracking Paragraph Changes

**On Human Edit**:
- Editor detects content change for paragraph p_A
- Compute new content hash
- Create `ParagraphProvenanceEvent` with type `'human-edit'`
- Update `paragraph_provenances.currentContentHash`

**On AI Generation**:
- AI turn generates/modifies text for paragraph p_A
- Create `ParagraphProvenanceEvent` with type `'ai-generation'` or `'ai-modified'`
- Link to `aiTurnProvenance` for full metadata
- Store confidence, scope, etc.

**On Copy/Paste**:
- Copy: select paragraph p_A
- Paste: creates new paragraph p_B
- Create event for p_B: type `'human-copy-paste'`, originFrom: `p_A`
- p_B gets new ID, is a separate entity
- Provenance chain: p_B originated from copy of p_A

## 5. C2PA Integration

### 5.1 C2PA Library

**Selection**: `c2pa-js` or `c2pa-node`
- Pure JavaScript implementation suitable for Node.js backend
- Supports JSON, Markdown, HTML, PDF manifests
- Cryptographic signing via external service

**Dependency**:
```json
{
  "@c2pa/sdk": "^1.0.0"
}
```

### 5.2 C2PA Manifest Structure

**Core Concept**:
```
C2PA Manifest
├── Claims
│   ├── Claim 1: "Generated by AI"
│   │   ├── Actions
│   │   │   ├── Action: "c2pa.generated"
│   │   │   │   ├── Textual Region (W3C selector)
│   │   │   │   └── Software Agent reference
│   │   │   └── Action: "c2pa.modified"
│   │   │       ├── Textual Region
│   │   │       └── Previous hash
│   │   └── Assertion: content hash
│   └── Claim 2: "Reviewed by Human"
│       ├── Action: "c2pa.reviewed"
│       └── Assertion: review timestamp
├── Content Binding (hash of exported document)
└── Signature (RSA-4096 or similar, server-signed)
```

### 5.3 Paragraph → C2PA Mapping

**For Each Paragraph with Provenance**:

1. **Extract Provenance Events**:
   - Filter events for paragraph in document version being exported
   - Group by event type (generation, modification, review)

2. **Create Textual Regions**:
   - Use W3C Web Annotation Fragment Selectors
   - For exported text, compute start/end positions
   - Create selector: `#char=start,end` for character range
   - Fallback: context-based selector if positions unstable

3. **Map to C2PA Actions**:
   ```typescript
   // For AI generation event
   {
     action: "c2pa.generated",
     softwareAgent: "dictator-ai",
     parameters: {
       model: "claude-3-opus",
       temperature: 0.7,
     },
     region: {
       name: "text",
       textRegion: "char=150,280"
     }
   }
   
   // For human review
   {
     action: "c2pa.reviewed",
     reviewer: { user_id: "..." },
     timestamp: "2024-08-14T10:00:00Z",
     region: {
       name: "text",
       textRegion: "char=150,280"
     }
   }
   ```

4. **Content Assertion**:
   - Hash entire exported document
   - Include in manifest content binding

### 5.4 API Endpoints

**Export with C2PA**:
```
POST /api/documents/:id/export-c2pa
{
  format: 'json' | 'markdown' | 'html' | 'pdf',
  includeHistory: boolean,
  paragraphFilter?: string[], // specific paragraphIds
  signingUrl?: string // trusted backend signing service
}

Response:
{
  format: string,
  content: Buffer,
  manifest: C2PAManifest,
  signingUrl: string // where client should send for signing
}
```

**Sign Manifest** (backend only, not in browser):
```
POST /api/documents/:id/sign-c2pa
{
  documentId: string,
  manifest: C2PAManifest,
  signingKey: { ... } // secured via environment
}

Response:
{
  signedManifest: string, // cryptographically signed
}
```

## 6. Export/Save Architecture

### 6.1 Single Pipeline

```
Document (with paragraph metadata)
        ↓
    [Export]
        ├─→ Select format (JSON/MD/HTML/PDF)
        ├─→ Serialize content
        ├─→ Extract paragraph provenances
        ├─→ Hash paragraphs
        ├─→ [Generate C2PA Manifest]
        │   ├─→ Create claims from provenances
        │   ├─→ Create textual regions
        │   ├─→ Bind to exported content
        │   └─→ Queue for signing
        ├─→ Package format-specific (sidecar, embedded, etc.)
        └─→ Return to caller
```

### 6.2 Format-Specific Packaging

**JSON**:
- Single JSON file
- C2PA manifest embedded as field
- Content, metadata, provenance all together
- No sidecar needed

**Markdown**:
- Markdown content as main file
- C2PA manifest as sidecar `.c2pa.json`
- HTML comments preserve provenance hints

**HTML**:
- Investigate native C2PA embedding in HTML
- Use `<meta>` tags or separate manifest
- Fallback to sidecar if not supported

**PDF**:
- Investigate C2PA spec for PDF
- PDF has native metadata/XMP support
- May embed manifest in PDF metadata

### 6.3 Save vs. Export

**Save** (internal format):
- Updates `documents.content` with JSONB
- Preserves paragraph IDs
- Auto-save every 2 seconds (existing behavior)
- No C2PA at this stage (internal only)

**Export** (portable format):
- User-initiated action
- Generates C2PA manifest
- Queues for signing (backend)
- Returns downloadable file with embedded/sidecar manifest

## 7. Copy/Paste with Provenance

### 7.1 Mechanism

**Copy**:
1. User selects one or more paragraphs
2. Browser clipboard stores:
   - `text/plain`: normal text (interop)
   - `application/x-dictator-provenance`: JSON with paragraph metadata
3. JSON includes: paragraph IDs, hashes, minimal provenance

**Paste**:
1. Try to read `application/x-dictator-provenance` from clipboard
2. If available: new paragraphs get new IDs, origin links created
3. If not available: fall back to plain text (loses provenance)
4. Track paste event in paragraph provenance

**Implementation**:
```typescript
// On copy
async function copyWithProvenance(editor: Editor, selection: Selection) {
  const paras = extractSelectedParagraphs(editor, selection);
  const provenanceData = {
    source: 'copy-paste',
    paragraphs: paras.map(p => ({
      id: p.attrs.id,
      content: p.textContent,
      hash: hashContent(p.textContent),
      provenance: p.attrs.provenance, // summary
    })),
    timestamp: Date.now(),
  };
  
  // Store both text and metadata
  const text = paras.map(p => p.textContent).join('\n');
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': new Blob([text], { type: 'text/plain' }),
      'application/x-dictator-provenance': new Blob(
        [JSON.stringify(provenanceData)],
        { type: 'application/json' }
      ),
    }),
  ]);
}

// On paste
async function pasteWithProvenance(editor: Editor) {
  const items = await navigator.clipboard.read();
  let sourceProvenance = null;
  let text = '';
  
  for (const item of items) {
    if (item.types.includes('application/x-dictator-provenance')) {
      sourceProvenance = JSON.parse(
        await (item.getType('application/x-dictator-provenance')).text()
      );
    }
    if (item.types.includes('text/plain')) {
      text = await (item.getType('text/plain')).text();
    }
  }
  
  // Insert with new IDs, track origin
  if (sourceProvenance) {
    // Create new paragraphs with links to source
    insertPastedParagraphsWithProvenance(editor, text, sourceProvenance);
  } else {
    // Plain text paste
    insertPlainTextPaste(editor, text);
  }
}
```

## 8. Backward Compatibility

### 8.1 Migration Strategy

**On Load**:
- Check document version
- If old format (no paragraph IDs):
  - Auto-assign IDs to all paragraphs on first load
  - Create initial `ParagraphProvenance` records
  - Treat existing turns as historical events
  - Mark as migrated

**Existing Data**:
- AI turns continue to work as before
- Paragraph-level provenance builds on top
- No disruption to existing documents

### 8.2 Version Signaling

Add to `documents` schema:
```typescript
provenanceVersion: 'v0' | 'v1' // v0: no paragraph IDs, v1: with IDs
```

On save, upgrade to v1 if migrating.

## 9. Signing & Trust Boundary

### 9.1 Separation of Concerns

**Client-Side (Browser/Web)**:
- Generate content and metadata
- Compute hashes
- Construct C2PA claims
- Queue manifest for signing

**Backend (Trusted Environment)**:
- Hold private signing key
- Validate manifest format
- Apply cryptographic signature
- Return signed manifest

**Never in Browser**:
- Private signing key
- Key material
- Cryptographic signing operation

### 9.2 Implementation

**Flow**:
```
1. User clicks "Export with C2PA"
2. Browser generates manifest (unsigned)
3. Browser sends to /api/documents/:id/sign-c2pa
4. Backend validates manifest
5. Backend signs with HSM or secure key storage
6. Backend returns signed manifest
7. Browser embeds/packages in export
```

**Config**:
```env
C2PA_SIGNING_KEY_PATH=/secure/location/key.pem
C2PA_SIGNING_KEY_PASSWORD=...
C2PA_CERT_PATH=/secure/location/cert.pem
```

## 10. Testing Requirements

### 10.1 Unit Tests

**Paragraph Identity**:
- ✓ New paragraph gets ID
- ✓ Editing paragraph preserves ID
- ✓ Reordering preserves IDs
- ✓ Undo/redo preserves IDs

**Content Hashing**:
- ✓ Same content produces same hash
- ✓ Different content produces different hash
- ✓ Newline normalization is consistent
- ✓ Unicode normalization is consistent

**Provenance Events**:
- ✓ Event creation and linking
- ✓ Multiple events per paragraph
- ✓ Timestamp ordering
- ✓ AI session linkage

**Copy/Paste**:
- ✓ Copy preserves provenance metadata
- ✓ Paste creates new paragraph IDs
- ✓ Paste creates origin link
- ✓ Plain text paste still works

**C2PA Generation**:
- ✓ Manifest structure valid
- ✓ Claims created for AI-generated content
- ✓ Textual regions computed correctly
- ✓ Content binding hash computed

### 10.2 Integration Tests

**Export/Import Round-Trip**:
- Export document with C2PA
- Verify manifest structure
- Verify hashes match content
- (If signing implemented) Verify signatures

**Provenance Accuracy**:
- Create document with known history
- Verify provenance chain matches
- Verify all events recorded

## 11. Limitations & Future Work

### 11.1 Not Yet Implemented

1. **PDF Embedding**: C2PA PDF spec integration pending C2PA library support
2. **DOCX Support**: OOXML packaging pending
3. **Batch Export**: Multiple documents at once
4. **Incremental Signatures**: Signing only modified paragraphs
5. **AI Detection Claims**: C2PA can store "confidence" but not detect AI truthfully
6. **Cross-Document Verification**: Verifying paragraph origin across documents

### 11.2 Design Decisions

1. **Paragraph IDs not C2PA Selectors**: Internal stability prioritized over textual position
2. **Server Signing Only**: No production signing in browser
3. **Opt-in C2PA**: Export is explicit user action
4. **Format Flexibility**: Common pipeline but format-specific packaging

## 12. Security Considerations

### 12.1 What This Does NOT Do

- Does not detect AI text truthfully
- Does not prove a human wrote something
- Does not replace human judgment
- Hashes are for consistency verification, not authentication

### 12.2 What This DOES Do

- Records provenance events chronologically
- Makes events cryptographically verifiable via C2PA signing
- Allows verification that exported content hasn't been tampered
- Distinguishes AI-generated, AI-modified, and human-reviewed content
- Preserves history for audit and disclosure

## 13. Configuration & Deployment

### 13.1 Environment Variables

```
C2PA_ENABLED=true
C2PA_SIGNING_BACKEND_URL=https://internal-signer.example.com
C2PA_SIGNING_KEY_ID=prod-2024-08
PARAGRAPH_PROVENANCE_ENABLED=true
```

### 13.2 Database Migrations

Version the migrations:
- `0015_add_paragraph_identity_system.sql`
- `0016_add_paragraph_provenances_tables.sql`
- `0017_add_c2pa_manifest_storage.sql` (optional)

## 14. Documentation Artifacts

This architecture will be documented in:
- `PARAGRAPH_PROVENANCE_AND_C2PA_ARCHITECTURE.md` (this file)
- Code comments in key implementation files
- Tests as executable documentation
- Type definitions in TypeScript

---

## Appendix: Related Standards

- **C2PA 2.4 Spec**: https://c2pa.org/specifications/
- **W3C Web Annotation Data Model**: https://www.w3.org/TR/annotation-model/
- **Web Annotation Fragment Selectors**: https://www.w3.org/TR/selectors-api/
- **ProseMirror Schema**: https://prosemirror.net/docs/guide/
- **TipTap Documentation**: https://tiptap.dev/
