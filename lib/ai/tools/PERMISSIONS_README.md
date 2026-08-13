/**
 * Tool Permissions System - Implementation Guide
 *
 * This document describes the comprehensive permissions/approval framework for tool execution
 * in the Dictator AI application.
 */

/**
 * OVERVIEW
 * ========
 *
 * The tool permissions system prevents unauthorized access to external resources (HTTP endpoints,
 * MCP services) by requiring explicit user approval before tools can execute.
 *
 * Three approval modes are supported:
 * 1. 'once': User approves execution for current document only, expires after one use
 * 2. 'per-document': Permission scoped to a specific document, valid for unlimited uses
 * 3. 'always': Blanket approval for target, valid indefinitely (or until explicitly revoked)
 */

/**
 * ARCHITECTURE
 * ============
 *
 * The permission system consists of several components:
 *
 * 1. PermissionManager (permissions.ts)
 *    - In-memory permission storage and checking
 *    - Methods: checkPermission(), grantPermission(), revokePermission(), listPermissions()
 *    - Supports wildcard patterns for domain-level permissions (e.g., *.example.com)
 *
 * 2. PermissionStore Interface (permissions-store.ts)
 *    - Abstract interface for persistent storage
 *    - Implement this to integrate with your database (PostgreSQL, MongoDB, etc.)
 *    - Provides CRUD operations for permission records
 *    - InMemoryToolPermissionStore included for testing/development
 *
 * 3. ToolExecutor (executor.ts)
 *    - Checks permissions before executing tools
 *    - Extracts target URL/MCP name from tool arguments
 *    - Returns 'permission_denied' error code if not approved
 *    - Includes target in error response for UI prompts
 *
 * 4. Tool Registry (registry.ts)
 *    - Tracks which tools require permission (requiresPermission flag)
 *    - getToolsRequiringPermission() returns list of protected tools
 *
 * 5. ToolResult Type (providers/types.ts)
 *    - Extended with errorCode and target fields
 *    - Allows UI to identify permission denials and prompt for approval
 */

/**
 * PERMISSION FLOW
 * ===============
 *
 * 1. AI requests tool execution (e.g., http_get with URL)
 *
 * 2. ToolExecutor.execute() is called
 *    - Checks if tool requires permission
 *    - Extracts target from tool arguments
 *    - Calls PermissionManager.checkPermission()
 *
 * 3. PermissionManager checks for matching approvals
 *    - Looks for permissions matching user, target, and document
 *    - Checks expiration dates
 *    - Validates permission mode (once, per-document, always)
 *    - Returns true if approved, false otherwise
 *
 * 4. If approved, tool executes normally
 *    - Returns result with success=true
 *
 * 5. If denied, ToolExecutor returns error
 *    - Sets errorCode: 'permission_denied'
 *    - Includes target URL/MCP name
 *    - Error message indicates how to approve
 *
 * 6. UI captures permission_denied error
 *    - Shows approval prompt to user
 *    - User selects approval mode (once, per-document, always)
 *    - Calls PermissionManager.grantPermission()
 *
 * 7. User retries tool execution
 *    - Permission check now passes
 *    - Tool executes successfully
 */

/**
 * PROTECTED TOOLS
 * ===============
 *
 * HTTP Tools (require permission for each URL):
 * - http_get: Fetch data from URL
 * - http_post: Send data to URL
 *
 * MCP Tools (require permission for each MCP service):
 * - mcp_*: Any MCP service tools
 *
 * Unprotected Tools (no permission required):
 * - text_edit, text_insert, text_delete: Operate on local documents
 * - search_document, get_document_section, get_paragraph: Operate on local documents
 *
 * To mark a tool as requiring permission, set requiresPermission: true in RegisteredTool
 */

/**
 * DATABASE SCHEMA
 * ===============
 *
 * Table: tool_permissions
 *
 * Columns:
 * - id: VARCHAR(255) - Unique identifier
 * - user_id: VARCHAR(255) - User who has permission
 * - target: VARCHAR(1024) - URL or MCP service name
 * - tool_type: VARCHAR(50) - 'http' or 'mcp'
 * - permission_mode: VARCHAR(50) - 'once', 'per-document', or 'always'
 * - document_id: VARCHAR(255) NULL - Document scope (null for 'always')
 * - created_at: TIMESTAMP - When permission was granted
 * - expires_at: TIMESTAMP NULL - When permission expires (null for 'always')
 *
 * Indexes:
 * - PRIMARY KEY (id)
 * - INDEX (user_id, target) - Fast lookup for permission checks
 * - INDEX (user_id, document_id) - Fast lookup for document-scoped perms
 * - FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
 *
 * See permissions-store.ts for SQL and MongoDB schemas
 */

