import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'editor']);
export const sharePermissionEnum = pgEnum('share_permission', ['read', 'edit']);
export const aiSessionModeEnum = pgEnum('ai_session_mode', ['inline', 'panel']);
export const syncConflictStatusEnum = pgEnum('sync_conflict_status', ['none', 'resolved', 'unresolved']);
export const aiProviderEnum = pgEnum('ai_provider', ['claude', 'openai', 'ollama', 'openai-compatible', 'dictator']);
export const toolPermissionModeEnum = pgEnum('tool_permission_mode', ['once', 'per-document', 'always']);
export const toolTypeEnum = pgEnum('tool_type', ['http', 'mcp']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull().default('editor'),
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const folders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  title: text('title').notNull().default('Untitled'),
  content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
  wordCount: integer('word_count').notNull().default(0),
  lastModifiedDevice: text('last_modified_device').notNull().default('web'),
  deviceVersion: bigint('device_version', { mode: 'number' }).notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  content: jsonb('content').$type<Record<string, unknown>>().notNull(),
  deviceSource: text('device_source').notNull().default('web'),
  deviceVersion: bigint('device_version', { mode: 'number' }).notNull().default(1),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
});

export const shares = pgTable('shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  sharedBy: uuid('shared_by')
    .notNull()
    .references(() => users.id),
  sharedWith: uuid('shared_with').references(() => users.id),
  token: text('token').unique(),
  permission: sharePermissionEnum('permission').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiSessions = pgTable(
  'ai_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    mode: aiSessionModeEnum('mode').notNull(),
    turns: jsonb('turns').$type<Array<{ role: string; content: string }>>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('ai_sessions_doc_user_mode').on(t.documentId, t.userId, t.mode)],
);

