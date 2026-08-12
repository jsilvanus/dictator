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
