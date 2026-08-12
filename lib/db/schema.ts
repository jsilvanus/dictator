import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  integer,
  jsonb,
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

export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
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

export const searchVector = sql`to_tsvector('simple', coalesce(${documents.title}, ''))`;
