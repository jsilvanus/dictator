/**
 * Phase 5: Sync Notification Service
 * Manages real-time notifications for sync events
 */

import { and, count, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { documents, syncActivityLog, syncNotifications } from '@/lib/db/schema';
import type { SyncActivityLogEntry, SyncNotification } from '@/lib/types/sync';

export class SyncNotificationService {
  /**
   * Create a sync notification for a user
   */
  async createNotification(
    userId: string,
    documentId: string,
    type: 'sync_complete' | 'conflict' | 'version_available'
  ): Promise<SyncNotification> {
    const result = await db
      .insert(syncNotifications)
      .values({
        userId,
        documentId,
        type,
        read: false,
      })
      .returning();

    return result[0] as SyncNotification;
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string) {
    return db
      .select()
      .from(syncNotifications)
      .where(
        and(
          eq(syncNotifications.userId, userId),
          eq(syncNotifications.read, false)
        )
      )
      .orderBy(desc(syncNotifications.createdAt));
  }

  /**
   * Get all notifications for a user with pagination
   */
  async getNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const notifications = await db
      .select()
      .from(syncNotifications)
      .where(eq(syncNotifications.userId, userId))
      .orderBy(desc(syncNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: count() })
      .from(syncNotifications)
      .where(eq(syncNotifications.userId, userId));

    return { notifications, total: total[0]?.count || 0 };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string) {
    return db
      .update(syncNotifications)
      .set({ read: true })
      .where(eq(syncNotifications.id, notificationId));
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return db
      .update(syncNotifications)
      .set({ read: true })
      .where(
        and(
          eq(syncNotifications.userId, userId),
          eq(syncNotifications.read, false)
        )
      );
  }

  /**
   * Delete old notifications (older than days)
   */
  async cleanupOldNotifications(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // In a real implementation, we'd use a proper date comparison
    // For now, this is a placeholder
    return 0;
  }

  /**
   * Get notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(syncNotifications)
      .where(
        and(
          eq(syncNotifications.userId, userId),
          eq(syncNotifications.read, false)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Log a sync activity
   */
  async logActivity(
    userId: string,
    documentId: string,
    deviceId: string,
    action: 'sync_started' | 'sync_completed' | 'conflict_detected' | 'conflict_resolved',
    details: Record<string, unknown> = {}
  ): Promise<SyncActivityLogEntry> {
    const result = await db
      .insert(syncActivityLog)
      .values({
        userId,
        documentId,
        deviceId,
        action,
        details,
      })
      .returning();

    return result[0] as SyncActivityLogEntry;
  }

  /**
   * Get activity log for a user
   */
  async getActivityLog(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ) {
    const logs = await db
      .select()
      .from(syncActivityLog)
      .where(eq(syncActivityLog.userId, userId))
      .orderBy(desc(syncActivityLog.timestamp))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: count() })
      .from(syncActivityLog)
      .where(eq(syncActivityLog.userId, userId));

    return { logs, total: total[0]?.count || 0 };
  }

  /**
   * Get activity log for a specific document
   */
  async getDocumentActivityLog(
    documentId: string,
    limit: number = 100
  ) {
    return db
      .select()
      .from(syncActivityLog)
      .where(eq(syncActivityLog.documentId, documentId))
      .orderBy(desc(syncActivityLog.timestamp))
      .limit(limit);
  }

  /**
   * Get sync statistics for a document
   */
  async getDocumentSyncStats(documentId: string) {
    const logs = await db
      .select()
      .from(syncActivityLog)
      .where(eq(syncActivityLog.documentId, documentId));

    const stats = {
      totalSyncs: logs.length,
      successfulSyncs: logs.filter((l) => l.action === 'sync_completed').length,
      conflictsDetected: logs.filter((l) => l.action === 'conflict_detected').length,
      conflictsResolved: logs.filter((l) => l.action === 'conflict_resolved').length,
      devices: new Set(logs.map((l) => l.deviceId)).size,
    };

    return stats;
  }

  /**
   * Get sync activity for a specific device
   */
  async getDeviceActivity(documentId: string, deviceId: string) {
    return db
      .select()
      .from(syncActivityLog)
      .where(
        and(
          eq(syncActivityLog.documentId, documentId),
          eq(syncActivityLog.deviceId, deviceId)
        )
      )
      .orderBy(desc(syncActivityLog.timestamp));
  }

  /**
   * Clean up old activity logs
   */
  async cleanupActivityLogs(_olderThanDays: number = 90): Promise<number> {
    // Placeholder - in real implementation would use date filtering
    return 0;
  }

  /**
   * Notify on sync event (broadcasts to subscribed clients)
   * This would typically integrate with WebSocket or server-sent events
   */
  async broadcastSyncEvent(
    documentId: string,
    eventType: 'sync_complete' | 'conflict' | 'version_available',
    data: Record<string, unknown>
  ) {
    // In a real implementation, this would:
    // 1. Find all subscribed users for the document
    // 2. Send WebSocket messages to their connected clients
    // 3. Create notifications for offline users

    const subscribers = await db
      .select({ userId: documents.ownerId })
      .from(documents)
      .where(eq(documents.id, documentId));

    for (const subscriber of subscribers) {
      await this.createNotification(subscriber.userId, documentId, eventType);
    }

    return {
      subscribers: subscribers.length,
      event: eventType,
      data,
    };
  }
}

export const syncNotificationService = new SyncNotificationService();
