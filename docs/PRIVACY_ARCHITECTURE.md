# Dictator Privacy Architecture & Data Policy

**Version:** 1.0  
**Last Updated:** August 2024  
**Status:** Foundation Phase (Phase 1) Implementation

## Executive Summary

Dictator is built with **privacy-by-design** principles. User data remains on-device by default, with optional cloud AI processing under explicit user control. This document outlines how Dictator processes, protects, stores, and manages user data across all platforms.

---

## Table of Contents

1. [Core Privacy Principles](#core-privacy-principles)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Processing Inventory](#processing-inventory)
4. [Storage & Encryption](#storage--encryption)
5. [AI Provider Policies](#ai-provider-policies)
6. [Telemetry & Analytics](#telemetry--analytics)
7. [Data Retention](#data-retention)
8. [User Rights & Controls](#user-rights--controls)
9. [Security Measures](#security-measures)
10. [Compliance](#compliance)
11. [Incident Response](#incident-response)

---

## Core Privacy Principles

### 1. Local-First Processing
- Documents and voice data remain on-device by default
- Optional cloud AI processing only when explicitly requested by user
- User control: "Send Selected Text Only" vs "Send Full Document"
- No automatic transmission of data to third parties

### 2. Minimal Data Transmission
- Only selected text + necessary context sent to AI (not full document by default)
- User chooses scope per request: full document, selected text, or context snippet
- No background data transmission or sync without user knowledge

### 3. Explicit User Control
- Clear disclosure of what data goes where
- Provider policies displayed before each AI request
- Sensitivity warnings before sending potentially sensitive content
- User can opt-out, redact, or cancel before transmission

### 4. Transparent Policies
- Provider data policies documented and accessible
- Processing purpose, retention, and training usage clearly stated
- Regular policy updates communicated to users
- Machine-readable policy formats for automation

### 5. User Rights
- Full data export in standard formats
- Complete account deletion with cascade to AI providers
- Granular deletion control (document, session, or full account)
- Audit trail of all data access and deletion

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DICTATOR DATA FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

DEVICE LAYER (All Encrypted)
┌─────────────────────────────────────────────────┐
│  Microphone                                      │
│       ↓                                          │
│  [Local Speech-to-Text] (on-device STT only)   │
│       ↓                                          │
│  [Document Editor]                              │
│       ↓                                          │
│  Encrypted Local Storage (E2E Encrypted)       │
│  ├─ Documents Database (SQLite/Realm)          │
│  ├─ Encryption Keys (Android Keystore/OS)      │
│  └─ Version History & Metadata                 │
└─────────────────────────────────────────────────┘
          │                     │
          │ (User Action)       │ (User Action)
          ↓                     ↓
    ┌──────────────┐    ┌──────────────────┐
    │ Voice Enable │    │ Share & Sync     │
    └──────────────┘    └──────────────────┘
          │                     │
          │ [Optional]          │ [Optional]
          ↓                     ↓
┌──────────────────────────────────────────────┐
│  CLOUD/NETWORK LAYER (User Controlled)      │
│                                              │
│  AI Processing (Optional)                    │
│  ├─ Claude API → Anthropic (US)             │
│  ├─ OpenAI API → OpenAI (US)                │
│  ├─ Ollama → Local Network                  │
│  └─ Dictator API → On-Device Inference      │
│                                              │
│  Sync & Storage (Optional)                   │
│  └─ Cloud Sync → Encrypted End-to-End       │
└──────────────────────────────────────────────┘
          │
          │ [Pseudonymized]
          ↓
┌──────────────────────────────────────────────┐
│  ANALYTICS & MONITORING (Privacy-Safe)      │
│                                              │
│  Telemetry Service                           │
│  ├─ Pseudonymous User ID (HMAC-SHA256)      │
│  ├─ Operation Type & Duration                │
│  ├─ Token Counts & Model Used               │
│  ├─ Error Categories (not full errors)      │
│  └─ Platform & Version Info                 │
│                                              │
│  NO DATA:                                    │
│  ✗ Document content                         │
│  ✗ Prompts or responses                     │
│  ✗ User PII (emails, usernames)             │
│  ✗ Full error messages                      │
└──────────────────────────────────────────────┘
```

---

## Processing Inventory

| Stage | Data Type | Processing | Location | Retention | Encryption |
|-------|-----------|-----------|----------|-----------|-----------|
| **Input** | Voice | STT (optional) | Device/Cloud | Ephemeral | In-transit TLS |
| **Input** | Text | Direct input | Device | Until saved | At rest AES-256 |
| **Storage** | Documents | Indexing, versioning | Device | User-configured | AES-256-GCM |
| **Storage** | Metadata | Sync tracking | Device/Cloud | Until deletion | AES-256-GCM |
| **Processing** | Selected text | AI transformation | Cloud* | Per-provider policy | TLS + Provider policy |
| **AI Context** | Full document | Optional transmission | Cloud* | Per-provider policy | TLS + Provider policy |
| **Sync** | Changes | Merge, conflict resolution | Cloud* | Until synced | TLS + E2E encryption |
| **Backup** | Documents | Cloud storage | Cloud* | User-configured | AES-256 |
| **Telemetry** | Metrics | Aggregation | Analytics server | 90 days default | TLS |

**Legend:** Cloud* = Only if user explicitly enables, with user control over what's sent

---

## Storage & Encryption

### Device Storage (All Platforms)

#### Web (Browser)
- **Location:** IndexedDB, LocalStorage (with encryption wrapper)
- **Encryption:** Browser Web Crypto API (AES-256-GCM)
- **Key Storage:** Browser local encryption keys (not synced)
- **Clearing:** User can clear all data via browser settings

#### Android
- **Location:** SQLite (Realm), SharedPreferences, Files
- **Encryption:** Android Keystore-backed keys (device-specific)
- **Key Storage:** Android Keystore (cryptographically protected)
- **Clearing:** User can clear app data via Settings; keystore cleared on factory reset
- **Backup:** Encryption keys NEVER included in Android backups

#### Future: iOS
- **Location:** Core Data, Keychain
- **Encryption:** iOS Secure Enclave-backed keys
- **Key Storage:** Keychain (cryptographically protected)
- **Clearing:** User can clear app data; keychain cleared on device wipe
- **Backup:** Keys excluded from iCloud backup

### Cloud Storage (Optional, User-Controlled)

#### Encrypted Sync
- **Transport:** TLS 1.3+
- **End-to-End:** AES-256-GCM with device-specific keys
- **Data:** Documents, metadata, sync history
- **User Control:** Can disable, clear, or choose sync scope

#### AI Provider APIs
- **Transport:** Provider-specific (typically TLS 1.3+)
- **Retention:** Per-provider policy (30-90 days typical)
- **Training:** User opt-out available for supported providers
- **User Control:** Can select provider, review policy, choose content scope

---

## AI Provider Policies

### Supported Providers

| Provider | Processing Location | Training Data | Retention | GDPR | Privacy Rating |
|----------|-------------------|-------------|-----------|------|---------|
| **Claude (Anthropic)** | US | ❌ Not used | 30 days | ✅ Yes | 🟢 95/100 |
| **OpenAI** | US | ✅ Opt-out available | 30 days | ✅ Yes | 🟡 75/100 |
| **Ollama** | On-Device | ❌ N/A | N/A | ✅ Yes | 🟢 100/100 |
| **Dictator (Local)** | On-Device | ❌ N/A | N/A | ✅ Yes | 🟢 100/100 |

### Policy Tracking

Each AI request stores:
1. **Policy ID:** Which provider policy version was active
2. **Scope:** What content was sent (full/selected/context)
3. **Retention:** How long provider will keep data
4. **Training:** Whether data is used for model training
5. **Timestamp:** When policy was active

---

## Telemetry & Analytics

### Privacy-Safe Telemetry

All telemetry uses pseudonymous user IDs created with HMAC-SHA256:
```
pseudonymousUserId = HMAC-SHA256(serverSecret, canonicalUserId)
```

### Allowed Telemetry Events

✅ Operation type (document_edit, ai_request, sync_completed)  
✅ AI model used (not document content)  
✅ Latency metrics (milliseconds)  
✅ Token counts (if applicable)  
✅ Error categories (not full error messages)  
✅ Platform & version info

### Forbidden Data

❌ Document content  
❌ Prompts or AI responses  
❌ User PII (emails, usernames, phone numbers)  
❌ Sensitive data (API keys, passwords, credit cards)  
❌ Full error messages with stack traces  
❌ User identifiers (UUIDs linked to accounts)  

### Data Handling

- **Transmission:** Batched, HTTPS only, server-side validation
- **Storage:** Encrypted at rest, pseudonymized user IDs
- **Retention:** 90 days default, older data automatically deleted
- **Access:** Limited to privacy-conscious analytics team
- **Opt-out:** Users can disable telemetry in Settings

---

## Data Retention

### User Data

| Data Type | Default Retention | User Control |
|-----------|------------------|--------------|
| Document Content | Until deletion | User can delete anytime |
| Document Versions | Per-user setting | Configurable history depth |
| AI Sessions | Until deletion | User can clear per-document |
| Sync Metadata | Until deletion | Cleared with document deletion |
| Authentication Tokens | Until expiry/logout | Auto-expires, user can revoke |
| Deleted Records (Audit) | 90 days | Legal hold available |

### Provider Data

| Provider | Retention | Control | Notes |
|----------|-----------|---------|-------|
| Claude API | 30 days | N/A | Anthropic policy |
| OpenAI API | 30 days | Opt-out | Organization-level opt-out available |
| Ollama | None | N/A | Local processing only |
| Dictator API | None | N/A | On-device only |

### Telemetry Data

- **Aggregated Metrics:** 2 years (anonymized, no user link)
- **Detailed Logs:** 90 days (pseudonymized)
- **Raw Events:** 30 days (server-side filtered)

---

## User Rights & Controls

### Data Access

Users can:
- ✅ View all documents in Dictator
- ✅ Export documents with full provenance metadata
- ✅ Download all personal data in ZIP format (GDPR/CCPA)
- ✅ View privacy audit log of all access
- ✅ See AI request history with policies used

### Data Deletion

Users can:
- ✅ Delete individual documents
- ✅ Delete specific AI sessions
- ✅ Delete all data from specific provider
- ✅ Full account deletion with cascade
- ✅ Opt-out of cloud backup
- ✅ Securely erase encryption keys

### Data Portability

Users can:
- ✅ Export documents as .txt, .md, .docx, .pdf
- ✅ Export with provenance metadata (JSON-LD)
- ✅ Export AI session history
- ✅ Export all settings and preferences

### Privacy Preferences

Users can configure:
- **AI Provider:** Choose preferred provider, fallback options
- **Content Scope:** Default to selected text vs full document
- **Backup Policy:** Never, local-only, encrypted cloud, unencrypted
- **Telemetry:** Enable/disable, granular event types
- **Sensitive Detection:** Enable/disable content scanning
- **Training Data:** Opt-out of model training where available

---

## Security Measures

### Encryption Standards

- **Data at Rest:** AES-256-GCM
- **Data in Transit:** TLS 1.3+
- **Key Exchange:** ECDH-P256
- **Authentication:** HMAC-SHA256 or provider-specific

### Key Management

**Device Keys:**
- Generated on-device, never transmitted
- Backed by platform-specific secure storage:
  - Android: Keystore with TEE
  - iOS: Secure Enclave
  - Web: Derived from password with PBKDF2

**Key Rotation:**
- Automatic: Every 90 days (configurable)
- Manual: User can request immediate rotation
- Old keys retained for 30 days to decrypt old data

### Access Control

- **Authentication:** Email + password, with optional 2FA
- **Authorization:** User owns only their own data
- **Server-Side:** Role-based access control (admin, editor)
- **API Keys:** Rate limited, logged, rotatable

### Audit Logging

All sensitive operations logged:
- Document creation, modification, deletion
- Data exports and downloads
- Provider API calls and consent changes
- Account settings changes
- Failed authentication attempts
- Data deletion requests

---

## Compliance

### GDPR

✅ **Lawful Basis:** Legitimate interest + consent for optional features  
✅ **Data Processing:** Documented in Data Processing Agreement  
✅ **User Rights:** Right to access, delete, portability, object  
✅ **Privacy Policy:** Clear, transparent, plain language  
✅ **DPO:** Data Protection Officer available for inquiries  
✅ **Data Breaches:** 72-hour notification requirement  

### CCPA (California Privacy Rights Act)

✅ **Disclosure:** Privacy policy details all data collection  
✅ **User Rights:** Access, delete, opt-out of sale (no sale occurs)  
✅ **Non-Discrimination:** No price/service changes for exercising rights  
✅ **Requests:** User can submit via Settings or privacy@dictator.app  

### PIPEDA (Canada)

✅ **Consent:** Obtained for all data collection  
✅ **Access:** Users can request all personal information  
✅ **Correction:** Users can request data corrections  
✅ **Accuracy:** Data kept accurate and up-to-date  

### Data Localization

Dictator supports data localization requirements:
- **US Data:** Default processing location
- **EU Data:** Optional EU-based processing and storage
- **User Choice:** Can configure provider and storage region

---

## Incident Response

### Data Breach Protocol

1. **Detection:** Continuous monitoring, user reports
2. **Assessment:** Severity, scope, affected data (< 1 hour)
3. **Containment:** Isolate compromised systems (immediate)
4. **Notification:** Users within 72 hours of discovery
5. **Remediation:** Fix vulnerability, deploy patch
6. **Communication:** Transparent disclosure of incident
7. **Documentation:** Root cause analysis and learnings

### User Notification

In case of data breach affecting personal data:
- **Email:** Direct notification to user email
- **In-App:** Prominent notification in Dictator
- **Public:** Blog post with details and remediation steps
- **Support:** Dedicated support team for affected users

### Security Incident Classes

| Severity | Impact | Response Time | Notification |
|----------|--------|----------------|--------------|
| **Critical** | Encryption broken, keys leaked | < 1 hour | < 24 hours |
| **High** | Auth bypassed, data exposed | < 6 hours | < 72 hours |
| **Medium** | Privacy control bypassed | < 24 hours | < 2 weeks |
| **Low** | Non-sensitive data exposure | < 1 week | Via blog |

---

## Privacy by Design Features

### 1. Sensitive Data Detection

Built-in scanner detects:
- Credit card numbers
- Social Security Numbers
- API keys and auth tokens
- Password fields
- Email addresses
- Phone numbers
- Database connection strings
- Private key files

Warns user before sending sensitive data to cloud AI.

### 2. Provenance Tracking

Every AI-assisted edit includes:
- Source: human-dictated, human-written, AI-generated, AI-modified
- Confidence: 0-1 score for AI content
- Policy: Which provider policy was used
- Review Status: Has user explicitly reviewed?
- Device: Which device made the change
- Timestamp: When the change was made

### 3. Content Scope Control

Users choose what to send to AI:
- Full Document: Include all document context
- Selected Text: Only the highlighted portion
- Context Only: Selected text + N surrounding paragraphs

Dictator tracks scope for each request.

### 4. Ephemeral Requests

Users can mark AI requests as ephemeral:
- Requests deleted after user accepts or discards
- AI provider notified if supported
- Reduces cloud data retention
- Useful for sensitive or temporary content

### 5. Human Editorial Control

Extends beyond auto-accept:
- Explicit "Mark as Reviewed" action
- Audit trail: who reviewed, when, with what changes
- Only require disclosure if NOT reviewed
- Changes audit policy interpretation

### 6. Machine-Readable Policies

Export formats include:
- JSON-LD provenance metadata
- Structured policy information
- Timeline of all AI modifications
- Attribution and confidence scores
- Suitable for compliance tools

---

## Implementation Status

### Phase 1: Foundation (✅ In Progress)
- [x] Privacy types and interfaces
- [x] Telemetry service (privacy-safe)
- [x] Sensitive data detector
- [x] Provider policy manager
- [x] Database schema for provenance
- [x] AI provider policy methods
- [x] Android backup rules

### Phase 2: Core Features (⏳ Next)
- [ ] Sensitive data warning dialog
- [ ] AI data policy display
- [ ] Provenance tracking UI
- [ ] Backup/deletion UI
- [ ] Privacy settings panel

### Phase 3: Advanced (⏳ Future)
- [ ] Document export with provenance
- [ ] HMAC-based telemetry
- [ ] Ephemeral request cleanup
- [ ] Account deletion cascade

### Phase 4: Polish (⏳ Future)
- [ ] Privacy ratings display
- [ ] Compliance documentation
- [ ] Audit log viewer
- [ ] Privacy policy generator

---

## Privacy Contact

**Privacy Inquiries:** privacy@dictator.app  
**Data Subject Requests:** dpo@dictator.app  
**Security Vulnerabilities:** security@dictator.app  

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 2024 | Initial privacy architecture (Phase 1 Foundation) |

---

## Appendix: Glossary

- **E2E Encryption:** End-to-end encryption, only sender and recipient have keys
- **GDPR:** General Data Protection Regulation (EU)
- **HMAC:** Hash-based Message Authentication Code
- **PBKDF2:** Password-Based Key Derivation Function 2
- **PII:** Personally Identifiable Information
- **STT:** Speech-to-Text
- **TEE:** Trusted Execution Environment
- **TLS:** Transport Layer Security

---

**This document is public and subject to updates. Users will be notified of material changes.**