export const syncMetadata = pgTable('sync_metadata', {
  documentId: uuid('document_id')
    .notNull()
    .primaryKey()
    .references(() => documents.id, { onDelete: 'cascade' }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).defaultNow().notNull(),
  localVersion: bigint('local_version', { mode: 'number' }).notNull().default(1),
  remoteVersion: bigint('remote_version', { mode: 'number' }).notNull().default(1),
  pendingChanges: integer('pending_changes').notNull().default(0),
  conflictStatus: syncConflictStatusEnum('conflict_status').notNull().default('none'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pendingSyncQueue = pgTable('pending_sync_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  deviceId: text('device_id').notNull(),
  changeData: jsonb('change_data').$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull().default('pending'),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentConflicts = pgTable('document_conflicts', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  baseVersion: jsonb('base_version').$type<Record<string, unknown>>().notNull(),
  androidVersion: jsonb('android_version').$type<Record<string, unknown>>().notNull(),
  webVersion: jsonb('web_version').$type<Record<string, unknown>>().notNull(),
  resolvedVersion: jsonb('resolved_version').$type<Record<string, unknown>>(),
  status: text('status').notNull().default('unresolved'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

// Phase 4: Comprehensive Versioning
export const documentVersionSnapshots = pgTable('document_version_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  versionNumber: bigint('version_number', { mode: 'number' }).notNull(),
  snapshotData: jsonb('snapshot_data').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdByDevice: text('created_by_device').notNull().default('web'),
  tag: text('tag'),
  isCheckpoint: boolean('is_checkpoint').notNull().default(false),
}, (t) => [unique('document_version_snapshots_unique').on(t.documentId, t.versionNumber)]);

export const documentVersionMetadata = pgTable('document_version_metadata', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  versionNumber: bigint('version_number', { mode: 'number' }).notNull(),
  parentVersion: bigint('parent_version', { mode: 'number' }),
  changeSummary: text('change_summary'),
  wordCountChange: integer('word_count_change'),
  sizeBytes: integer('size_bytes'),
  isMajorVersion: boolean('is_major_version').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique('document_version_metadata_unique').on(t.documentId, t.versionNumber)]);

export const deviceVersionHistory = pgTable('device_version_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull(),
  deviceVersion: bigint('device_version', { mode: 'number' }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').notNull().default('synced'),
}, (t) => [unique('device_version_history_unique').on(t.documentId, t.deviceId, t.deviceVersion)]);

// Phase 5: Real-time Collaboration & Sync Optimization
export const syncActivityLog = pgTable('sync_activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull(),
  action: text('action').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

export const syncNotifications = pgTable('sync_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Phase 6: Advanced Versioning & Sync Orchestration
export const versionBranches = pgTable('version_branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  branchName: text('branch_name').notNull(),
  baseVersion: bigint('base_version', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  isMain: boolean('is_main').notNull().default(false),
}, (t) => [unique('version_branches_unique').on(t.documentId, t.branchName)]);

export const syncPerformanceMetrics = pgTable('sync_performance_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  syncTimeMs: integer('sync_time_ms').notNull(),
  dataSizeBytes: integer('data_size_bytes').notNull(),
  compressionRatio: numeric('compression_ratio', { precision: 5, scale: 2 }),
  success: boolean('success').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

// AI Provider Preferences
export const userAiPreferences = pgTable('user_ai_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  preferredProvider: aiProviderEnum('preferred_provider').notNull().default('claude'),
  preferredModel: text('preferred_model'),
  customTemperature: numeric('custom_temperature', { precision: 3, scale: 2 }),
  customMaxTokens: integer('custom_max_tokens'),
  ollamaUrl: text('ollama_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tool Permissions
export const toolPermissions = pgTable(
  'tool_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    target: text('target').notNull(), // URL for HTTP, MCP name for MCP
    toolType: toolTypeEnum('tool_type').notNull(),
    mode: toolPermissionModeEnum('mode').notNull(),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [unique('tool_permissions_unique').on(t.userId, t.target, t.toolType, t.documentId)],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  documents: many(documents),
  aiPreferences: one(userAiPreferences, {
    fields: [users.id],
    references: [userAiPreferences.userId],
  }),
  toolPermissions: many(toolPermissions),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, {
    fields: [documents.ownerId],
    references: [users.id],
  }),
  folder: one(folders, {
    fields: [documents.folderId],
    references: [folders.id],
  }),
  versions: many(documentVersions),
  syncMetadata: one(syncMetadata, {
    fields: [documents.id],
    references: [syncMetadata.documentId],
  }),
  pendingSyncs: many(pendingSyncQueue),
  conflicts: many(documentConflicts),
  versionSnapshots: many(documentVersionSnapshots),
  versionMetadata: many(documentVersionMetadata),
  deviceVersionHistory: many(deviceVersionHistory),
  syncActivityLogs: many(syncActivityLog),
  syncNotifications: many(syncNotifications),
  versionBranches: many(versionBranches),
  performanceMetrics: many(syncPerformanceMetrics),
}));

export const syncMetadataRelations = relations(syncMetadata, ({ one }) => ({
  document: one(documents, {
    fields: [syncMetadata.documentId],
    references: [documents.id],
  }),
}));

export const pendingSyncQueueRelations = relations(pendingSyncQueue, ({ one }) => ({
  document: one(documents, {
    fields: [pendingSyncQueue.documentId],
    references: [documents.id],
  }),
}));

export const documentConflictsRelations = relations(documentConflicts, ({ one }) => ({
  document: one(documents, {
    fields: [documentConflicts.documentId],
    references: [documents.id],
  }),
}));

// Phase 4 relations
export const documentVersionSnapshotsRelations = relations(documentVersionSnapshots, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersionSnapshots.documentId],
    references: [documents.id],
  }),
}));

export const documentVersionMetadataRelations = relations(documentVersionMetadata, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersionMetadata.documentId],
    references: [documents.id],
  }),
}));

export const deviceVersionHistoryRelations = relations(deviceVersionHistory, ({ one }) => ({
  document: one(documents, {
    fields: [deviceVersionHistory.documentId],
    references: [documents.id],
  }),
}));

// Phase 5 relations
export const syncActivityLogRelations = relations(syncActivityLog, ({ one }) => ({
  user: one(users, {
    fields: [syncActivityLog.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [syncActivityLog.documentId],
    references: [documents.id],
  }),
}));

export const syncNotificationsRelations = relations(syncNotifications, ({ one }) => ({
  user: one(users, {
    fields: [syncNotifications.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [syncNotifications.documentId],
    references: [documents.id],
  }),
}));

// Phase 6 relations
export const versionBranchesRelations = relations(versionBranches, ({ one }) => ({
  document: one(documents, {
    fields: [versionBranches.documentId],
    references: [documents.id],
  }),
}));

export const syncPerformanceMetricsRelations = relations(syncPerformanceMetrics, ({ one }) => ({
  document: one(documents, {
    fields: [syncPerformanceMetrics.documentId],
    references: [documents.id],
  }),
}));

export const userAiPreferencesRelations = relations(userAiPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userAiPreferences.userId],
    references: [users.id],
  }),
}));

export const toolPermissionsRelations = relations(toolPermissions, ({ one }) => ({
  user: one(users, {
    fields: [toolPermissions.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [toolPermissions.documentId],
    references: [documents.id],
  }),
}));

export const searchVector = sql`to_tsvector('simple', coalesce(${documents.title}, ''))`;
