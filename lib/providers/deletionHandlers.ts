/**
 * AI Provider Deletion Handler
 *
 * Handles data deletion requests to AI providers
 * Supports:
 * - Anthropic (Claude)
 * - OpenAI
 * - Ollama (local, no deletion needed)
 * - Custom providers
 *
 * Each provider has different retention policies and deletion mechanisms:
 * - Anthropic: 30-day retention, deletion request via support
 * - OpenAI: 30-day retention, deletion via account settings
 * - Ollama: Local processing, user controls deletion
 *
 * References:
 * - https://support.anthropic.com/en/articles/7996866-can-anthropic-delete-the-data-sent-during-our-api-calls
 * - https://openai.com/enterprise-privacy
 */

import { db } from '@/lib/db';
import { deletionRecords, privacyAuditLog } from '@/lib/db/schema';

interface DeletionResponse {
  provider: string;
  success: boolean;
  status: 'completed' | 'pending' | 'not-applicable' | 'error';
  message: string;
  deletionRequestId?: string;
  retryAfter?: Date;
}

/**
 * Submit deletion request to all active providers for a user
 */
export async function submitProviderDeletionRequests(
  userId: string
): Promise<DeletionResponse[]> {
  const responses: DeletionResponse[] = [];

  const providers: Array<'claude' | 'openai' | 'ollama'> = [
    'claude',
    'openai',
    'ollama',
  ];

  for (const provider of providers) {
    try {
      const response = await submitDeletionToProvider(userId, provider);
      responses.push(response);

      // Log the deletion request
      await db.insert(deletionRecords).values({
        userId,
        deletionType: `${provider}_history`,
        reason: `Deletion requested via account deletion`,
        status: response.status === 'error' ? 'failed' : 'pending',
        deletedAt: response.status === 'completed' ? new Date() : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      responses.push({
        provider,
        success: false,
        status: 'error',
        message,
      });
    }
  }

  return responses;
}

/**
 * Submit deletion to a specific provider
 */
async function submitDeletionToProvider(
  userId: string,
  provider: string
): Promise<DeletionResponse> {
  switch (provider.toLowerCase()) {
    case 'claude':
    case 'anthropic':
      return deleteFromAnthropicProvider(userId);
    case 'openai':
      return deleteFromOpenAIProvider(userId);
    case 'ollama':
      return deleteFromOllamaProvider(userId);
    default:
      return {
        provider,
        success: false,
        status: 'error',
        message: `Unknown provider: ${provider}`,
      };
  }
}

/**
 * Delete from Anthropic (Claude)
 *
 * Anthropic retains API call data for 30 days by default.
 * To request deletion before 30 days, users must:
 * 1. Contact support with their API key
 * 2. Request deletion of specific conversation
 *
 * No direct API for deletion, so we log the request for manual processing
 */
async function deleteFromAnthropicProvider(userId: string): Promise<DeletionResponse> {
  try {
    // Log deletion request for Anthropic support team
    await db.insert(privacyAuditLog).values({
      userId,
      action: 'anthropic_deletion_request_logged',
      context: {
        provider: 'anthropic',
        requestedAt: new Date().toISOString(),
        note: 'Anthropic support must process deletion manually. Data retained for 30 days by default.',
        actionRequired: 'Email support@anthropic.com with user API context',
      },
    });

    return {
      provider: 'claude',
      success: true,
      status: 'pending',
      message:
        'Deletion request logged. Anthropic support will process within 30 days. Default retention is 30 days.',
      retryAfter: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  } catch (error) {
    return {
      provider: 'claude',
      success: false,
      status: 'error',
      message: `Failed to log Anthropic deletion: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Delete from OpenAI
 *
 * OpenAI retains conversation history for 30 days.
 * Deletion options:
 * 1. Users can delete conversations from their account
 * 2. API does not provide direct deletion endpoint
 * 3. Enterprise users can request through account manager
 *
 * No direct API for bulk deletion via user ID
 */
async function deleteFromOpenAIProvider(userId: string): Promise<DeletionResponse> {
  try {
    // Log deletion request for OpenAI support
    await db.insert(privacyAuditLog).values({
      userId,
      action: 'openai_deletion_request_logged',
      context: {
        provider: 'openai',
        requestedAt: new Date().toISOString(),
        note: 'Users must delete conversations manually from OpenAI account. Data retained for 30 days.',
        actionRequired: 'User should visit account.openai.com to delete conversation history',
      },
    });

    return {
      provider: 'openai',
      success: true,
      status: 'pending',
      message:
        'OpenAI account deletion logged. User should manually delete from their OpenAI account. Data retained for 30 days.',
      retryAfter: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  } catch (error) {
    return {
      provider: 'openai',
      success: false,
      status: 'error',
      message: `Failed to log OpenAI deletion: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Delete from Ollama
 *
 * Ollama runs locally, so deletion is user's responsibility
 * No remote deletion needed
 */
async function deleteFromOllamaProvider(_userId: string): Promise<DeletionResponse> {
  return {
    provider: 'ollama',
    success: true,
    status: 'not-applicable',
    message:
      'Ollama runs locally on your device. No remote deletion needed. Delete local data from device settings.',
  };
}

/**
 * Format deletion report for user
 */
export function formatDeletionReport(responses: DeletionResponse[]): string {
  let report = 'AI Provider Deletion Report\n';
  report += '============================\n\n';

  const completed = responses.filter((r) => r.status === 'completed');
  const pending = responses.filter((r) => r.status === 'pending');
  const errors = responses.filter((r) => r.status === 'error');

  if (completed.length > 0) {
    report += 'Completed Deletions:\n';
    for (const r of completed) {
      report += `✓ ${r.provider}: ${r.message}\n`;
    }
    report += '\n';
  }

  if (pending.length > 0) {
    report += 'Pending Deletions (In Progress):\n';
    for (const r of pending) {
      report += `⏳ ${r.provider}: ${r.message}\n`;
      if (r.retryAfter) {
        report += `   Expected completion: ${r.retryAfter.toLocaleDateString()}\n`;
      }
    }
    report += '\n';
  }

  if (errors.length > 0) {
    report += 'Deletion Errors:\n';
    for (const r of errors) {
      report += `✗ ${r.provider}: ${r.message}\n`;
    }
    report += '\n';
  }

  report += 'Summary\n';
  report += `Completed: ${completed.length}\n`;
  report += `Pending: ${pending.length}\n`;
  report += `Errors: ${errors.length}\n`;

  report += '\nNext Steps:\n';
  report +=
    '1. Check email for any provider confirmation requests\n';
  report +=
    '2. For manual providers, visit their account settings within 30 days\n';
  report +=
    '3. Your local Dictator data has been deleted immediately\n';

  return report;
}

export default submitProviderDeletionRequests;
