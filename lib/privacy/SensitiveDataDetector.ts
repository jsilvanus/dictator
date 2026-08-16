/**
 * Sensitive Data Detector
 * Scans content for personally identifiable information (PII) and credentials
 * Helps warn users before sending content to cloud AI providers
 */

import type { DetectedSensitiveData, SensitiveDataScanResult, SensitiveDataType } from './types';

/**
 * Pattern definitions for different types of sensitive data
 */
interface SensitivePattern {
  type: SensitiveDataType;
  pattern: RegExp;
  confidence: number; // 0-1, how confident we are this is a match
  description: string;
}

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // Credit card patterns (various formats)
  {
    type: 'credit-card',
    pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
    confidence: 0.9,
    description: 'Credit card number',
  },
  {
    type: 'credit-card',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g,
    confidence: 0.95,
    description: 'Credit card number (detected format)',
  },

  // US Social Security Number
  {
    type: 'ssn',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    confidence: 0.85,
    description: 'US Social Security Number',
  },
  {
    type: 'ssn',
    pattern: /\b(?!000|666)\d{3}(?!00)\d{2}(?!0000)\d{4}\b/g,
    confidence: 0.7,
    description: 'Possible US Social Security Number',
  },

  // Phone numbers (US format and variations)
  {
    type: 'phone',
    pattern: /\b(?:\+?1[-.\s]?)?\(?(?:201|202|203|206|207|208|209|210|212|213|214|215|216|217|218|219|220|224|225|228|229|231|234|240|248|251|252|253|254|256|260|262|267|269|270|271|274|276|281|282|283|301|302|303|304|305|306|307|308|309|310|312|313|314|315|316|317|318|319|320|321|323|324|325|326|327|330|331|334|336|337|339|340|341|342|346|347|351|352|360|361|364|365|369|380|385|386|401|402|404|405|406|407|408|409|410|412|413|414|415|416|417|419|423|424|425|428|430|432|434|435|440|442|443|445|458|470|472|475|478|479|480|484|501|502|503|504|505|506|507|508|509|510|512|513|515|516|517|518|519|520|530|540|541|551|559|561|562|563|564|567|570|571|573|574|575|580|581|585|586|601|602|603|605|606|607|608|609|610|612|613|614|615|616|617|618|619|620|623|626|628|629|630|631|636|641|646|650|651|660|661|662|667|670|671|678|679|680|681|682|684|701|702|703|704|705|706|707|708|709|712|713|714|715|716|717|718|719|720|721|724|725|727|730|731|732|734|740|743|747|754|757|760|762|763|765|769|770|771|772|773|774|775|776|778|779|780|781|782|783|784|785|786|787|801|802|803|804|805|806|807|808|809|810|812|813|814|815|816|817|818|820|821|823|824|825|828|830|831|832|833|835|843|844|845|847|848|850|856|857|858|859|860|862|863|864|865|870|872|878|880|881|882|883|884|885|886|887|888|900|901|902|903|904|905|906|907|908|909|910|912|913|914|915|916|917|918|919|920|925|928|929|931|934|936|937|938|940|941|947|949|951|952|954|956|959|970|971|972|973|975|978|979|980|984|985|986|989)\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    confidence: 0.75,
    description: 'Phone number',
  },

  // Email addresses
  {
    type: 'email',
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    confidence: 0.9,
    description: 'Email address',
  },

  // API Keys and authentication tokens
  {
    type: 'api-key',
    pattern: /(?:api[_-]?key|apikey)[:\s=]+['"]?([a-zA-Z0-9]{20,})/gi,
    confidence: 0.8,
    description: 'API key',
  },
  {
    type: 'api-key',
    pattern: /sk-[A-Za-z0-9]{20,}/g,
    confidence: 0.85,
    description: 'OpenAI API key',
  },

  // Password indicators
  {
    type: 'password',
    pattern: /(?:password|passwd|pwd)[:\s=]+[^\s\n]{6,}/gi,
    confidence: 0.7,
    description: 'Password field',
  },

  // ****** (JWT-like)
  {
    type: 'jwt-token',
    pattern: /bearer\s+[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_.]+/gi,
    confidence: 0.85,
    description: 'JWT token',
  },
  {
    type: 'jwt-token',
    pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    confidence: 0.9,
    description: 'JWT token',
  },

  // Auth headers (Authorization: scheme token)
  {
    type: 'auth-header',
    pattern: /authorization[:\s=]+(?:Bearer|Basic|Digest)\s+[a-zA-Z0-9\-_.=+/]+/gi,
    confidence: 0.85,
    description: 'Authorization header',
  },

  // Private keys (PEM format and OpenSSH)
  {
    type: 'private-key',
    pattern: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY/gi,
    confidence: 0.95,
    description: 'Private key',
  },

  // AWS credentials
  {
    type: 'api-key',
    pattern: /(?:aws_access_key_id|AKIA)[A-Z0-9]{16}/g,
    confidence: 0.9,
    description: 'AWS access key',
  },

  // Database connection strings
  {
    type: 'database-connection',
    pattern: /(?:mongodb|mysql|postgres|postgresql|redis|mongodb\+srv)[:\/]+[a-zA-Z0-9_-]+:[a-zA-Z0-9_!@#$%^&*-]+@/gi,
    confidence: 0.85,
    description: 'Database connection string',
  },
];

/**
 * Sensitive data detector service
 */
export class SensitiveDataDetector {
  private customPatterns: SensitivePattern[] = [];
  private scannerVersion: string = '1.0.0';

  constructor(customPatterns?: SensitivePattern[]) {
    if (customPatterns) {
      this.customPatterns = customPatterns;
    }
  }

  /**
   * Scan content for sensitive data
   * @param content The content to scan
   * @returns Scan result with detected sensitive data
   */
  scan(content: string): SensitiveDataScanResult {
    const detected: DetectedSensitiveData[] = [];
    const allPatterns = [...SENSITIVE_PATTERNS, ...this.customPatterns];

    for (const { type, pattern, confidence } of allPatterns) {
      let match;
      // Reset regex lastIndex for global patterns
      if (pattern.global) {
        pattern.lastIndex = 0;
      }

      while ((match = pattern.exec(content)) !== null) {
        const snippet = this.truncateSnippet(match[0], 50);
        detected.push({
          type,
          snippet,
          position: match.index,
          confidence,
        });
      }
    }

    // Remove duplicates (same position and type)
    const deduplicated = this.deduplicateDetections(detected);

    return {
      hasSensitiveData: deduplicated.length > 0,
      detected: deduplicated,
      scannedAt: Date.now(),
      scannerVersion: this.scannerVersion,
    };
  }

  /**
   * Scan content and get a human-readable warning message
   */
  getScanWarning(content: string): string | null {
    const result = this.scan(content);

    if (!result.hasSensitiveData) {
      return null;
    }

    // Group by type
    const byType = new Map<SensitiveDataType, number>();
    for (const item of result.detected) {
      byType.set(item.type, (byType.get(item.type) || 0) + 1);
    }

    const typeDescriptions = Array.from(byType.entries())
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');

    return `⚠️ Sensitive data detected: ${typeDescriptions}. Do you want to redact this before sending?`;
  }

  /**
   * Add custom pattern for organization-specific sensitive data
   */
  addCustomPattern(
    type: SensitiveDataType,
    pattern: RegExp,
    confidence: number = 0.8,
    description?: string
  ): void {
    this.customPatterns.push({
      type,
      pattern,
      confidence,
      description: description || type,
    });
  }

  /**
   * Redact detected sensitive data from content
   */
  redact(content: string, replacement: string = '[REDACTED]'): string {
    const result = this.scan(content);
    let redacted = content;

    // Sort by position descending so we don't mess up indices
    const sorted = [...result.detected].sort((a, b) => b.position - a.position);

    for (const item of sorted) {
      // Find and replace the actual sensitive data
      // This is approximate since we truncated the snippet
      const allPatterns = [...SENSITIVE_PATTERNS, ...this.customPatterns];
      for (const { type, pattern } of allPatterns) {
        if (type === item.type) {
          if (pattern.global) {
            pattern.lastIndex = 0;
          }
          redacted = redacted.replace(pattern, replacement);
        }
      }
    }

    return redacted;
  }

  /**
   * Truncate snippet for display (don't expose full sensitive data)
   */
  private truncateSnippet(snippet: string, maxLength: number): string {
    if (snippet.length <= maxLength) {
      return snippet;
    }
    const start = Math.max(0, Math.floor(maxLength / 2) - 5);
    return snippet.substring(start, start + maxLength) + '...';
  }

  /**
   * Remove duplicate detections
   */
  private deduplicateDetections(detected: DetectedSensitiveData[]): DetectedSensitiveData[] {
    const seen = new Set<string>();
    const deduped: DetectedSensitiveData[] = [];

    for (const item of detected) {
      const key = `${item.type}:${item.position}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    return deduped;
  }
}

/**
 * Create a default detector instance
 */
export function createDefaultDetector(): SensitiveDataDetector {
  return new SensitiveDataDetector();
}

/**
 * Quick helper function to scan content
 */
export function scanForSensitiveData(content: string): SensitiveDataScanResult {
  const detector = createDefaultDetector();
  return detector.scan(content);
}

/**
 * Quick helper function to get warning message
 */
export function getSensitiveDataWarning(content: string): string | null {
  const detector = createDefaultDetector();
  return detector.getScanWarning(content);
}