/**
 * USAGE EXAMPLES
 * ==============
 *
 * Grant permission:
 * ```typescript
 * import { getPermissionManager } from '@/lib/ai/tools';
 *
 * const manager = getPermissionManager();
 * manager.grantPermission(
 *   userId: 'user123',
 *   target: 'https://api.example.com',
 *   toolType: 'http',
 *   mode: 'always' // or 'per-document', 'once'
 * );
 * ```
 *
 * Check permission:
 * ```typescript
 * const allowed = manager.checkPermission(
 *   userId: 'user123',
 *   target: 'https://api.example.com',
 *   documentId: 'doc456' // optional
 * );
 * ```
 *
 * Revoke permission:
 * ```typescript
 * manager.revokePermission(
 *   userId: 'user123',
 *   target: 'https://api.example.com'
 * );
 * ```
 *
 * List user's permissions:
 * ```typescript
 * const perms = manager.listPermissions('user123');
 * ```
 */

/**
 * PERMISSION ERROR HANDLING
 * =========================
 *
 * When a tool lacks required permission, the executor returns:
 *
 * ```json
 * {
 *   "toolCallId": "call_123",
 *   "name": "http_get",
 *   "result": null,
 *   "error": "Permission denied: User user123 is not approved to access 'https://api.example.com'",
 *   "errorCode": "permission_denied",
 *   "target": "https://api.example.com"
 * }
 * ```
 *
 * The UI should:
 * 1. Detect errorCode: 'permission_denied'
 * 2. Display approval prompt with target URL
 * 3. Offer three options: Approve Once, Approve Per Document, Approve Always
 * 4. On approval, call PermissionManager.grantPermission()
 * 5. Retry the tool execution
 *
 * Other error codes:
 * - 'rate_limited': User exceeded rate limits
 * - 'validation_failed': Tool arguments are invalid
 * - 'execution_error': Tool execution failed
 */

/**
 * SECURITY CONSIDERATIONS
 * =======================
 *
 * 1. URL Validation:
 *    - HTTP tools validate URLs against whitelist/blacklist
 *    - Only HTTPS URLs are allowed by default
 *    - Private IP ranges are blocked
 *
 * 2. Wildcard Patterns:
 *    - Permissions support wildcards (e.g., *.example.com)
 *    - Matches any subdomain of example.com
 *    - Use with caution to avoid overly broad permissions
 *
 * 3. Permission Scope:
 *    - 'per-document' permissions are scoped to a specific document
 *    - Useful for sharing workflows with document-specific data
 *    - 'always' permissions should be limited to trusted services
 *
 * 4. Permission Expiration:
 *    - 'once' permissions expire immediately after use
 *    - Expired permissions are automatically removed by cleanup jobs
 *    - 'always' permissions never expire unless explicitly revoked
 *
 * 5. Audit Logging:
 *    - All permission grants/revokes should be logged
 *    - Tool execution is audited (see ToolExecutor audit logging)
 *    - Review logs regularly for unauthorized access attempts
 */

/**
 * INTEGRATION CHECKLIST
 * =====================
 *
 * To integrate the permissions system:
 *
 * [x] 1. Create PermissionManager (permissions.ts)
 * [x] 2. Create PermissionStore interface (permissions-store.ts)
 * [x] 3. Update ToolExecutor to check permissions
 * [x] 4. Update ToolResult type with errorCode and target
 * [x] 5. Mark HTTP tools with requiresPermission: true
 * [ ] 6. Implement database-backed PermissionStore
 * [ ] 7. Add permission grant/revoke endpoints to API
 * [ ] 8. Implement UI for permission approval prompts
 * [ ] 9. Add permission management settings page
 * [ ] 10. Set up background job for cleaning expired permissions
 * [ ] 11. Add audit logging for permission operations
 * [ ] 12. Document API endpoints for permission management
 */

/**
 * NEXT STEPS (Phase 5+)
 * ====================
 *
 * Phase 5: API Endpoints
 * - POST /api/permissions - Grant permission
 * - GET /api/permissions - List user's permissions
 * - DELETE /api/permissions/:id - Revoke permission
 * - GET /api/tools/protected - List protected tools
 *
 * Phase 5: UI Components
 * - Permission approval modal
 * - Permission management settings page
 * - Inline permission prompts in AI chat
 *
 * Phase 6+: Advanced Features
 * - Permission templates for common services
 * - Rate limiting per permission
 * - Audit log visualization
 * - Bulk permission management
 * - Team/organization-level permissions
 */
