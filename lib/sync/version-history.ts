/**
 * Phase 4: Version History Service
 * Manages version snapshots, metadata, and point-in-time recovery
 */

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  deviceVersionHistory,
  documentVersionMetadata,
  documentVersionSnapshots,
} from '@/lib/db/schema';
import type { VersionMetadata, VersionTimeline } from '@/lib/types/sync';

export class VersionHistoryService {
  /**
   * Create a version snapshot for point-in-time recovery
   */
  async createSnapshot(
    documentId: string,
    versionNumber: number,
    snapshotData: Record<string, unknown>,
    createdByDevice: 'web' | 'android',
    tag?: string,
    isCheckpoint: boolean = false
  ) {
    return db.insert(documentVersionSnapshots).values({
      documentId,
      versionNumber,
      snapshotData,
      createdByDevice,
      tag,
      isCheckpoint,
    });
  }

  /**
   * Get a specific version snapshot
   */
  async getSnapshot(documentId: string, versionNumber: number) {
    return db
      .select()
      .from(documentVersionSnapshots)
      .where(
        and(
          eq(documentVersionSnapshots.documentId, documentId),
          eq(documentVersionSnapshots.versionNumber, versionNumber)
        )
      )
      .limit(1);
  }

  /**
   * Get all snapshots for a document with pagination
   */
  async getSnapshots(documentId: string, limit: number = 50, offset: number = 0) {
    const snapshots = await db
      .select()
      .from(documentVersionSnapshots)
      .where(eq(documentVersionSnapshots.documentId, documentId))
      .orderBy(desc(documentVersionSnapshots.versionNumber))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: db.count() })
      .from(documentVersionSnapshots)
      .where(eq(documentVersionSnapshots.documentId, documentId));

    return { snapshots, total: total[0]?.count || 0 };
  }

  /**
   * Tag a version snapshot
   */
  async tagSnapshot(documentId: string, versionNumber: number, tag: string) {
    return db
      .update(documentVersionSnapshots)
      .set({ tag })
      .where(
        and(
          eq(documentVersionSnapshots.documentId, documentId),
          eq(documentVersionSnapshots.versionNumber, versionNumber)
        )
      );
  }

  /**
   * Mark a version as a checkpoint for recovery
   */
  async markCheckpoint(documentId: string, versionNumber: number) {
    return db
      .update(documentVersionSnapshots)
      .set({ isCheckpoint: true })
      .where(
        and(
          eq(documentVersionSnapshots.documentId, documentId),
          eq(documentVersionSnapshots.versionNumber, versionNumber)
        )
      );
  }

  /**
   * Record version metadata
   */
  async recordVersionMetadata(
    documentId: string,
    versionNumber: number,
    parentVersion: number | null,
    changeSummary: string,
    wordCountChange: number,
    sizeBytes: number,
    isMajorVersion: boolean = false
  ) {
    return db.insert(documentVersionMetadata).values({
      documentId,
      versionNumber,
      parentVersion,
      changeSummary,
      wordCountChange,
      sizeBytes,
      isMajorVersion,
    });
  }

  /**
   * Get version metadata
   */
  async getVersionMetadata(documentId: string, versionNumber: number) {
    return db
      .select()
      .from(documentVersionMetadata)
      .where(
        and(
          eq(documentVersionMetadata.documentId, documentId),
          eq(documentVersionMetadata.versionNumber, versionNumber)
        )
      )
      .limit(1);
  }

  /**
   * Get version timeline for visualization
   */
  async getVersionTimeline(
    documentId: string,
    limit: number = 100
  ): Promise<VersionTimeline[]> {
    const metadata = await db
      .select()
      .from(documentVersionMetadata)
      .where(eq(documentVersionMetadata.documentId, documentId))
      .orderBy(desc(documentVersionMetadata.versionNumber))
      .limit(limit);

    // Fetch snapshots to get device info and timestamps
    const snapshotsMap = new Map();
    for (const m of metadata) {
      const snapshot = await db
        .select()
        .from(documentVersionSnapshots)
        .where(
          and(
            eq(documentVersionSnapshots.documentId, documentId),
            eq(documentVersionSnapshots.versionNumber, m.versionNumber)
          )
        )
        .limit(1);

      if (snapshot.length > 0) {
        snapshotsMap.set(m.versionNumber, snapshot[0]);
      }
    }

    return metadata.map((m) => {
      const snapshot = snapshotsMap.get(m.versionNumber);
      return {
        documentId,
        versionNumber: m.versionNumber,
        timestamp: m.createdAt,
        createdByDevice: snapshot?.createdByDevice || 'web',
        changeSummary: m.changeSummary || undefined,
        tags: snapshot?.tag ? [snapshot.tag] : [],
      };
    });
  }

  /**
   * Get version lineage (parent-child relationships)
   */
  async getVersionLineage(documentId: string, versionNumber: number) {
    const lineage: VersionMetadata[] = [];
    let current: (typeof documentVersionMetadata.$inferSelect) | null = await db
      .select()
      .from(documentVersionMetadata)
      .where(
        and(
          eq(documentVersionMetadata.documentId, documentId),
          eq(documentVersionMetadata.versionNumber, versionNumber)
        )
      )
      .limit(1)
      .then((rows) => rows[0] || null);

    while (current) {
      lineage.unshift(current as VersionMetadata);
      if (current.parentVersion === null || current.parentVersion === undefined) {
        break;
      }

      current = await db
        .select()
        .from(documentVersionMetadata)
        .where(
          and(
            eq(documentVersionMetadata.documentId, documentId),
            eq(documentVersionMetadata.versionNumber, current.parentVersion)
          )
        )
        .limit(1)
        .then((rows) => rows[0] || null);
    }

    return lineage;
  }

  /**
   * Record device version sync
   */
  async recordDeviceVersion(
    documentId: string,
    deviceId: string,
    deviceVersion: number,
    status: 'synced' | 'pending' | 'conflict' = 'synced'
  ) {
    return db.insert(deviceVersionHistory).values({
      documentId,
      deviceId,
      deviceVersion,
      status,
    });
  }

  /**
   * Get device-specific version history
   */
  async getDeviceVersionHistory(documentId: string, deviceId: string) {
    return db
      .select()
      .from(deviceVersionHistory)
      .where(
        and(
          eq(deviceVersionHistory.documentId, documentId),
          eq(deviceVersionHistory.deviceId, deviceId)
        )
      )
      .orderBy(desc(deviceVersionHistory.deviceVersion));
  }

  /**
   * Get all devices' version sync status
   */
  async getDeviceSyncStatus(documentId: string) {
    return db
      .select()
      .from(deviceVersionHistory)
      .where(eq(deviceVersionHistory.documentId, documentId))
      .orderBy(desc(deviceVersionHistory.syncedAt));
  }

  /**
   * Cleanup old versions (prune to keep last N versions)
   */
  async pruneOldVersions(documentId: string, keepCount: number = 100) {
    // Get all snapshots sorted by version
    const allSnapshots = await db
      .select()
      .from(documentVersionSnapshots)
      .where(eq(documentVersionSnapshots.documentId, documentId))
      .orderBy(desc(documentVersionSnapshots.versionNumber));

    if (allSnapshots.length <= keepCount) {
      return 0;
    }

    // Keep checkpoints and recent versions
    const toDelete = allSnapshots
      .slice(keepCount)
      .filter((s) => !s.isCheckpoint && !s.tag)
      .map((s) => s.id);

    if (toDelete.length === 0) {
      return 0;
    }

    // Delete old non-checkpoint, untagged versions
    await db
      .delete(documentVersionSnapshots)
      .where(eq(documentVersionSnapshots.id, toDelete[0]));

    return toDelete.length;
  }
}

export const versionHistoryService = new VersionHistoryService();
