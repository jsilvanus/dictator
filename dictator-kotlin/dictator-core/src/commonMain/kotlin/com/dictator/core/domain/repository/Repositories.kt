package com.dictator.core.domain.repository

import com.dictator.core.domain.entity.*
import kotlinx.coroutines.flow.Flow

/**
 * Repository interface for user data access.
 * Abstracts the underlying data source (local database, remote API, etc.)
 */
interface UserRepository {
    suspend fun getUserById(id: String): User?
    suspend fun getUserByEmail(email: String): User?
    suspend fun createUser(user: User): User
    suspend fun updateUser(user: User): User
    suspend fun deleteUser(id: String): Boolean
}

/**
 * Repository interface for folder data access.
 */
interface FolderRepository {
    suspend fun getFolderById(id: String): Folder?
    suspend fun getFoldersByUserId(userId: String): List<Folder>
    suspend fun getFoldersByParentId(parentId: String?): List<Folder>
    suspend fun createFolder(folder: Folder): Folder
    suspend fun updateFolder(folder: Folder): Folder
    suspend fun deleteFolder(id: String): Boolean
    suspend fun deleteByUserId(userId: String): Boolean
}

/**
 * Repository interface for document data access.
 */
interface DocumentRepository {
    suspend fun getDocumentById(id: String): Document?
    suspend fun getDocumentsByUserId(userId: String): List<Document>
    suspend fun getDocumentsByFolderId(folderId: String): List<Document>
    suspend fun createDocument(document: Document): Document
    suspend fun updateDocument(document: Document): Document
    suspend fun deleteDocument(id: String): Boolean
    suspend fun deleteByUserId(userId: String): Boolean
    
    // Flow for real-time updates
    fun observeDocument(id: String): Flow<Document?>
    fun observeDocumentsByUserId(userId: String): Flow<List<Document>>
}

/**
 * Repository interface for document versions.
 */
interface DocumentVersionRepository {
    suspend fun getVersionById(id: String): DocumentVersion?
    suspend fun getVersionsByDocumentId(documentId: String): List<DocumentVersion>
    suspend fun getVersionsSince(documentId: String, timestamp: Long): List<DocumentVersion>
    suspend fun createVersion(version: DocumentVersion): DocumentVersion
    suspend fun deleteByDocumentId(documentId: String): Boolean
    
    fun observeVersions(documentId: String): Flow<List<DocumentVersion>>
}

/**
 * Repository interface for shares/permissions.
 */
interface ShareRepository {
    suspend fun getShareById(id: String): Share?
    suspend fun getSharesByDocumentId(documentId: String): List<Share>
    suspend fun getSharesByUserId(userId: String): List<Share>
    suspend fun createShare(share: Share): Share
    suspend fun updateShare(share: Share): Share
    suspend fun deleteShare(id: String): Boolean
    suspend fun deleteByDocumentId(documentId: String): Boolean
}

/**
 * Repository interface for AI sessions.
 */
interface AiSessionRepository {
    suspend fun getSessionById(id: String): AiSession?
    suspend fun getSessionsByUserId(userId: String): List<AiSession>
    suspend fun createSession(session: AiSession): AiSession
    suspend fun updateSession(session: AiSession): AiSession
    suspend fun deleteSession(id: String): Boolean
    suspend fun deleteByUserId(userId: String): Boolean
    
    fun observeSession(id: String): Flow<AiSession?>
}

/**
 * Repository interface for sync metadata.
 */
interface SyncMetadataRepository {
    suspend fun getSyncMetadata(documentId: String): SyncMetadata?
    suspend fun getAllSyncMetadata(userId: String): List<SyncMetadata>
    suspend fun upsertSyncMetadata(metadata: SyncMetadata): SyncMetadata
    suspend fun deleteSyncMetadata(documentId: String): Boolean
}

/**
 * Repository interface for pending sync items.
 */
interface PendingSyncRepository {
    suspend fun getPendingItemById(id: String): PendingSyncItem?
    suspend fun getPendingItemsByDocumentId(documentId: String): List<PendingSyncItem>
    suspend fun getPendingItemsByUserId(userId: String): List<PendingSyncItem>
    suspend fun getPendingItems(status: String = "pending"): List<PendingSyncItem>
    suspend fun createPendingItem(item: PendingSyncItem): PendingSyncItem
    suspend fun updatePendingItem(item: PendingSyncItem): PendingSyncItem
    suspend fun deletePendingItem(id: String): Boolean
    suspend fun deleteByDocumentId(documentId: String): Boolean
    
    fun observePendingItems(status: String = "pending"): Flow<List<PendingSyncItem>>
}

/**
 * Repository interface for document conflicts.
 */
interface ConflictRepository {
    suspend fun getConflictById(id: String): DocumentConflict?
    suspend fun getConflictsByDocumentId(documentId: String): List<DocumentConflict>
    suspend fun getUnresolvedConflicts(documentId: String): List<DocumentConflict>
    suspend fun createConflict(conflict: DocumentConflict): DocumentConflict
    suspend fun updateConflict(conflict: DocumentConflict): DocumentConflict
    suspend fun resolveConflict(id: String, resolved: DocumentConflict): DocumentConflict
    suspend fun deleteConflict(id: String): Boolean
    suspend fun deleteByDocumentId(documentId: String): Boolean
}

/**
 * Repository interface for privacy settings and audit logging.
 */
interface PrivacyRepository {
    suspend fun getUserPrivacySettings(userId: String): com.dictator.core.data.privacy.UserPrivacySettings
    suspend fun saveUserPrivacySettings(settings: com.dictator.core.data.privacy.UserPrivacySettings)
    suspend fun logPrivacyEvent(event: com.dictator.core.data.privacy.PrivacyAuditLogEntry)
    suspend fun getPrivacyEventsForUser(userId: String): List<com.dictator.core.data.privacy.PrivacyAuditLogEntry>
    suspend fun getPrivacyEventsSince(userId: String, timestamp: Long): List<com.dictator.core.data.privacy.PrivacyAuditLogEntry>
}
