/**
 * Document manipulation tools for searching and accessing document content
 * Supports document search, section retrieval, and paragraph access
 */

import { RegisteredTool } from './types';

/**
 * In-memory document store (shared with text-tools)
 * Maps documentId to document content
 */
const documentStore: Map<string, string> = new Map();

/**
 * Get document content from store
 * @param documentId - The document ID
 * @returns Document content or undefined if not found
 */
function getDocumentContent(documentId: string): string | undefined {
  return documentStore.get(documentId);
}

/**
 * Store document content
 * @param documentId - The document ID
 * @param content - The document content
 */
function setDocumentContent(documentId: string, content: string): void {
  documentStore.set(documentId, content);
}

/**
 * Search document tool
 * Searches for a query string within a document and returns matches with context
 */
export const searchDocumentTool: RegisteredTool = {
  name: 'search_document',
  description: 'Search for text within a document and return matching sections',
  inputSchema: {
    type: 'object' as const,
    properties: {
      documentId: {
        type: 'string',
        description: 'The ID of the document to search',
      },
      query: {
        type: 'string',
        description: 'The text to search for',
      },
      contextLines: {
        type: 'number',
        description: 'Number of lines of context around match (default: 2)',
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Whether search is case-sensitive (default: false)',
      },
    },
    required: ['documentId', 'query'],
  },
  handler: async (args: Record<string, unknown>): Promise<unknown> => {
    const documentId = args.documentId as string;
    const query = args.query as string;
    const contextLines = (args.contextLines as number) || 2;
    const caseSensitive = (args.caseSensitive as boolean) || false;

    // Validate inputs
    if (!documentId || typeof documentId !== 'string') {
      return { success: false, error: 'Invalid documentId' };
    }

    if (!query || typeof query !== 'string') {
      return { success: false, error: 'Invalid query: must be non-empty string' };
    }

    // Get document
    const content = getDocumentContent(documentId);
    if (!content) {
      return { success: false, error: `Document not found: ${documentId}` };
    }

    try {
      const lines = content.split('\n');
      const searchQuery = caseSensitive ? query : query.toLowerCase();
      const matches: Array<{ lineNumber: number; text: string; context: string[] }> = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const searchLine = caseSensitive ? line : line.toLowerCase();

        if (searchLine.includes(searchQuery)) {
          const contextStart = Math.max(0, i - contextLines);
          const contextEnd = Math.min(lines.length, i + contextLines + 1);
          const context = lines.slice(contextStart, contextEnd);

          matches.push({
            lineNumber: i + 1,
            text: line,
            context,
          });
        }
      }

      return {
        success: true,
        result: {
          documentId,
          query,
          matchCount: matches.length,
          matches: matches.slice(0, 50), // Limit to first 50 matches
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Get document section tool
 * Retrieves a section of the document by offset and length
 */
export const getDocumentSectionTool: RegisteredTool = {
  name: 'get_document_section',
  description: 'Get a specific section of a document by character offset and length',
  inputSchema: {
    type: 'object' as const,
    properties: {
      documentId: {
        type: 'string',
        description: 'The ID of the document',
      },
      offset: {
        type: 'number',
        description: 'Starting character position (0-based)',
      },
      length: {
        type: 'number',
        description: 'Number of characters to retrieve',
      },
    },
    required: ['documentId', 'offset', 'length'],
  },
  handler: async (args: Record<string, unknown>): Promise<unknown> => {
    const documentId = args.documentId as string;
    const offset = args.offset as number;
    const length = args.length as number;

    // Validate inputs
    if (!documentId || typeof documentId !== 'string') {
      return { success: false, error: 'Invalid documentId' };
    }

    if (typeof offset !== 'number' || offset < 0) {
      return { success: false, error: 'Invalid offset: must be non-negative number' };
    }

    if (typeof length !== 'number' || length < 0) {
      return { success: false, error: 'Invalid length: must be non-negative number' };
    }

    // Get document
    const content = getDocumentContent(documentId);
    if (!content) {
      return { success: false, error: `Document not found: ${documentId}` };
    }

    try {
      // Validate bounds
      if (offset > content.length) {
        return { success: false, error: 'Offset exceeds document length' };
      }

      const actualLength = Math.min(length, content.length - offset);
      const section = content.substring(offset, offset + actualLength);

      return {
        success: true,
        result: {
          documentId,
          offset,
          requestedLength: length,
          actualLength,
          section,
          documentLength: content.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Get paragraph tool
 * Retrieves a specific paragraph from the document
 */
export const getParagraphTool: RegisteredTool = {
  name: 'get_paragraph',
  description: 'Get a specific paragraph from a document by index',
  inputSchema: {
    type: 'object' as const,
    properties: {
      documentId: {
        type: 'string',
        description: 'The ID of the document',
      },
      index: {
        type: 'number',
        description: 'Paragraph index (0-based)',
      },
      includeSurrounding: {
        type: 'boolean',
        description: 'Include previous and next paragraphs (default: false)',
      },
    },
    required: ['documentId', 'index'],
  },
  handler: async (args: Record<string, unknown>): Promise<unknown> => {
    const documentId = args.documentId as string;
    const index = args.index as number;
    const includeSurrounding = (args.includeSurrounding as boolean) || false;

    // Validate inputs
    if (!documentId || typeof documentId !== 'string') {
      return { success: false, error: 'Invalid documentId' };
    }

    if (typeof index !== 'number' || index < 0) {
      return { success: false, error: 'Invalid index: must be non-negative number' };
    }

    // Get document
    const content = getDocumentContent(documentId);
    if (!content) {
      return { success: false, error: `Document not found: ${documentId}` };
    }

    try {
      // Split into paragraphs (separated by blank lines)
      const paragraphs = content.split(/\n\s*\n/);

      if (index >= paragraphs.length) {
        return { success: false, error: `Paragraph index ${index} out of range (0-${paragraphs.length - 1})` };
      }

      const result: Record<string, unknown> = {
        documentId,
        index,
        totalParagraphs: paragraphs.length,
        paragraph: paragraphs[index],
      };

      if (includeSurrounding) {
        if (index > 0) {
          result.previous = paragraphs[index - 1];
        }
        if (index < paragraphs.length - 1) {
          result.next = paragraphs[index + 1];
        }
      }

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Register document tools
 */
export function registerDocumentTools(): void {
  const { registerTool } = require('./registry');
  registerTool(searchDocumentTool);
  registerTool(getDocumentSectionTool);
  registerTool(getParagraphTool);
}

/**
 * Export document store functions for testing and initialization
 */
export function setTestDocument(documentId: string, content: string): void {
  setDocumentContent(documentId, content);
}

export function getTestDocument(documentId: string): string | undefined {
  return getDocumentContent(documentId);
}

export function clearTestDocuments(): void {
  documentStore.clear();
}
