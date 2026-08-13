/**
 * Types for Web-to-Android sync functionality
 */

export type DeviceSource = 'web' | 'android';

export interface DeviceMetadata {
  deviceId: string;
  deviceVersion: number;
  lastModifiedDevice: DeviceSource;
  timestamp: Date;
}

export interface SyncMetadataRecord {
  documentId: string;
  lastSyncedAt: Date;
  localVersion: number;
  remoteVersion: number;
  pendingChanges: number;
  conflictStatus: 'none' | 'resolved' | 'unresolved';
  updatedAt: Date;
}

export interface PendingSyncItem {
  id: string;
  documentId: string;
  userId: string;
  deviceId: string;
  changeData: Record<string, unknown>;
  status: 'pending' | 'failed' | 'synced';
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentConflict {
  id: string;
  documentId: string;
  baseVersion: Record<string, unknown>;
  androidVersion: Record<string, unknown>;
  webVersion: Record<string, unknown>;
  resolvedVersion?: Record<string, unknown>;
  status: 'unresolved' | 'resolved';
  createdAt: Date;
  resolvedAt?: Date;
}

export interface SyncRequest {
  content: Record<string, unknown>;
  title: string;
  wordCount: number;
  deviceId: string;
  deviceVersion: number;
}

export interface SyncResponse {
  document: {
    id: string;
    title: string;
    content: Record<string, unknown>;
    wordCount: number;
    lastModifiedDevice: string;
    deviceVersion: number;
    updatedAt: string;
  };
  versions: Array<{
    id: string;
    content: Record<string, unknown>;
    deviceSource: string;
    deviceVersion: number;
    savedAt: string;
  }>;
  syncMetadata: {
    lastSyncedAt: string;
    localVersion: number;
    remoteVersion: number;
    pendingChanges: number;
    conflictStatus: string;
  };
}

export interface PullVersionsRequest {
  since?: string;
  limit?: number;
}

export interface PullVersionsResponse {
  versions: Array<{
    id: string;
    content: Record<string, unknown>;
    deviceSource: string;
    deviceVersion: number;
    savedAt: string;
  }>;
  count: number;
  documentId: string;
}

export interface SyncStatusResponse {
  documents: Array<{
    documentId: string;
    title: string;
    lastSyncedAt: string;
    conflictStatus: string;
    pendingChanges: number;
    hasPendingSync: boolean;
  }>;
  totalPending: number;
}

// Phase 4: Comprehensive Versioning Types
export interface VersionSnapshot {
  id: string;
  documentId: string;
  versionNumber: number;
  snapshotData: Record<string, unknown>;
  createdAt: Date;
  createdByDevice: DeviceSource;
  tag?: string;
  isCheckpoint: boolean;
}

export interface VersionMetadata {
  id: string;
  documentId: string;
  versionNumber: number;
  parentVersion?: number;
  changeSummary?: string;
  wordCountChange?: number;
  sizeBytes?: number;
  isMajorVersion: boolean;
  createdAt: Date;
}

export interface DeviceVersionRecord {
  id: string;
  documentId: string;
  deviceId: string;
  deviceVersion: number;
  syncedAt: Date;
  status: 'synced' | 'pending' | 'conflict';
}

export interface VersionDiff {
  from: number;
  to: number;
  additions: string[];
  deletions: string[];
  modifications: Array<{ line: number; from: string; to: string }>;
  unifiedDiff: string;
}

export interface VersionTimeline {
  documentId: string;
  versionNumber: number;
  timestamp: Date;
  createdByDevice: DeviceSource;
  changeSummary?: string;
  tags: string[];
}

// Phase 5: Real-time Collaboration & Sync Optimization Types
export interface SyncActivityLogEntry {
  id: string;
  userId: string;
  documentId: string;
  deviceId: string;
  action: 'sync_started' | 'sync_completed' | 'conflict_detected' | 'conflict_resolved';
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface SyncNotification {
  id: string;
  userId: string;
  documentId: string;
  type: 'sync_complete' | 'conflict' | 'version_available';
  read: boolean;
  createdAt: Date;
}

export interface SyncScheduleConfig {
  documentId: string;
  intervalMinutes?: number;
  onFileChange?: boolean;
  batteryAware?: boolean;
  bandwidthLimit?: number;
}

// Phase 6: Advanced Versioning & Sync Orchestration Types
export interface VersionBranch {
  id: string;
  documentId: string;
  branchName: string;
  baseVersion: number;
  createdAt: Date;
  isMain: boolean;
}

export interface SyncPerformanceMetric {
  id: string;
  documentId: string;
  syncTimeMs: number;
  dataSizeBytes: number;
  compressionRatio?: number;
  success: boolean;
  timestamp: Date;
}

export interface SyncAnalytics {
  documentId: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTimeMs: number;
  averageDataSizeBytes: number;
  compressionRatio: number;
  period: 'hour' | 'day' | 'week' | 'month';
}
