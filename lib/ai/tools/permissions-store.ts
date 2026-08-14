/**
 * Database Schema for Tool Permissions System
 *
 * This file documents the schema required for persistent storage of tool permissions.
 * In production, implement this using your database of choice (PostgreSQL, MongoDB, etc.)
 */

/**
 * SQL Schema for toolPermissions table
 *
 * For PostgreSQL:
 * ```sql
 * CREATE TABLE tool_permissions (
 *   id VARCHAR(255) PRIMARY KEY,
 *   user_id VARCHAR(255) NOT NULL,
 *   target VARCHAR(1024) NOT NULL,
 *   tool_type VARCHAR(50) NOT NULL, -- 'http' or 'mcp'
 *   permission_mode VARCHAR(50) NOT NULL, -- 'once', 'per-document', 'always'
 *   document_id VARCHAR(255),
 *   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *   expires_at TIMESTAMP,
 *   INDEX idx_user_target (user_id, target),
 *   INDEX idx_user_document (user_id, document_id),
 *   CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
 * );
 * ```
 *
 * For MongoDB:
 * ```javascript
 * db.createCollection("toolPermissions", {
 *   validator: {
 *     $jsonSchema: {
 *       bsonType: "object",
 *       required: ["userId", "target", "toolType", "permissionMode", "createdAt"],
 *       properties: {
 *         _id: { bsonType: "string" },
 *         userId: { bsonType: "string" },
 *         target: { bsonType: "string" },
 *         toolType: { enum: ["http", "mcp"] },
 *         permissionMode: { enum: ["once", "per-document", "always"] },
 *         documentId: { bsonType: ["string", "null"] },
 *         createdAt: { bsonType: "date" },
 *         expiresAt: { bsonType: ["date", "null"] }
 *       }
 *     }
 *   }
 * });
 *
 * db.toolPermissions.createIndex({ userId: 1, target: 1 });
 * db.toolPermissions.createIndex({ userId: 1, documentId: 1 });
 * ```
 */

// Type definitions for database integration
export interface ToolPermissionRecord {
  id: string;
  userId: string;
  target: string;
  toolType: 'http' | 'mcp';
  permissionMode: 'once' | 'per-document' | 'always';
  documentId?: string;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Database service interface for tool permissions
 * Implement this interface to integrate with your database
 */
export interface ToolPermissionStore {
  /**
   * Create a new permission record
   */
  create(permission: Omit<ToolPermissionRecord, 'id' | 'createdAt'>): Promise<ToolPermissionRecord>;

  /**
   * Find permission by ID
   */
  findById(id: string): Promise<ToolPermissionRecord | null>;

  /**
   * Find all permissions for a user
   */
  findByUserId(userId: string): Promise<ToolPermissionRecord[]>;

  /**
   * Find permissions matching user, target, and optional document
   */
  findMatching(
    userId: string,
    target: string,
    documentId?: string
  ): Promise<ToolPermissionRecord[]>;

  /**
   * Update a permission record
   */
  update(id: string, updates: Partial<ToolPermissionRecord>): Promise<ToolPermissionRecord | null>;

  /**
   * Delete a permission record
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete all permissions for a user
   */
  deleteByUserId(userId: string): Promise<number>;

  /**
   * Clean up expired permissions
   */
  deleteExpired(): Promise<number>;
}

/**
 * Default implementation using in-memory storage
 * For production, replace with database-backed implementation
 */
export class InMemoryToolPermissionStore implements ToolPermissionStore {
  private permissions: Map<string, ToolPermissionRecord> = new Map();
  private userIndex: Map<string, string[]> = new Map();

  async create(permission: Omit<ToolPermissionRecord, 'id' | 'createdAt'>): Promise<ToolPermissionRecord> {
    const record: ToolPermissionRecord = {
      ...permission,
      id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    this.permissions.set(record.id, record);

    const userIds = this.userIndex.get(record.userId) || [];
    userIds.push(record.id);
    this.userIndex.set(record.userId, userIds);

    return record;
  }

  async findById(id: string): Promise<ToolPermissionRecord | null> {
    return this.permissions.get(id) || null;
  }

  async findByUserId(userId: string): Promise<ToolPermissionRecord[]> {
    const ids = this.userIndex.get(userId) || [];
    return ids.map((id) => this.permissions.get(id)!).filter(Boolean);
  }

  async findMatching(
    userId: string,
    target: string,
    documentId?: string
  ): Promise<ToolPermissionRecord[]> {
    const userPermissions = await this.findByUserId(userId);
    return userPermissions.filter((perm) => {
      if (perm.target !== target) return false;
      if (documentId && perm.documentId !== documentId) return false;
      return true;
    });
  }

  async update(id: string, updates: Partial<ToolPermissionRecord>): Promise<ToolPermissionRecord | null> {
    const existing = this.permissions.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, id, createdAt: existing.createdAt };
    this.permissions.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const perm = this.permissions.get(id);
    if (!perm) return false;

    this.permissions.delete(id);

    const userIds = this.userIndex.get(perm.userId) || [];
    const filtered = userIds.filter((uid) => uid !== id);
    if (filtered.length > 0) {
      this.userIndex.set(perm.userId, filtered);
    } else {
      this.userIndex.delete(perm.userId);
    }

    return true;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const ids = this.userIndex.get(userId) || [];
    let count = 0;

    for (const id of ids) {
      this.permissions.delete(id);
      count++;
    }

    this.userIndex.delete(userId);
    return count;
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [id, perm] of this.permissions) {
      if (perm.expiresAt && perm.expiresAt < now) {
        expiredIds.push(id);
      }
    }

    let count = 0;
    for (const id of expiredIds) {
      await this.delete(id);
      count++;
    }

    return count;
  }
}
