/**
 * Export Format Types and Interfaces
 * Defines the abstract interface for different export formats and implementations
 */

import type { AiContentSource, AiRequestScope } from '@/lib/privacy/types';

export type ExportFormat = 'json' | 'markdown' | 'csv' | 'pdf' | 'html' | 'zip';

export interface ProvenanceMetadata {
  source: AiContentSource;
  confidence?: number;
  contentScope?: AiRequestScope;
  device: string;
  reviewedAt?: number;
  thinkingBudgetTokens?: number;
  createdAt: number;
}

export interface AiHistoryItem {
  sessionId: string;
  turnIndex: number;
  userMessage: string;
  assistantResponse: string;
  model?: string;
  provider?: string;
  provenance: ProvenanceMetadata | null;
}

export interface DocumentExportData {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
  aiHistory: AiHistoryItem[];
  auditLog?: Array<{
    timestamp: Date;
    action: string;
    context?: Record<string, unknown>;
  }>;
}

/**
 * Abstract export format interface
 */
export interface IExportFormat {
  format: ExportFormat;
  mimeType: string;
  fileExtension: string;
  
  /**
   * Export document to this format
   */
  export(data: DocumentExportData): Promise<Buffer | string>;
  
  /**
   * Get filename for exported file
   */
  getFilename(documentTitle: string): string;
}

/**
 * JSON Export Format
 * Comprehensive JSON with all metadata and provenance data
 */
export class JsonExportFormat implements IExportFormat {
  format: ExportFormat = 'json';
  mimeType = 'application/json';
  fileExtension = 'json';

  async export(data: DocumentExportData): Promise<string> {
    const exportData = {
      document: {
        id: data.id,
        title: data.title,
        wordCount: data.wordCount,
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
      },
      content: data.content,
      aiHistory: {
        totalTurns: data.aiHistory.length,
        turns: data.aiHistory.map((turn) => ({
          sessionId: turn.sessionId,
          turnIndex: turn.turnIndex,
          userMessage: turn.userMessage,
          assistantResponse: turn.assistantResponse,
          model: turn.model,
          provider: turn.provider,
          provenance: turn.provenance ? {
            source: turn.provenance.source,
            confidence: turn.provenance.confidence,
            contentScope: turn.provenance.contentScope,
            device: turn.provenance.device,
            reviewedAt: turn.provenance.reviewedAt,
            thinkingBudgetTokens: turn.provenance.thinkingBudgetTokens,
            createdAt: new Date(turn.provenance.createdAt).toISOString(),
          } : null,
        })),
      },
      auditLog: data.auditLog ? {
        totalEvents: data.auditLog.length,
        events: data.auditLog.map((entry) => ({
          timestamp: entry.timestamp.toISOString(),
          action: entry.action,
          context: entry.context,
        })),
      } : undefined,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportFormat: 'json-provenance-v1',
        includesAiHistory: data.aiHistory.length > 0,
        includesAuditTrail: (data.auditLog?.length || 0) > 0,
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  getFilename(documentTitle: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitized = documentTitle.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    return `${sanitized || 'document'}-${timestamp}-export.json`;
  }
}

/**
 * Markdown Export Format with Annotations
 * Document content with HTML comments containing provenance metadata
 */
export class MarkdownExportFormat implements IExportFormat {
  format: ExportFormat = 'markdown';
  mimeType = 'text/markdown';
  fileExtension = 'md';

  async export(data: DocumentExportData): Promise<string> {
    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`title: ${data.title}`);
    lines.push(`date: ${data.createdAt.toISOString()}`);
    lines.push(`modified: ${data.updatedAt.toISOString()}`);
    lines.push(`word_count: ${data.wordCount}`);
    lines.push(`ai_turns: ${data.aiHistory.length}`);
    lines.push('---');
    lines.push('');

    // Header
    lines.push(`# ${data.title}`);
    lines.push('');
    lines.push(
      `_Document created: ${data.createdAt.toLocaleDateString()} | Modified: ${data.updatedAt.toLocaleDateString()}_`
    );
    lines.push('');

    // Content with provenance annotations
    lines.push('## Document Content');
    lines.push('');
    lines.push(data.content);
    lines.push('');

    // AI History Section
    if (data.aiHistory.length > 0) {
      lines.push('## AI Interaction History');
      lines.push('');

      data.aiHistory.forEach((turn, idx) => {
        if (turn.provenance) {
          lines.push(
            `<!-- AI-TURN-${idx} source=${turn.provenance.source} confidence=${
              turn.provenance.confidence ?? 'unknown'
            } device=${turn.provenance.device} timestamp=${new Date(turn.provenance.createdAt).toISOString()} -->`
          );
        }

        lines.push(`### Turn ${idx + 1}`);
        lines.push('');
        lines.push('**User Message:**');
        lines.push('```');
        lines.push(turn.userMessage);
        lines.push('```');
        lines.push('');

        lines.push('**AI Response:**');
        lines.push('```');
        lines.push(turn.assistantResponse);
        lines.push('```');
        lines.push('');

        if (turn.provenance) {
          lines.push('**Metadata:**');
          lines.push(`- Source: ${turn.provenance.source}`);
          if (turn.provenance.confidence !== undefined) {
            lines.push(`- Confidence: ${Math.round(turn.provenance.confidence * 100)}%`);
          }
          lines.push(`- Scope: ${turn.provenance.contentScope || 'unknown'}`);
          lines.push(`- Device: ${turn.provenance.device}`);
          if (turn.provenance.thinkingBudgetTokens) {
            lines.push(`- Thinking Tokens: ${turn.provenance.thinkingBudgetTokens}`);
          }
          lines.push('');
        }
      });
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Exported with full AI provenance metadata*');

    return lines.join('\n');
  }

  getFilename(documentTitle: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitized = documentTitle.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    return `${sanitized || 'document'}-${timestamp}-export.md`;
  }
}

/**
 * CSV Export Format
 * Timeline of edits and AI turns for spreadsheet import
 */
export class CsvExportFormat implements IExportFormat {
  format: ExportFormat = 'csv';
  mimeType = 'text/csv';
  fileExtension = 'csv';

  async export(data: DocumentExportData): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push(
      'timestamp,type,author,source,confidence,model,text_preview,device,content_scope'
    );

    // AI History rows
    data.aiHistory.forEach((turn) => {
      if (turn.provenance) {
        const row = [
          new Date(turn.provenance.createdAt).toISOString(),
          'ai-turn',
          turn.provider || 'unknown',
          turn.provenance.source,
          turn.provenance.confidence ?? '',
          turn.model || '',
          `"${this.escapeQuotes(turn.assistantResponse.substring(0, 100))}"`,
          turn.provenance.device,
          turn.provenance.contentScope || '',
        ];
        lines.push(row.join(','));
      }
    });

    return lines.join('\n');
  }

  private escapeQuotes(text: string): string {
    return text.replace(/"/g, '""');
  }

  getFilename(documentTitle: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitized = documentTitle.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    return `${sanitized || 'document'}-${timestamp}-timeline.csv`;
  }
}

/**
 * Export format registry and factory
 */
export const ExportFormatRegistry = {
  json: () => new JsonExportFormat(),
  markdown: () => new MarkdownExportFormat(),
  csv: () => new CsvExportFormat(),
};

export function getExportFormat(format: ExportFormat): IExportFormat {
  const registry = ExportFormatRegistry as Record<string, () => IExportFormat>;
  const factory = registry[format];
  if (!factory) {
    throw new Error(`Unknown export format: ${format}`);
  }
  return factory();
}
