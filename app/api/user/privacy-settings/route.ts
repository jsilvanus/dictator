/**
 * POST /api/user/privacy-settings
 * GET /api/user/privacy-settings
 *
 * Manages user privacy and data collection preferences
 * Settings control:
 * - Telemetry collection
 * - Sensitive data detection
 * - Backup policies
 * - AI session retention
 * - Data encryption
 */

import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { userPrivacySettings } from '@/lib/db/schema';
import type { UserPrivacySettings } from '@/lib/privacy/types';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const settings = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, session.user.id))
      .limit(1);

    if (!settings || settings.length === 0) {
      return NextResponse.json(
        { message: 'Privacy settings not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error('[GET /api/user/privacy-settings] Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch privacy settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userId = session.user.id;

    // Validate settings object
    const settingsData: Partial<UserPrivacySettings> = {
      userId,
      telemetryEnabled: body.telemetryEnabled ?? false,
      crashReportsEnabled: body.crashReportsEnabled ?? false,
      sensitiveDataDetectionEnabled: body.sensitiveDataDetectionEnabled ?? true,
      warnBeforeSendingToCloud: body.warnBeforeSendingToCloud ?? true,
      allowDataForTraining: body.allowDataForTraining ?? false,
      backupEncryptionRequired: body.backupEncryptionRequired ?? true,
      autoDeleteAiSessions: body.autoDeleteAiSessions ?? false,
      aiSessionRetentionDays: Math.max(1, Math.min(365, body.aiSessionRetentionDays ?? 30)),
      preferLocalProcessing: body.preferLocalProcessing ?? true,
      encryptLocalStorage: body.encryptLocalStorage ?? true,
      updatedAt: Date.now(),
    };

    // Check if settings exist
    const existing = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, userId))
      .limit(1);

    let result;
    if (existing && existing.length > 0) {
      // Update existing settings
      result = await db
        .update(userPrivacySettings)
        .set({
          telemetryEnabled: settingsData.telemetryEnabled ?? false,
          crashReportsEnabled: settingsData.crashReportsEnabled ?? false,
          sensitiveDataDetectionEnabled: settingsData.sensitiveDataDetectionEnabled ?? true,
          warnBeforeSendingToCloud: settingsData.warnBeforeSendingToCloud ?? true,
          allowDataForTraining: settingsData.allowDataForTraining ?? false,
          backupEncryptionRequired: settingsData.backupEncryptionRequired ?? true,
          autoDeleteAiSessions: settingsData.autoDeleteAiSessions ?? false,
          aiSessionRetentionDays: settingsData.aiSessionRetentionDays ?? 30,
          preferLocalProcessing: settingsData.preferLocalProcessing ?? true,
          encryptLocalStorage: settingsData.encryptLocalStorage ?? true,
          updatedAt: new Date(),
        })
        .where(eq(userPrivacySettings.userId, userId))
        .returning();
    } else {
      // Create new settings
      result = await db
        .insert(userPrivacySettings)
        .values({
          userId,
          telemetryEnabled: settingsData.telemetryEnabled ?? false,
          crashReportsEnabled: settingsData.crashReportsEnabled ?? false,
          sensitiveDataDetectionEnabled: settingsData.sensitiveDataDetectionEnabled ?? true,
          warnBeforeSendingToCloud: settingsData.warnBeforeSendingToCloud ?? true,
          allowDataForTraining: settingsData.allowDataForTraining ?? false,
          backupEncryptionRequired: settingsData.backupEncryptionRequired ?? true,
          autoDeleteAiSessions: settingsData.autoDeleteAiSessions ?? false,
          aiSessionRetentionDays: settingsData.aiSessionRetentionDays ?? 30,
          preferLocalProcessing: settingsData.preferLocalProcessing ?? true,
          encryptLocalStorage: settingsData.encryptLocalStorage ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    if (!result || result.length === 0) {
      return NextResponse.json(
        { message: 'Failed to save privacy settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('[POST /api/user/privacy-settings] Error:', error);
    return NextResponse.json(
      { message: 'Failed to save privacy settings' },
      { status: 500 }
    );
  }
}
