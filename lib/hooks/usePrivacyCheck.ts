/**
 * usePrivacyCheck Hook
 *
 * React hook for checking sensitive data in content before transmission
 * Provides methods for:
 * - Scanning content for sensitive data
 * - Displaying warnings to users
 * - Redacting sensitive data
 */

'use client';

import { useState, useCallback } from 'react';
import type { DetectedSensitiveData, SensitiveDataType } from '@/lib/privacy/types';

interface CheckSensitiveResponse {
  hasSensitiveData: boolean;
  detectedData: DetectedSensitiveData[];
  dataTypes: SensitiveDataType[];
  warningMessage: string | null;
  confidence: number;
}

interface UsePrivacyCheckOptions {
  enabled?: boolean;
  warnBeforeSending?: boolean;
}

export function usePrivacyCheck(options: UsePrivacyCheckOptions = {}) {
  const { enabled = true, warnBeforeSending = true } = options;

  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<CheckSensitiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Scan content for sensitive data
   */
  const checkSensitiveData = useCallback(
    async (content: string): Promise<CheckSensitiveResponse | null> => {
      if (!enabled || !content || content.length === 0) {
        return null;
      }

      setIsChecking(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/privacy/check-sensitive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            warnBeforeSending,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to check sensitive data');
        }

        const result: CheckSensitiveResponse = await response.json();
        setLastCheck(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [enabled, warnBeforeSending]
  );

  /**
   * Redact sensitive data from content
   */
  const redactSensitiveData = useCallback(
    async (content: string): Promise<string | null> => {
      if (!enabled || !content) {
        return content;
      }

      setIsChecking(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/privacy/redact-sensitive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to redact sensitive data');
        }

        const result = await response.json();
        return result.redactedContent;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [enabled]
  );

  /**
   * Check content and optionally redact
   */
  const checkAndRedact = useCallback(
    async (content: string): Promise<{ redacted: string; hasSensitiveData: boolean } | null> => {
      const check = await checkSensitiveData(content);
      if (!check || !check.hasSensitiveData) {
        return { redacted: content, hasSensitiveData: false };
      }

      const redacted = await redactSensitiveData(content);
      if (redacted === null) {
        return null;
      }

      return { redacted, hasSensitiveData: true };
    },
    [checkSensitiveData, redactSensitiveData]
  );

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setLastCheck(null);
    setError(null);
  }, []);

  return {
    // Methods
    checkSensitiveData,
    redactSensitiveData,
    checkAndRedact,
    reset,

    // State
    isChecking,
    lastCheck,
    error,

    // Derived state
    hasSensitiveData: lastCheck?.hasSensitiveData ?? false,
    detectedDataTypes: lastCheck?.dataTypes ?? [],
  };
}

export default usePrivacyCheck;
