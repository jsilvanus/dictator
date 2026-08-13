/**
 * Conflict Resolution Service - Phase 2
 * Implements 3-way merge, device priority settings, and conflict tracking
 */

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { documentConflicts, documents, syncMetadata, users } from '@/lib/db/schema';

export interface MergeResult {
  resolved: boolean;
  content: Record<string, unknown>;
  conflicts: string[];
  mergeStrategy: 'auto' | 'manual' | 'device-priority';
}

export interface ConflictResolution {
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

export interface DevicePreferences {
  userId: string;
  androidPriority: number; // 0-100, higher = more priority
  webPriority: number; // 0-100
  autoResolve: boolean;
  conflictResolutionMode: 'last-write-wins' | '3way-merge' | 'device-priority';
}

/**
 * Phase 2: Conflict Resolution Service
 */
export class ConflictResolutionService {
  /**
   * Detect conflicts by comparing versions
   */
  async detectConflict(documentId: string, androidVersion: Record<string, unknown>, webVersion: Record<string, unknown>) {
    // Get the base version (common ancestor)
    const doc = await db.select().from(documents).where(eq(documents.id, documentId));

    if (!doc.length) {
      throw new Error(`Document ${documentId} not found`);
    }

    const baseVersion = doc[0].content;

    // Check if versions differ from base
    const androidDifferent = JSON.stringify(androidVersion) !== JSON.stringify(baseVersion);
    const webDifferent = JSON.stringify(webVersion) !== JSON.stringify(baseVersion);

    if (androidDifferent && webDifferent && JSON.stringify(androidVersion) !== JSON.stringify(webVersion)) {
      // Conflict detected
      return await this.createConflictRecord(documentId, baseVersion, androidVersion, webVersion);
    }

    return null;
  }

  /**
   * Create conflict record in database
   */
  private async createConflictRecord(
    documentId: string,
    baseVersion: Record<string, unknown>,
    androidVersion: Record<string, unknown>,
    webVersion: Record<string, unknown>,
  ) {
    const result = await db
      .insert(documentConflicts)
      .values({
        documentId,
        baseVersion,
        androidVersion,
        webVersion,
        status: 'unresolved',
      })
      .returning();

    // Update sync metadata to mark conflict
    await db.update(syncMetadata).set({ conflictStatus: 'unresolved', updatedAt: new Date() }).where(eq(syncMetadata.documentId, documentId));

    return result[0];
  }

  /**
   * 3-way merge algorithm for text-based content
   * Handles content changes from both Android and Web against a common base
   */
  perform3WayMerge(baseVersion: Record<string, unknown>, androidVersion: Record<string, unknown>, webVersion: Record<string, unknown>): MergeResult {
    const baseContent = (baseVersion.content as string) || '';
    const androidContent = (androidVersion.content as string) || '';
    const webContent = (webVersion.content as string) || '';

    // Check if there are actual conflicts
    if (baseContent === androidContent) {
      // Android made no changes, keep web version
      return {
        resolved: true,
        content: { ...webVersion, content: webContent },
        conflicts: [],
        mergeStrategy: 'auto',
      };
    }

    if (baseContent === webContent) {
      // Web made no changes, keep android version
      return {
        resolved: true,
        content: { ...androidVersion, content: androidContent },
        conflicts: [],
        mergeStrategy: 'auto',
      };
    }

    if (androidContent === webContent) {
      // Both made the same changes
      return {
        resolved: true,
        content: { ...webVersion, content: webContent },
        conflicts: [],
        mergeStrategy: 'auto',
      };
    }

    // True conflict: both sides made different changes
    // Use a simple line-based merge for text content
    const mergedContent = this.mergeLineByLine(baseContent, androidContent, webContent);

    return {
      resolved: mergedContent.conflicts.length === 0,
      content: {
        ...webVersion,
        content: mergedContent.text,
      },
      conflicts: mergedContent.conflicts,
      mergeStrategy: 'auto',
    };
  }

  /**
   * Line-by-line merge strategy for text content
   */
  private mergeLineByLine(
    baseText: string,
    androidText: string,
    webText: string,
  ): { text: string; conflicts: string[] } {
    const baseLines = baseText.split('\n');
    const androidLines = androidText.split('\n');
    const webLines = webText.split('\n');

    const conflicts: string[] = [];
    const merged: string[] = [];

    // Simple merge: for each line, check if it was changed
    const maxLines = Math.max(baseLines.length, androidLines.length, webLines.length);

    for (let i = 0; i < maxLines; i++) {
      const baseLine = baseLines[i] || '';
      const androidLine = androidLines[i] || '';
      const webLine = webLines[i] || '';

      if (baseLine === androidLine && baseLine === webLine) {
        // No changes
        merged.push(baseLine);
      } else if (baseLine === androidLine) {
        // Only web changed
        merged.push(webLine);
      } else if (baseLine === webLine) {
        // Only android changed
        merged.push(androidLine);
      } else {
        // Both changed - conflict
        conflicts.push(`Line ${i + 1}: conflict between Android and Web versions`);
        // Use web version by default in case of conflict (can be customized)
        merged.push(webLine);
      }
    }

    return {
      text: merged.join('\n'),
      conflicts,
    };
  }

