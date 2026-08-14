/**
 * Ephemeral AI Request Cleanup Job
 *
 * Scheduled job (typically runs hourly) to:
 * - Delete ephemeral AI requests after completion
 * - Clean up temporary prompts and responses
 * - Remove sensitive data from old sessions
 * - Maintain privacy by default retention policies
 *
 * Can be triggered:
 * - By cron job via API route
 * - By database trigger
 * - By message queue (Bull, RabbitMQ, etc.)
 */

import { and, eq, isNull, lt, not } from 'drizzle-orm';

import { db } from '@/lib/db';
import { aiTurns, privacyAuditLog,userPrivacySettings } from '@/lib/db/schema';

interface CleanupResult {
  sessionsCleaned: number;
  requestsDeleted: number;
  bytesFreed: number;
  errors: string[];
  duration: number;
}

/**
 * Main cleanup job
 */
export async function cleanupEphemeralRequests(): Promise<CleanupResult> {
  const startTime = Date.now();
  const result: CleanupResult = {
    sessionsCleaned: 0,
    requestsDeleted: 0,
    bytesFreed: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Get all users with privacy settings
    const allUsers = await db.select().from(userPrivacySettings);

    for (const userSettings of allUsers) {
      try {
        const cleaned = await cleanupUserEphemeralRequests(
          userSettings.userId,
          userSettings.aiSessionRetentionDays,
          userSettings.autoDeleteAiSessions
        );

        result.sessionsCleaned += cleaned.sessionsCleaned;
        result.requestsDeleted += cleaned.requestsDeleted;
        result.bytesFreed += cleaned.bytesFreed;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`User ${userSettings.userId}: ${message}`);
      }
    }

    // Log cleanup job execution
    await logCleanupJob(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Cleanup job failed: ${message}`);
    console.error('[cleanupEphemeralRequests] Error:', error);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Cleanup ephemeral requests for a specific user
 */
async function cleanupUserEphemeralRequests(
  userId: string,
  retentionDays: number,
  autoDelete: boolean
): Promise<{ sessionsCleaned: number; requestsDeleted: number; bytesFreed: number }> {
  const result = {
    sessionsCleaned: 0,
    requestsDeleted: 0,
    bytesFreed: 0,
  };

  if (!autoDelete) {
    return result;
  }

  // Calculate cutoff date
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - retentionMs);

  try {
    // Find old AI turns that should be deleted
    const oldTurns = await db
      .select()
      .from(aiTurns)
      .where(
        and(
          lt(aiTurns.createdAt, cutoffDate),
          // Only delete if explicitly marked as ephemeral or after retention period
          or(
            isEphemeral(aiTurns),
            lt(aiTurns.createdAt, cutoffDate)
          )
        )
      );

    // Delete old turns
    for (const turn of oldTurns) {
      try {
        // Calculate bytes being freed
        const turnSize =
          (turn.userMessage?.length || 0) + (turn.assistantResponse?.length || 0);

        // Delete from database
        await db.delete(aiTurns).where(eq(aiTurns.id, turn.id));

        result.requestsDeleted++;
        result.bytesFreed += turnSize;

        // Log deletion
        await db.insert(privacyAuditLog).values({
          userId,
          action: 'ephemeral_request_deleted',
          context: {
            turnId: turn.id,
            reason: 'Auto-deletion after retention period',
            bytesFreed: turnSize,
          },
        });
      } catch (error) {
        console.error(`Failed to delete turn ${turn.id}:`, error);
      }
    }

    result.sessionsCleaned = oldTurns.length > 0 ? 1 : 0;
  } catch (error) {
    console.error(`Failed to cleanup user ${userId}:`, error);
  }

  return result;
}

/**
 * Helper function to check if a turn is ephemeral
 * In a real implementation, this would check a flag in the turn data
 */
function isEphemeral(turn: any) {
  // This would check: turn.ephemeral || turn.metadata?.ephemeral
  // For now, return false (implement based on schema)
  return false;
}

/**
 * Alternative: use OR condition without the helper
 */
export async function cleanupEphemeralRequestsImproved(): Promise<CleanupResult> {
  const startTime = Date.now();
  const result: CleanupResult = {
    sessionsCleaned: 0,
    requestsDeleted: 0,
    bytesFreed: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Get users with auto-delete enabled
    const usersWithAutoDelete = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.autoDeleteAiSessions, true));

    for (const userSettings of usersWithAutoDelete) {
      const retentionMs = userSettings.aiSessionRetentionDays * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - retentionMs);

      try {
        // Get old turns for this user
        const oldTurns = await db
          .select()
          .from(aiTurns)
          .where(lt(aiTurns.createdAt, cutoffDate));

        for (const turn of oldTurns) {
          const turnSize =
            (turn.userMessage?.length || 0) + (turn.assistantResponse?.length || 0);

          await db.delete(aiTurns).where(eq(aiTurns.id, turn.id));

          result.requestsDeleted++;
          result.bytesFreed += turnSize;

          // Log
          await db.insert(privacyAuditLog).values({
            userId: userSettings.userId,
            action: 'ai_session_deleted_by_retention_policy',
            context: {
              turnId: turn.id,
              retentionDays: userSettings.aiSessionRetentionDays,
              deletedAt: new Date().toISOString(),
            },
          });
        }

        if (oldTurns.length > 0) {
          result.sessionsCleaned++;
        }
      } catch (error) {
        result.errors.push(
          `User ${userSettings.userId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    await logCleanupJob(result);
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : 'Unknown error during cleanup'
    );
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Log cleanup job execution for audit trail
 */
async function logCleanupJob(result: CleanupResult): Promise<void> {
  try {
    await db.insert(privacyAuditLog).values({
      userId: 'system',
      action: 'ephemeral_cleanup_job_executed',
      context: {
        sessionsCleaned: result.sessionsCleaned,
        requestsDeleted: result.requestsDeleted,
        bytesFreed: result.bytesFreed,
        duration: result.duration,
        errorCount: result.errors.length,
        executedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log cleanup job:', error);
  }
}

/**
 * Database trigger alternative (PostgreSQL)
 * This would automatically delete old ephemeral requests
 * 
 * CREATE OR REPLACE FUNCTION delete_ephemeral_ai_turns()
 * RETURNS trigger AS $$
 * BEGIN
 *   IF NEW.ephemeral = true AND NEW.created_at < NOW() - INTERVAL '24 hours' THEN
 *     DELETE FROM ai_turns WHERE id = NEW.id;
 *   END IF;
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql;
 * 
 * CREATE TRIGGER ephemeral_delete_trigger
 * AFTER UPDATE ON ai_turns
 * FOR EACH ROW
 * EXECUTE FUNCTION delete_ephemeral_ai_turns();
 */

export default cleanupEphemeralRequests;
