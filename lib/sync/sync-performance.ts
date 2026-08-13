/**
 * Phase 6: Sync Performance Metrics Service
 * Tracks and analyzes sync performance for optimization
 */

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { syncPerformanceMetrics } from '@/lib/db/schema';
import type { SyncAnalytics,SyncPerformanceMetric } from '@/lib/types/sync';

export class SyncPerformanceService {
  /**
   * Record a sync performance metric
   */
  async recordMetric(
    documentId: string,
    syncTimeMs: number,
    dataSizeBytes: number,
    success: boolean,
    compressionRatio?: number
  ): Promise<SyncPerformanceMetric> {
    const result = await db
      .insert(syncPerformanceMetrics)
      .values({
        documentId,
        syncTimeMs,
        dataSizeBytes,
        compressionRatio: compressionRatio || undefined,
        success,
      })
      .returning();

    return result[0] as SyncPerformanceMetric;
  }

  /**
   * Get performance metrics for a document
   */
  async getMetrics(
    documentId: string,
    limit: number = 100,
    offset: number = 0
  ) {
    const metrics = await db
      .select()
      .from(syncPerformanceMetrics)
      .where(eq(syncPerformanceMetrics.documentId, documentId))
      .orderBy(desc(syncPerformanceMetrics.timestamp))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: db.count() })
      .from(syncPerformanceMetrics)
      .where(eq(syncPerformanceMetrics.documentId, documentId));

    return { metrics, total: total[0]?.count || 0 };
  }

  /**
   * Get performance analytics for a document
   */
  async getAnalytics(
    documentId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<SyncAnalytics> {
    // Calculate time range based on period
    const now = new Date();
    const startDate = new Date(now);

    switch (period) {
      case 'hour':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    // Get metrics for the period
    const metrics = await db
      .select()
      .from(syncPerformanceMetrics)
      .where(eq(syncPerformanceMetrics.documentId, documentId));

    // Filter by date range
    const periodMetrics = metrics.filter(
      (m) => m.timestamp >= startDate && m.timestamp <= now
    );

    // Calculate statistics
    const totalSyncs = periodMetrics.length;
    const successfulSyncs = periodMetrics.filter((m) => m.success).length;
    const failedSyncs = totalSyncs - successfulSyncs;

    const averageSyncTimeMs =
      totalSyncs > 0
        ? periodMetrics.reduce((sum, m) => sum + m.syncTimeMs, 0) / totalSyncs
        : 0;

    const averageDataSizeBytes =
      totalSyncs > 0
        ? periodMetrics.reduce((sum, m) => sum + m.dataSizeBytes, 0) / totalSyncs
        : 0;

    const compressionRatios = periodMetrics
      .filter((m) => m.compressionRatio !== null)
      .map((m) => m.compressionRatio as number);

    const compressionRatio =
      compressionRatios.length > 0
        ? compressionRatios.reduce((a, b) => a + b, 0) / compressionRatios.length
        : 1;

    return {
      documentId,
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      averageSyncTimeMs: Math.round(averageSyncTimeMs),
      averageDataSizeBytes: Math.round(averageDataSizeBytes),
      compressionRatio: Math.round(compressionRatio * 100) / 100,
      period,
    };
  }

  /**
   * Get success rate for a document
   */
  async getSuccessRate(documentId: string): Promise<number> {
    const metrics = await db
      .select()
      .from(syncPerformanceMetrics)
      .where(eq(syncPerformanceMetrics.documentId, documentId));

    if (metrics.length === 0) return 100;

    const successCount = metrics.filter((m) => m.success).length;
    return Math.round((successCount / metrics.length) * 100);
  }

  /**
   * Get slowest syncs
   */
  async getSlowestSyncs(documentId: string, limit: number = 10) {
    return db
      .select()
      .from(syncPerformanceMetrics)
      .where(eq(syncPerformanceMetrics.documentId, documentId))
      .orderBy(desc(syncPerformanceMetrics.syncTimeMs))
      .limit(limit);
  }

  /**
   * Get largest syncs
   */
  async getLargestSyncs(documentId: string, limit: number = 10) {
    return db
      .select()
      .from(syncPerformanceMetrics)
      .where(eq(syncPerformanceMetrics.documentId, documentId))
      .orderBy(desc(syncPerformanceMetrics.dataSizeBytes))
      .limit(limit);
  }

  /**
   * Get failed syncs
   */
  async getFailedSyncs(documentId: string, limit: number = 50) {
    return db
      .select()
      .from(syncPerformanceMetrics)
      .where(
        and(
          eq(syncPerformanceMetrics.documentId, documentId),
          eq(syncPerformanceMetrics.success, false)
        )
      )
      .orderBy(desc(syncPerformanceMetrics.timestamp))
      .limit(limit);
  }

  /**
   * Calculate optimal compression strategy
   */
  async getCompressionRecommendation(documentId: string): Promise<{
    recommended: boolean;
    averageRatio: number;
    estimatedSavings: number;
  }> {
    const metrics = await db
      .select()
      .from(syncPerformanceMetrics)
      .where(eq(syncPerformanceMetrics.documentId, documentId));

    if (metrics.length === 0) {
      return {
        recommended: false,
        averageRatio: 1,
        estimatedSavings: 0,
      };
    }

    const compressionRatios = metrics
      .filter((m) => m.compressionRatio !== null)
      .map((m) => m.compressionRatio as number);

    if (compressionRatios.length === 0) {
      return {
        recommended: false,
        averageRatio: 1,
        estimatedSavings: 0,
      };
    }

    const averageRatio =
      compressionRatios.reduce((a, b) => a + b, 0) / compressionRatios.length;

    const averageDataSize =
      metrics.reduce((sum, m) => sum + m.dataSizeBytes, 0) / metrics.length;

    const estimatedSavings = averageDataSize * (1 - averageRatio);

    return {
      recommended: averageRatio < 0.8, // Recommend if compression saves more than 20%
      averageRatio: Math.round(averageRatio * 100) / 100,
      estimatedSavings: Math.round(estimatedSavings),
    };
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    documentId: string,
    granularity: 'hour' | 'day' | 'week' = 'day'
  ) {
    const metrics = await db
      .select()
      .from(syncPerformanceMetrics)
      .where(eq(syncPerformanceMetrics.documentId, documentId))
      .orderBy(syncPerformanceMetrics.timestamp);

    const trends: Array<{
      period: string;
      averageSyncTime: number;
      averageDataSize: number;
      successRate: number;
      count: number;
    }> = [];

    const grouped = new Map<string, (typeof metrics)>();

    for (const metric of metrics) {
      const key = this.getTimeKey(metric.timestamp, granularity);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    }

    for (const [period, periodMetrics] of grouped.entries()) {
      const successCount = periodMetrics.filter((m) => m.success).length;
      trends.push({
        period,
        averageSyncTime: Math.round(
          periodMetrics.reduce((sum, m) => sum + m.syncTimeMs, 0) / periodMetrics.length
        ),
        averageDataSize: Math.round(
          periodMetrics.reduce((sum, m) => sum + m.dataSizeBytes, 0) / periodMetrics.length
        ),
        successRate: Math.round((successCount / periodMetrics.length) * 100),
        count: periodMetrics.length,
      });
    }

    return trends;
  }

  /**
   * Get bandwidth optimization recommendations
   */
  async getBandwidthRecommendations(documentId: string) {
    const metrics = await db
      .select()
      .from(syncPerformanceMetrics)
      .where(eq(syncPerformanceMetrics.documentId, documentId));

    if (metrics.length === 0) {
      return {
        recommendations: [],
        averageBandwidthMbps: 0,
      };
    }

    const recommendations: string[] = [];

    const averageDataSize =
      metrics.reduce((sum, m) => sum + m.dataSizeBytes, 0) / metrics.length;
    const averageSyncTime =
      metrics.reduce((sum, m) => sum + m.syncTimeMs, 0) / metrics.length;

    const averageBandwidthMbps = (averageDataSize / (averageSyncTime / 1000)) / (1024 * 1024);

    if (averageDataSize > 10 * 1024 * 1024) {
      recommendations.push('Consider enabling compression for large syncs');
    }

    if (averageSyncTime > 30000) {
      recommendations.push('Sync times are high; consider implementing delta sync');
    }

    const successRate =
      (metrics.filter((m) => m.success).length / metrics.length) * 100;

    if (successRate < 95) {
      recommendations.push('High failure rate detected; check network connectivity');
    }

    return {
      recommendations,
      averageBandwidthMbps: Math.round(averageBandwidthMbps * 100) / 100,
    };
  }

  /**
   * Helper: Get time period key for grouping
   */
  private getTimeKey(date: Date, granularity: 'hour' | 'day' | 'week'): string {
    const d = new Date(date);

    switch (granularity) {
      case 'hour':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
      case 'day':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      case 'week':
        const week = Math.floor((d.getDate() - d.getDay() + 6) / 7);
        return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }
  }

  /**
   * Clean up old metrics (retention policy)
   */
  async cleanupOldMetrics(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Placeholder - in real implementation would use date filtering
    return 0;
  }
}

export const syncPerformanceService = new SyncPerformanceService();
