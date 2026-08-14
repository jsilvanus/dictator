/**
 * Tool infrastructure public API
 * Exports registry, executor, and all built-in tools
 * Automatically initializes all tools on module load
 */

// Re-export types
export * from './types';

// Re-export registry functions
export {
  getAllTools,
  getGlobalRegistry,
  getTool,
  getToolsRequiringPermission,
  hasTool,
  hasToolPermission,
  registerTool,
} from './registry';

// Re-export executor functions and class
export {
  executeTool,
  getGlobalExecutor,
  ToolExecutor,
} from './executor';

// Re-export permissions functions and class
export {
  createPermissionManager,
  getPermissionManager,
} from './permissions';

// Re-export permissions store types and implementations
export * from './permissions-store';

// Re-export tool definitions
export {
  clearTestDocuments as clearTestDocumentStore,
  getDocumentSectionTool,
  getParagraphTool,
  getTestDocument as getTestDocumentStore,
  registerDocumentTools,
  searchDocumentTool,
  setTestDocument as setTestDocumentStore,
} from './document-tools';
export {
  httpGetTool,
  httpPostTool,
  registerHttpTools,
} from './http-tools';
export {
  clearTestDocuments as clearTestTextDocuments,
  getTestDocument as getTestTextDocument,
  registerTextTools,
  setTestDocument as setTestTextDocument,
  textDeleteTool,
  textEditTool,
  textInsertTool,
} from './text-tools';

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
