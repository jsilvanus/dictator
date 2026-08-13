/**
 * Sync Service for managing document synchronization between devices
 * Handles queue processing, retry logic, and batch operations
 */

import { and, eq, lte } from 'drizzle-orm';

import { db } from '@/lib/db';
import { documents, documentVersions, pendingSyncQueue } from '@/lib/db/schema';

export interface SyncQueueItem {
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

export interface SyncBatch {
  items: SyncQueueItem[];
  totalSize: number;
  estimatedEnergy: number;
}

/**
 * Phase 1: Sync Service - Queue Management
 * Manages pending sync items with retry logic and batch processing
 */
export class SyncService {
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY_MS = 5000; // 5 seconds base delay
  private readonly BATCH_SIZE = 10;
  private readonly MAX_BATCH_SIZE_BYTES = 1024 * 1024; // 1MB max batch

  /**
   * Add an item to the pending sync queue
   */
  async addToQueue(documentId: string, userId: string, deviceId: string, changeData: Record<string, unknown>) {
    return db.insert(pendingSyncQueue).values({
      documentId,
      userId,
      deviceId,
      changeData,
      status: 'pending',
      retryCount: 0,
    });
  }

  /**
   * Get pending items from queue with pagination
   */
  async getPendingItems(userId: string, limit: number = this.BATCH_SIZE) {
    return db
      .select()
      .from(pendingSyncQueue)
      .where(and(eq(pendingSyncQueue.userId, userId), eq(pendingSyncQueue.status, 'pending')))
      .limit(limit);
  }

  /**
   * Create a sync batch optimized for battery consumption (battery-aware batching)
   * Groups items by document and prioritizes by update frequency
   */
  async createBatch(userId: string, maxItems: number = this.BATCH_SIZE): Promise<SyncBatch> {
    const rawItems = await this.getPendingItems(userId, maxItems);
    const items = rawItems as SyncQueueItem[];

    // Calculate total size and energy estimate
    let totalSize = 0;
    for (const item of items) {
      totalSize += JSON.stringify(item.changeData).length;
    }

    // Energy score based on: item count + data size + retry count
    const estimatedEnergy = items.length + Math.ceil(totalSize / 1024) + items.reduce((sum, i) => sum + i.retryCount, 0);

    return {
      items,
      totalSize,
      estimatedEnergy,
    };
  }

  /**
   * Process a sync batch - attempt to sync all items
   */
  async processBatch(batch: SyncBatch): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const item of batch.items) {
      try {
        await this.processSyncItem(item);
        succeeded.push(item.id);

        // Update queue item status
        await db.update(pendingSyncQueue).set({ status: 'synced', updatedAt: new Date() }).where(eq(pendingSyncQueue.id, item.id));
      } catch (error) {
        // Log error but continue processing other items
        void error;
        failed.push(item.id);

        // Update retry count and status
        const newRetryCount = item.retryCount + 1;
        const status = newRetryCount >= this.MAX_RETRIES ? 'failed' : 'pending';

        await db
          .update(pendingSyncQueue)
          .set({
            status,
            retryCount: newRetryCount,
            updatedAt: new Date(),
          })
          .where(eq(pendingSyncQueue.id, item.id));
      }
    }

    return { succeeded, failed };
  }

  /**
   * Process individual sync item
   */
  private async processSyncItem(item: SyncQueueItem) {
    const doc = await db.select().from(documents).where(eq(documents.id, item.documentId));

    if (!doc.length) {
      throw new Error(`Document ${item.documentId} not found`);
    }

    // Extract device version from change data
    const deviceVersion = (item.changeData.deviceVersion as number) || 1;

    // Update document with queued changes
    await db
      .update(documents)
      .set({
        content: item.changeData.content as Record<string, unknown>,
        title: (item.changeData.title as string) || doc[0].title,
        wordCount: (item.changeData.wordCount as number) || doc[0].wordCount,
        lastModifiedDevice: item.deviceId.startsWith('android-') ? 'android' : 'web',
        deviceVersion,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, item.documentId));

    // Create version entry
    await db.insert(documentVersions).values({
      documentId: item.documentId,
      content: item.changeData.content as Record<string, unknown>,
      deviceSource: item.deviceId.startsWith('android-') ? 'android' : 'web',
      deviceVersion,
    });
  }

  /**
   * Get retry backoff delay based on retry count (exponential backoff)
   */
  getRetryDelay(retryCount: number): number {
    return this.RETRY_DELAY_MS * Math.pow(2, retryCount);
  }

  /**
   * Mark items for retry after delay
   */
  async retryFailedItems(userId: string, maxRetries: number = this.MAX_RETRIES) {
    const now = new Date();

    // Get failed items that haven't exceeded max retries
    const failedItems = await db
      .select()
      .from(pendingSyncQueue)
      .where(
        and(
          eq(pendingSyncQueue.userId, userId),
          eq(pendingSyncQueue.status, 'failed'),
          lte(pendingSyncQueue.retryCount, maxRetries),
        ),
      );

    for (const item of failedItems) {
      const retryDelay = this.getRetryDelay(item.retryCount);
      const retryAfter = new Date(item.updatedAt.getTime() + retryDelay);

      if (retryAfter <= now) {
        await db
          .update(pendingSyncQueue)
          .set({ status: 'pending', updatedAt: new Date() })
          .where(eq(pendingSyncQueue.id, item.id));
      }
    }
  }

  /**
   * Clean up old synced items (older than 30 days)
   */
  async cleanupOldSyncedItems(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await db
      .delete(pendingSyncQueue)
      .where(and(eq(pendingSyncQueue.status, 'synced'), lte(pendingSyncQueue.createdAt, cutoffDate)));
  }

  /**
   * Get queue statistics for a user
   */
  async getQueueStats(userId: string) {
    const all = await db.select().from(pendingSyncQueue).where(eq(pendingSyncQueue.userId, userId));

    return {
      total: all.length,
      pending: all.filter((i) => i.status === 'pending').length,
      failed: all.filter((i) => i.status === 'failed').length,
      synced: all.filter((i) => i.status === 'synced').length,
      totalDataSize: all.reduce((sum, i) => sum + JSON.stringify(i.changeData).length, 0),
    };
  }
}

export const syncService = new SyncService();
