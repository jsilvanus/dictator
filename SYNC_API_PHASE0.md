# Web-to-Android Sync API - Phase 0 Implementation

## Overview

This document describes Phase 0 of the Web-to-Android sync strategy implementation, which adds foundational database schema and API endpoints for device-aware document synchronization.

## Database Schema Changes

### New Columns Added to `documents` Table

- **`last_modified_device`** (TEXT, DEFAULT 'web'): Tracks which device type last modified the document ('web' or 'android')
- **`device_version`** (BIGINT, DEFAULT 1): Monotonically increasing version number for tracking updates across devices

### Updated `document_versions` Table

Added fields for device tracking:
- **`device_source`** (TEXT, DEFAULT 'web'): Device type that created this version
- **`device_version`** (BIGINT, DEFAULT 1): Device version at time of save

### New Tables

#### `sync_metadata`
Tracks per-document sync state:
- `document_id` (UUID, PRIMARY KEY)
- `last_synced_at` (TIMESTAMP)
- `local_version` (BIGINT): Last known local version
- `remote_version` (BIGINT): Last known remote version
- `pending_changes` (INTEGER): Count of pending changes
- `conflict_status` (ENUM: 'none', 'resolved', 'unresolved')
- `updated_at` (TIMESTAMP)

#### `pending_sync_queue`
Queues changes from devices when offline or failed:
- `id` (UUID, PRIMARY KEY)
- `document_id` (UUID)
- `user_id` (UUID)
- `device_id` (TEXT): Unique device identifier
- `change_data` (JSONB): Change payload
- `status` (TEXT: 'pending', 'failed', 'synced')
- `retry_count` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

#### `document_conflicts`
Records and resolves version conflicts:
- `id` (UUID, PRIMARY KEY)
- `document_id` (UUID)
- `base_version` (JSONB): Common ancestor version
- `android_version` (JSONB): Android device's version
- `web_version` (JSONB): Web's version
- `resolved_version` (JSONB, nullable): Resolution result
- `status` (TEXT: 'unresolved', 'resolved')
- `created_at`, `resolved_at` (TIMESTAMP)

## API Endpoints

### 1. Document Sync Endpoint
**GET/PUT `/api/documents/:id/sync?since=<timestamp>`**

#### GET - Retrieve incremental changes
Query Parameters:
- `since` (ISO 8601 timestamp, optional): Only return versions after this time

Response:
```json
{
  "document": {
    "id": "uuid",
    "title": "string",
    "content": {...},
    "wordCount": 0,
    "lastModifiedDevice": "web|android",
    "deviceVersion": 1,
    "updatedAt": "2026-08-12T19:00:00Z"
  },
  "versions": [
    {
      "id": "uuid",
      "content": {...},
      "deviceSource": "web|android",
      "deviceVersion": 1,
      "savedAt": "2026-08-12T19:00:00Z"
    }
  ],
  "syncMetadata": {
    "lastSyncedAt": "2026-08-12T19:00:00Z",
    "localVersion": 1,
    "remoteVersion": 1,
    "pendingChanges": 0,
    "conflictStatus": "none|resolved|unresolved"
  }
}
```

#### PUT - Push changes with device metadata
Request Body:
```json
{
  "content": {...},
  "title": "string",
  "wordCount": 123,
  "deviceId": "android-device-123",
  "deviceVersion": 2
}
```

Response:
```json
{
  "ok": true,
  "document": {...},
  "syncMetadata": {
    "lastSyncedAt": "2026-08-12T19:00:00Z",
    "remoteVersion": 2
  }
}
```

### 2. Pull Version History Endpoint
**POST `/api/documents/:id/versions`**

Request Body:
```json
{
  "since": "2026-08-12T10:00:00Z",
  "limit": 50
}
```

Response:
```json
{
  "versions": [...],
  "count": 10,
  "documentId": "uuid"
}
```

### 3. Sync Status Endpoint
**GET `/api/sync/status`**

Returns sync status for all user's documents:

Response:
```json
{
  "documents": [
    {
      "documentId": "uuid",
      "title": "string",
      "lastSyncedAt": "2026-08-12T19:00:00Z",
      "conflictStatus": "none|resolved|unresolved",
      "pendingChanges": 0,
      "hasPendingSync": false
    }
  ],
  "totalPending": 0
}
```

## Device Tracking

### Device ID Format
- **Web**: Default to 'web' (no per-device tracking in Phase 0)
- **Android**: Format as 'android-{deviceId}' where deviceId is unique per device

### Conflict Resolution Strategy (Phase 0)

Currently implements **last-write-wins** with device awareness:
- If `lastModifiedDevice == 'android'`, Android version is considered authoritative
- Server timestamp (`updatedAt`) determines merge order if timestamps differ
- Phase 1 will introduce more sophisticated 3-way merge logic

## Migration

The migration file `drizzle/0003_tricky_turbo.sql` contains all schema changes. Apply with:

```bash
npm run db:migrate
```

## Type Definitions

TypeScript types are defined in `lib/types/sync.ts`:
- `DeviceSource`: 'web' | 'android'
- `SyncRequest`: Request body format
- `SyncResponse`: Response body format
- `SyncMetadataRecord`: Database record structure
- `PendingSyncItem`: Queued change structure
- `DocumentConflict`: Conflict record structure

## Updated Endpoints

### Document Update Endpoint (`PUT /api/documents/:id`)

Now accepts optional device tracking fields:
- `deviceId` (string, optional): Device identifier
- `deviceVersion` (number, optional): Device version number

These are used to automatically populate `lastModifiedDevice` and `deviceVersion` fields.

## Next Phases

**Phase 1:** Android-specific sync implementation
- Implement sync service on Android with periodic/event-driven sync
- Add conflict resolution UI
- Implement offline queue with battery-aware batching

**Phase 2:** Advanced conflict resolution
- 3-way merge for text content
- Device priority settings
- Conflict history UI

**Phase 3:** Web-side sync indicators
- Display device sync status in web UI
- Add "Pull Latest from Android" button
- Device preferences settings

**Phase 4:** Comprehensive versioning
- Full version history browsing
- Point-in-time recovery
- Device-specific change tracking
