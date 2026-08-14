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
  getToolsRequiringPermission,
} from './registry';

// Re-export executor functions and class
export {
  getGlobalExecutor,
  executeTool,
  ToolExecutor,
} from './executor';

// Re-export permissions functions and class
export {
  getPermissionManager,
  createPermissionManager,
} from './permissions';

// Re-export permissions store types and implementations
export * from './permissions-store';

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
export async function initializeTools(): Promise<void> {
  try {
    const { registerTool } = await import('./registry');
    const httpTools = await import('./http-tools');
    const textTools = await import('./text-tools');
    const docTools = await import('./document-tools');

    // Register HTTP tools
    registerTool(httpTools.httpGetTool);
    registerTool(httpTools.httpPostTool);

    // Register text tools
    registerTool(textTools.textEditTool);
    registerTool(textTools.textInsertTool);
    registerTool(textTools.textDeleteTool);

    // Register document tools
    registerTool(docTools.searchDocumentTool);
    registerTool(docTools.getDocumentSectionTool);
    registerTool(docTools.getParagraphTool);
  } catch (error) {
    console.error('Failed to initialize AI tools:', error);
  }
}

// Automatically initialize tools on module load
// This ensures all built-in tools are available when the module is imported
if (typeof window === 'undefined') {
  // Only initialize in Node.js environment, not in browser
  try {
    initializeTools().catch((error) => {
      console.error('Failed to initialize AI tools:', error);
    });
  } catch (error) {
    console.error('Failed to initialize AI tools:', error);
  }
}
