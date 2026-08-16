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

import { eq, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import { aiSessions, privacyAuditLog,userPrivacySettings } from '@/lib/db/schema';

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
      .from(aiSessions)
      .where(lt(aiSessions.createdAt, cutoffDate));

    // Delete old sessions and their turns
    for (const session of oldTurns) {
      try {
        // Calculate bytes being freed from all turns in the session
        const sessionSize = (session.turns || []).reduce((total, turn) => {
          return total + (turn.content?.length || 0);
        }, 0);

        // Delete from database
        await db.delete(aiSessions).where(eq(aiSessions.id, session.id));

        result.requestsDeleted += (session.turns || []).length;
        result.bytesFreed += sessionSize;

        // Log deletion
        await db.insert(privacyAuditLog).values({
          userId,
          eventType: 'ephemeral_request_deleted',
          details: {
            sessionId: session.id,
            turnCount: (session.turns || []).length,
            reason: 'Auto-deletion after retention period',
            bytesFreed: sessionSize,
          },
        });
      } catch (error) {
        console.error(`Failed to delete session ${session.id}:`, error);
      }
    }

    result.sessionsCleaned = oldTurns.length > 0 ? 1 : 0;
  } catch (error) {
    console.error(`Failed to cleanup user ${userId}:`, error);
  }

  return result;
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
          .from(aiSessions)
          .where(lt(aiSessions.createdAt, cutoffDate));

        for (const session of oldTurns) {
          const sessionSize = (session.turns || []).reduce((total, turn) => {
            return total + (turn.content?.length || 0);
          }, 0);

          await db.delete(aiSessions).where(eq(aiSessions.id, session.id));

          result.requestsDeleted += (session.turns || []).length;
          result.bytesFreed += sessionSize;

          // Log
          await db.insert(privacyAuditLog).values({
            userId: userSettings.userId,
            eventType: 'ai_session_deleted_by_retention_policy',
            details: {
              sessionId: session.id,
              turnCount: (session.turns || []).length,
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
      userId: 'system' as unknown as string,
      eventType: 'ephemeral_cleanup_job_executed',
      details: {
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