  /**
   * Resolve conflict using device priority
   */
  async resolveConflictByDevicePriority(
    conflictId: string,
    androidPriority: number,
    webPriority: number,
  ): Promise<ConflictResolution> {
    const conflict = await db.select().from(documentConflicts).where(eq(documentConflicts.id, conflictId));

    if (!conflict.length) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const con = conflict[0];
    let resolvedVersion;

    if (androidPriority > webPriority) {
      resolvedVersion = con.androidVersion;
    } else if (webPriority > androidPriority) {
      resolvedVersion = con.webVersion;
    } else {
      // Equal priority - use last write (web in this case)
      resolvedVersion = con.webVersion;
    }

    // Update conflict status
    await db
      .update(documentConflicts)
      .set({
        resolvedVersion,
        status: 'resolved',
        resolvedAt: new Date(),
      })
      .where(eq(documentConflicts.id, conflictId));

    // Update sync metadata
    await db
      .update(syncMetadata)
      .set({
        conflictStatus: 'resolved',
        updatedAt: new Date(),
      })
      .where(eq(syncMetadata.documentId, con.documentId));

    // Update document to resolved version
    await db.update(documents).set(resolvedVersion as Record<string, unknown>).where(eq(documents.id, con.documentId));

    return {
      ...con,
      resolvedVersion,
      status: 'resolved',
      resolvedAt: new Date(),
    };
  }

  /**
   * Manually resolve conflict with user-provided content
   */
  async resolveConflictManually(conflictId: string, resolvedContent: Record<string, unknown>): Promise<ConflictResolution> {
    const conflict = await db.select().from(documentConflicts).where(eq(documentConflicts.id, conflictId));

    if (!conflict.length) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const con = conflict[0];

    // Update conflict with manual resolution
    await db
      .update(documentConflicts)
      .set({
        resolvedVersion: resolvedContent,
        status: 'resolved',
        resolvedAt: new Date(),
      })
      .where(eq(documentConflicts.id, conflictId));

    // Update sync metadata
    await db
      .update(syncMetadata)
      .set({
        conflictStatus: 'resolved',
        updatedAt: new Date(),
      })
      .where(eq(syncMetadata.documentId, con.documentId));

    // Update document to resolved version
    await db.update(documents).set(resolvedContent).where(eq(documents.id, con.documentId));

    return {
      ...con,
      resolvedVersion: resolvedContent,
      status: 'resolved',
      resolvedAt: new Date(),
    };
  }

  /**
   * Get unresolved conflicts for a user
   */
  async getUnresolvedConflicts(userId: string) {
    return db
      .select({
        id: documentConflicts.id,
        documentId: documentConflicts.documentId,
        title: documents.title,
        baseVersion: documentConflicts.baseVersion,
        androidVersion: documentConflicts.androidVersion,
        webVersion: documentConflicts.webVersion,
        createdAt: documentConflicts.createdAt,
      })
      .from(documentConflicts)
      .innerJoin(documents, eq(documentConflicts.documentId, documents.id))
      .where(and(eq(documents.ownerId, userId), eq(documentConflicts.status, 'unresolved')))
      .orderBy(desc(documentConflicts.createdAt));
  }

  /**
   * Get conflict history for a document
   */
  async getConflictHistory(documentId: string, limit: number = 50) {
    return db
      .select()
      .from(documentConflicts)
      .where(eq(documentConflicts.documentId, documentId))
      .orderBy(desc(documentConflicts.createdAt))
      .limit(limit);
  }

  /**
   * Get or create device preferences for user
   */
  async getDevicePreferences(userId: string): Promise<DevicePreferences> {
    const user = await db.select({ settings: users.settings }).from(users).where(eq(users.id, userId));

    if (!user.length) {
      throw new Error(`User ${userId} not found`);
    }

    const settings = user[0].settings as Record<string, unknown>;
    const devicePrefs = (settings.devicePreferences as Partial<DevicePreferences>) || {};

    return {
      userId,
      androidPriority: (devicePrefs.androidPriority as number) || 50,
      webPriority: (devicePrefs.webPriority as number) || 50,
      autoResolve: (devicePrefs.autoResolve as boolean) || false,
      conflictResolutionMode: (devicePrefs.conflictResolutionMode as 'last-write-wins' | '3way-merge' | 'device-priority') || 'last-write-wins',
    };
  }

  /**
   * Update device preferences for user
   */
  async updateDevicePreferences(userId: string, preferences: Partial<DevicePreferences>) {
    const user = await db.select({ settings: users.settings }).from(users).where(eq(users.id, userId));

    if (!user.length) {
      throw new Error(`User ${userId} not found`);
    }

    const settings = (user[0].settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...settings,
      devicePreferences: {
        ...(settings.devicePreferences as Record<string, unknown>),
        ...preferences,
      },
    };

    await db.update(users).set({ settings: updatedSettings }).where(eq(users.id, userId));
  }
}

export const conflictResolutionService = new ConflictResolutionService();
