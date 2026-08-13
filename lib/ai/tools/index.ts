/**
 * Tool infrastructure public API
 * Exports registry, executor, and all built-in tools
 * Automatically initializes all tools on module load
 */

// Re-export types
export * from './types';

// Re-export registry functions
export {
  getGlobalRegistry,
  registerTool,
  getTool,
  getAllTools,
  hasTool,
  hasToolPermission,
} from './registry';

// Re-export executor functions and class
export {
  getGlobalExecutor,
  executeTool,
  ToolExecutor,
} from './executor';

// Re-export tool definitions
export {
  httpGetTool,
  httpPostTool,
  registerHttpTools,
} from './http-tools';

export {
  textEditTool,
  textInsertTool,
  textDeleteTool,
  registerTextTools,
  setTestDocument as setTestTextDocument,
  getTestDocument as getTestTextDocument,
  clearTestDocuments as clearTestTextDocuments,
} from './text-tools';

export {
  searchDocumentTool,
  getDocumentSectionTool,
  getParagraphTool,
  registerDocumentTools,
  setTestDocument as setTestDocumentStore,
  getTestDocument as getTestDocumentStore,
  clearTestDocuments as clearTestDocumentStore,
} from './document-tools';

/**
 * Initialize all built-in tools
 * This is called automatically on module import
 */
export function initializeTools(): void {
  const { registerTool } = require('./registry');

  // Register HTTP tools
  registerTool(require('./http-tools').httpGetTool);
  registerTool(require('./http-tools').httpPostTool);

  // Register text tools
  registerTool(require('./text-tools').textEditTool);
  registerTool(require('./text-tools').textInsertTool);
  registerTool(require('./text-tools').textDeleteTool);

  // Register document tools
  registerTool(require('./document-tools').searchDocumentTool);
  registerTool(require('./document-tools').getDocumentSectionTool);
  registerTool(require('./document-tools').getParagraphTool);
}

// Automatically initialize tools on module load
// This ensures all built-in tools are available when the module is imported
if (typeof window === 'undefined') {
  // Only initialize in Node.js environment, not in browser
  try {
    initializeTools();
  } catch (error) {
    console.error('Failed to initialize tools:', error);
  }
}
