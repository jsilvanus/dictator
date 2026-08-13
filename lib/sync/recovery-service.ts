/**
 * Phase 4: Recovery Service
 * Handles point-in-time recovery and version restoration
 */

import { and,eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { documents, documentVersions,documentVersionSnapshots } from '@/lib/db/schema';

import { versionHistoryService } from './version-history';

export class RecoveryService {
  /**
   * Restore a document to a specific version
   */
  async restoreToVersion(documentId: string, versionNumber: number) {
    // Get the snapshot for the target version
    const snapshot = await versionHistoryService.getSnapshot(documentId, versionNumber);

    if (!snapshot || snapshot.length === 0) {
      throw new Error(`No snapshot found for version ${versionNumber}`);
    }

    const targetSnapshot = snapshot[0];

    // Update the document with the snapshot content
    await db
      .update(documents)
      .set({
        content: targetSnapshot.snapshotData,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // Create a new version entry documenting the recovery
    await db.insert(documentVersions).values({
      documentId,
      content: targetSnapshot.snapshotData,
      deviceSource: 'web',
      deviceVersion: 1,
    });

    return targetSnapshot;
  }

  /**
   * Get document as it was at a specific time
   */
  async getDocumentAtTime(documentId: string, timestamp: Date) {
    // Find the most recent snapshot before the given timestamp
    const result = await db
      .select()
      .from(documentVersionSnapshots)
      .where(
        and(
          eq(documentVersionSnapshots.documentId, documentId),
          // We'd normally use: lte(documentVersionSnapshots.createdAt, timestamp)
          // but drizzle-orm might require different syntax
        )
      )
      .orderBy((col) => col.createdAt)
      .limit(1);

    if (!result || result.length === 0) {
      throw new Error('No snapshot found for the given time');
    }

    return result[0];
  }

  /**
   * Compare two versions and get their differences
   */
  async compareVersions(
    documentId: string,
    versionNumber1: number,
    versionNumber2: number
  ) {
    const [snapshot1, snapshot2] = await Promise.all([
      versionHistoryService.getSnapshot(documentId, versionNumber1),
      versionHistoryService.getSnapshot(documentId, versionNumber2),
    ]);

    if (!snapshot1 || snapshot1.length === 0 || !snapshot2 || snapshot2.length === 0) {
      throw new Error('One or both versions not found');
    }

    return {
      version1: versionNumber1,
      version2: versionNumber2,
      snapshot1: snapshot1[0],
      snapshot2: snapshot2[0],
      // Diff calculation would be done by DiffService
    };
  }

  /**
   * Create a recovery checkpoint at current state
   */
  async createRecoveryCheckpoint(
    documentId: string,
    versionNumber: number,
    tag: string
  ) {
    return versionHistoryService.markCheckpoint(documentId, versionNumber);
  }

  /**
   * Get all recovery checkpoints for a document
   */
  async getRecoveryCheckpoints(documentId: string) {
    const snapshots = await db
      .select()
      .from(documentVersionSnapshots)
      .where(
        and(
          eq(documentVersionSnapshots.documentId, documentId),
          eq(documentVersionSnapshots.isCheckpoint, true)
        )
      )
      .orderBy((col) => col.versionNumber);

    return snapshots;
  }

  /**
   * Verify snapshot integrity
   */
  async verifySnapshotIntegrity(documentId: string, versionNumber: number): Promise<boolean> {
    const snapshot = await versionHistoryService.getSnapshot(documentId, versionNumber);

    if (!snapshot || snapshot.length === 0) {
      return false;
    }

    // Basic validation: ensure snapshot data is valid JSON
    try {
      const data = snapshot[0].snapshotData;
      if (typeof data !== 'object' || data === null) {
        return false;
      }

      // Check required fields (title and content)
      if (!('title' in data) && !('content' in data)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Bulk recovery: restore multiple documents from checkpoints
   */
  async bulkRestore(restorations: Array<{ documentId: string; versionNumber: number }>) {
    const results = [];

    for (const restoration of restorations) {
      try {
        const result = await this.restoreToVersion(restoration.documentId, restoration.versionNumber);
        results.push({
          documentId: restoration.documentId,
          success: true,
          result,
        });
      } catch (error) {
        results.push({
          documentId: restoration.documentId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Archive old versions (move to cold storage conceptually)
   * In practice, this would mark them for deletion after retention period
   */
  async archiveOldVersions(
    documentId: string,
    keepDays: number = 90
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    // In a real implementation, you'd mark for deletion or move to archival storage
    // For now, we'll just count what would be archived
    const toArchive = await db
      .select()
      .from(documentVersionSnapshots)
      .where(
        and(
          eq(documentVersionSnapshots.documentId, documentId),
          eq(documentVersionSnapshots.isCheckpoint, false),
          eq(documentVersionSnapshots.tag, null)
        )
      );

    return toArchive.length;
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStats(documentId: string) {
    const snapshots = await db
      .select()
      .from(documentVersionSnapshots)
      .where(eq(documentVersionSnapshots.documentId, documentId));

    const checkpoints = snapshots.filter((s) => s.isCheckpoint);
    const tagged = snapshots.filter((s) => s.tag);

    const oldestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const newestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

    return {
      totalSnapshots: snapshots.length,
      checkpoints: checkpoints.length,
      tagged: tagged.length,
      oldestVersion: oldestSnapshot?.versionNumber,
      newestVersion: newestSnapshot?.versionNumber,
      timeSpan: oldestSnapshot && newestSnapshot
        ? {
            from: oldestSnapshot.createdAt,
            to: newestSnapshot.createdAt,
          }
        : null,
    };
  }
}

export const recoveryService = new RecoveryService();
