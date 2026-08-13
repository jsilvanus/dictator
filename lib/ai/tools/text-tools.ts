/**
 * Text manipulation tools for editing document content
 * Supports text insertion, deletion, and replacement at specific positions
 */

import { RegisteredTool } from './types';

/**
 * In-memory document store (can be replaced with database)
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
 * Text edit tool - replace text at a position
 * Replaces text at the specified offset for the given length
 */
export const textEditTool: RegisteredTool = {
  name: 'text_edit',
  description: 'Replace text at a specific position in a document',
  inputSchema: {
    type: 'object' as const,
    properties: {
      documentId: {
        type: 'string',
        description: 'The ID of the document to edit',
      },
      offset: {
        type: 'number',
        description: 'Starting position in the text (0-based)',
      },
      length: {
        type: 'number',
        description: 'Number of characters to replace',
      },
      replacement: {
        type: 'string',
        description: 'Text to replace with',
      },
    },
    required: ['documentId', 'offset', 'length', 'replacement'],
  },
  handler: async (args: Record<string, unknown>): Promise<unknown> => {
    const documentId = args.documentId as string;
    const offset = args.offset as number;
    const length = args.length as number;
    const replacement = args.replacement as string;

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

    if (typeof replacement !== 'string') {
      return { success: false, error: 'Invalid replacement: must be string' };
    }

    // Get document
    const content = getDocumentContent(documentId);
    if (!content) {
      return { success: false, error: `Document not found: ${documentId}` };
    }

    // Validate offset and length
    if (offset > content.length) {
      return { success: false, error: 'Offset exceeds document length' };
    }

    if (offset + length > content.length) {
      return { success: false, error: 'Offset + length exceeds document length' };
    }

    try {
      // Perform replacement
      const before = content.substring(0, offset);
      const after = content.substring(offset + length);
      const newContent = before + replacement + after;

      setDocumentContent(documentId, newContent);

      return {
        success: true,
        result: {
          documentId,
          operation: 'edit',
          offset,
          length,
          newLength: newContent.length,
          preview: newContent.substring(Math.max(0, offset - 20), Math.min(newContent.length, offset + replacement.length + 20)),
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
 * Text insert tool - insert text at a position
 * Inserts text at the specified offset
 */
export const textInsertTool: RegisteredTool = {
  name: 'text_insert',
  description: 'Insert text at a specific position in a document',
  inputSchema: {
    type: 'object' as const,
    properties: {
      documentId: {
        type: 'string',
        description: 'The ID of the document to edit',
      },
      offset: {
        type: 'number',
        description: 'Position to insert at (0-based)',
      },
      text: {
        type: 'string',
        description: 'Text to insert',
      },
    },
    required: ['documentId', 'offset', 'text'],
  },
  handler: async (args: Record<string, unknown>): Promise<unknown> => {
    const documentId = args.documentId as string;
    const offset = args.offset as number;
    const text = args.text as string;

    // Validate inputs
    if (!documentId || typeof documentId !== 'string') {
      return { success: false, error: 'Invalid documentId' };
    }

    if (typeof offset !== 'number' || offset < 0) {
      return { success: false, error: 'Invalid offset: must be non-negative number' };
    }

    if (typeof text !== 'string') {
      return { success: false, error: 'Invalid text: must be string' };
    }

    // Get document
    const content = getDocumentContent(documentId);
    if (!content) {
      return { success: false, error: `Document not found: ${documentId}` };
    }

    // Validate offset
    if (offset > content.length) {
      return { success: false, error: 'Offset exceeds document length' };
    }

    try {
      // Perform insertion
      const before = content.substring(0, offset);
      const after = content.substring(offset);
      const newContent = before + text + after;

      setDocumentContent(documentId, newContent);

      return {
        success: true,
        result: {
          documentId,
          operation: 'insert',
          offset,
          insertedLength: text.length,
          newLength: newContent.length,
          preview: newContent.substring(Math.max(0, offset - 20), Math.min(newContent.length, offset + text.length + 20)),
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
 * Text delete tool - delete text at a position
 * Deletes text at the specified offset for the given length
 */
export const textDeleteTool: RegisteredTool = {
  name: 'text_delete',
  description: 'Delete text at a specific position in a document',
  inputSchema: {
    type: 'object' as const,
    properties: {
      documentId: {
        type: 'string',
        description: 'The ID of the document to edit',
      },
      offset: {
        type: 'number',
        description: 'Starting position to delete from (0-based)',
      },
      length: {
        type: 'number',
        description: 'Number of characters to delete',
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

    // Validate offset and length
    if (offset > content.length) {
      return { success: false, error: 'Offset exceeds document length' };
    }

    if (offset + length > content.length) {
      return { success: false, error: 'Offset + length exceeds document length' };
    }

    try {
      // Perform deletion
      const before = content.substring(0, offset);
      const after = content.substring(offset + length);
      const newContent = before + after;

      setDocumentContent(documentId, newContent);

      return {
        success: true,
        result: {
          documentId,
          operation: 'delete',
          offset,
          deletedLength: length,
          newLength: newContent.length,
          preview: newContent.substring(Math.max(0, offset - 20), Math.min(newContent.length, offset + 20)),
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
 * Register text tools
 */
export function registerTextTools(): void {
  const { registerTool } = require('./registry');
  registerTool(textEditTool);
  registerTool(textInsertTool);
  registerTool(textDeleteTool);
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
