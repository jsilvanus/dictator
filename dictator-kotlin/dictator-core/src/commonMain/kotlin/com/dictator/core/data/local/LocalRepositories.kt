package com.dictator.core.data.local

import com.dictator.core.data.converter.*
import com.dictator.core.domain.entity.*
import com.dictator.core.domain.repository.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.datetime.Clock

/**
 * Local repository implementations using SQLDelight for database access.
 */

class LocalUserRepository(
    private val database: com.dictator.core.database.DictatorDatabase
) : UserRepository {
    private val queries = database.usersQueries
    
    override suspend fun getUserById(id: String): User? {
        return queries.getUserById(id).executeAsOneOrNull()?.toDomainEntity()
    }
    
    override suspend fun getUserByEmail(email: String): User? {
        return queries.getUserByEmail(email).executeAsOneOrNull()?.toDomainEntity()
    }
    
    override suspend fun createUser(user: User): User {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.insertUser(
            id = user.id,
            email = user.email,
            name = user.name,
            createdAt = timestamp
        )
        return user.copy(createdAt = timestamp)
    }
    
    override suspend fun updateUser(user: User): User {
        queries.updateUser(
            email = user.email,
            name = user.name,
            id = user.id
        )
        return user
    }
    
    override suspend fun deleteUser(id: String): Boolean {
        queries.deleteUserById(id)
        return true
    }
}

class LocalFolderRepository(
    private val database: com.dictator.core.database.DictatorDatabase
) : FolderRepository {
    private val queries = database.foldersQueries
    
    override suspend fun getFolderById(id: String): Folder? {
        return queries.getFolderById(id).executeAsOneOrNull()?.toDomainEntity()
    }
    
    override suspend fun getFoldersByUserId(userId: String): List<Folder> {
        return queries.getFoldersByUserId(userId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun getFoldersByParentId(parentId: String?): List<Folder> {
        return if (parentId == null) {
            queries.getRootFolders().executeAsList().map { it.toDomainEntity() }
        } else {
            queries.getFoldersByParentId(parentId).executeAsList().map { it.toDomainEntity() }
        }
    }
    
    override suspend fun createFolder(folder: Folder): Folder {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.insertFolder(
            id = folder.id,
            name = folder.name,
            userId = folder.userId,
            parentId = folder.parentId,
            createdAt = timestamp
        )
        return folder.copy(createdAt = timestamp)
    }
    
    override suspend fun updateFolder(folder: Folder): Folder {
        queries.updateFolder(
            name = folder.name,
            parentId = folder.parentId,
            id = folder.id
        )
        return folder
    }
    
    override suspend fun deleteFolder(id: String): Boolean {
        queries.deleteFolderById(id)
        return true
    }
    
    override suspend fun deleteByUserId(userId: String): Boolean {
        queries.deleteFoldersByUserId(userId)
        return true
    }
}

class LocalDocumentRepository(
    private val database: com.dictator.core.database.DictatorDatabase
) : DocumentRepository {
    private val queries = database.documentsQueries
    
    override suspend fun getDocumentById(id: String): Document? {
        return queries.getDocumentById(id).executeAsOneOrNull()?.toDomainEntity()
    }
    
    override suspend fun getDocumentsByUserId(userId: String): List<Document> {
        return queries.getDocumentsByUserId(userId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun getDocumentsByFolderId(folderId: String): List<Document> {
        return queries.getDocumentsByFolderId(folderId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun createDocument(document: Document): Document {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.insertDocument(
            id = document.id,
            title = document.title,
            folderId = document.folderId,
            userId = document.userId,
            createdAt = timestamp,
            updatedAt = timestamp,
            lastModifiedDevice = document.lastModifiedDevice,
            deviceVersion = document.deviceVersion
        )
        return document.copy(createdAt = timestamp, updatedAt = timestamp)
    }
    
    override suspend fun updateDocument(document: Document): Document {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.updateDocument(
            title = document.title,
            folderId = document.folderId,
            userId = document.userId,
            updatedAt = timestamp,
            lastModifiedDevice = document.lastModifiedDevice,
            deviceVersion = document.deviceVersion,
            id = document.id
        )
        return document.copy(updatedAt = timestamp)
    }
    
    override suspend fun deleteDocument(id: String): Boolean {
        queries.deleteDocumentById(id)
        return true
    }
    
    override suspend fun deleteByUserId(userId: String): Boolean {
        queries.deleteDocumentsByUserId(userId)
        return true
    }
    
    override fun observeDocument(id: String): Flow<Document?> {
        return queries.getDocumentById(id).asFlow().map { result ->
            result.executeAsOneOrNull()?.toDomainEntity()
        }
    }
    
    override fun observeDocumentsByUserId(userId: String): Flow<List<Document>> {
        return queries.getDocumentsByUserId(userId).asFlow().map { result ->
            result.executeAsList().map { it.toDomainEntity() }
        }
    }
}

class LocalDocumentVersionRepository(
    private val database: com.dictator.core.database.DictatorDatabase
) : DocumentVersionRepository {
    private val queries = database.documentVersionsQueries
    
    override suspend fun getVersionById(id: String): DocumentVersion? {
        return queries.getVersionById(id).executeAsOneOrNull()?.toDomainEntity()
    }
    
    override suspend fun getVersionsByDocumentId(documentId: String): List<DocumentVersion> {
        return queries.getVersionsByDocumentId(documentId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun getVersionsSince(documentId: String, timestamp: Long): List<DocumentVersion> {
        return queries.getVersionsSince(documentId, timestamp).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun createVersion(version: DocumentVersion): DocumentVersion {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.insertVersion(
            id = version.id,
            documentId = version.documentId,
            content = version.content,
            version = version.version.toLong(),
            createdBy = version.createdBy,
            createdAt = timestamp,
            deviceSource = version.deviceSource,
            deviceVersion = version.deviceVersion
        )
        return version.copy(createdAt = timestamp)
    }
    
    override suspend fun deleteByDocumentId(documentId: String): Boolean {
        queries.deleteVersionsByDocumentId(documentId)
        return true
    }
    
    override fun observeVersions(documentId: String): Flow<List<DocumentVersion>> {
        return queries.getVersionsByDocumentId(documentId).asFlow().map { result ->
            result.executeAsList().map { it.toDomainEntity() }
        }
    }
}

class LocalShareRepository(
    private val database: com.dictator.core.database.DictatorDatabase
) : ShareRepository {
    private val queries = database.sharesQueries
    
    override suspend fun getShareById(id: String): Share? {
        return queries.getShareById(id).executeAsOneOrNull()?.toDomainEntity()
    }
    
    override suspend fun getSharesByDocumentId(documentId: String): List<Share> {
        return queries.getSharesByDocumentId(documentId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun getSharesByUserId(userId: String): List<Share> {
        return queries.getSharesByUserId(userId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun createShare(share: Share): Share {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.insertShare(
            id = share.id,
            documentId = share.documentId,
            sharedWithUserId = share.sharedWithUserId,
            permission = share.permission,
            createdAt = timestamp
        )
        return share.copy(createdAt = timestamp)
    }
    
    override suspend fun updateShare(share: Share): Share {
        queries.updateShare(
            permission = share.permission,
            id = share.id
        )
        return share
    }
    
    override suspend fun deleteShare(id: String): Boolean {
        queries.deleteShareById(id)
        return true
    }
    
    override suspend fun deleteByDocumentId(documentId: String): Boolean {
        queries.deleteSharesByDocumentId(documentId)
        return true
    }
}

class LocalAiSessionRepository(
    private val database: com.dictator.core.database.DictatorDatabase
) : AiSessionRepository {
    private val queries = database.aiSessionsQueries
    
    override suspend fun getSessionById(id: String): AiSession? {
        return queries.getSessionById(id).executeAsOneOrNull()?.toDomainEntity()
    }
    
    override suspend fun getSessionsByUserId(userId: String): List<AiSession> {
        return queries.getSessionsByUserId(userId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun createSession(session: AiSession): AiSession {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.insertSession(
            id = session.id,
            userId = session.userId,
            mode = session.mode,
            turnsJson = session.turns.joinToString(",") { 
                """{"role":"${it.role}","content":"${it.content.replace("\"", "\\\"")}"}"""
            },
            metadata = session.metadata?.toString(),
            createdAt = timestamp
        )
        return session.copy(createdAt = timestamp)
    }
    
    override suspend fun updateSession(session: AiSession): AiSession {
        queries.updateSession(
            mode = session.mode,
            turnsJson = session.turns.joinToString(",") { 
                """{"role":"${it.role}","content":"${it.content.replace("\"", "\\\"")}"}"""
            },
            metadata = session.metadata?.toString(),
            id = session.id
        )
        return session
    }
    
    override suspend fun deleteSession(id: String): Boolean {
        queries.deleteSessionById(id)
        return true
    }
    
    override suspend fun deleteByUserId(userId: String): Boolean {
        queries.deleteSessionsByUserId(userId)
        return true
    }
    
    override fun observeSession(id: String): Flow<AiSession?> {
        return queries.getSessionById(id).asFlow().map { result ->
            result.executeAsOneOrNull()?.toDomainEntity()
        }
    }
}

class LocalSyncMetadataRepository(
    private val database: com.dictator.core.database.DictatorDatabase
) : SyncMetadataRepository {
    private val queries = database.syncMetadataQueries
    
    override suspend fun getSyncMetadata(documentId: String): SyncMetadata? {
        return queries.getSyncMetadata(documentId).executeAsOneOrNull()?.toDomainEntity()
    }
    
    override suspend fun getAllSyncMetadata(userId: String): List<SyncMetadata> {
        return queries.getAllSyncMetadata(userId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun upsertSyncMetadata(metadata: SyncMetadata): SyncMetadata {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.upsertSyncMetadata(
            documentId = metadata.documentId,
            lastSyncedAt = metadata.lastSyncedAt,
            localVersion = metadata.localVersion,
            remoteVersion = metadata.remoteVersion,
            pendingChanges = metadata.pendingChanges.toLong(),
            conflictStatus = metadata.conflictStatus,
            updatedAt = timestamp
        )
        return metadata.copy(updatedAt = timestamp)
    }
    
    override suspend fun deleteSyncMetadata(documentId: String): Boolean {
        queries.deleteSyncMetadata(documentId)
        return true
    }
}

class LocalPendingSyncRepository(
    private val database: com.dictator.core.database.DictatorDatabase
) : PendingSyncRepository {
    private val queries = database.pendingSyncQueueQueries
    
    override suspend fun getPendingItemById(id: String): PendingSyncItem? {
        return queries.getPendingItemById(id).executeAsOneOrNull()?.toDomainEntity()
    }
    
    override suspend fun getPendingItemsByDocumentId(documentId: String): List<PendingSyncItem> {
        return queries.getPendingItemsByDocumentId(documentId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun getPendingItemsByUserId(userId: String): List<PendingSyncItem> {
        return queries.getPendingItemsByUserId(userId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun getPendingItems(status: String): List<PendingSyncItem> {
        return queries.getPendingItems(status).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun createPendingItem(item: PendingSyncItem): PendingSyncItem {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.insertPendingItem(
            id = item.id,
            documentId = item.documentId,
            userId = item.userId,
            deviceId = item.deviceId,
            changeDataJson = item.changeDataJson(),
            status = item.status,
            retryCount = item.retryCount.toLong(),
            createdAt = timestamp,
            updatedAt = timestamp
        )
        return item.copy(createdAt = timestamp, updatedAt = timestamp)
    }
    
    override suspend fun updatePendingItem(item: PendingSyncItem): PendingSyncItem {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.updatePendingItem(
            status = item.status,
            retryCount = item.retryCount.toLong(),
            updatedAt = timestamp,
            id = item.id
        )
        return item.copy(updatedAt = timestamp)
    }
    
    override suspend fun deletePendingItem(id: String): Boolean {
        queries.deletePendingItem(id)
        return true
    }
    
    override suspend fun deleteByDocumentId(documentId: String): Boolean {
        queries.deletePendingItemsByDocumentId(documentId)
        return true
    }
    
    override fun observePendingItems(status: String): Flow<List<PendingSyncItem>> {
        return queries.getPendingItems(status).asFlow().map { result ->
            result.executeAsList().map { it.toDomainEntity() }
        }
    }
}

class LocalConflictRepository(
    private val database: com.dictator.core.database.DictatorDatabase
) : ConflictRepository {
    private val queries = database.documentConflictsQueries
    
    override suspend fun getConflictById(id: String): DocumentConflict? {
        return queries.getConflictById(id).executeAsOneOrNull()?.toDomainEntity()
    }
    
    override suspend fun getConflictsByDocumentId(documentId: String): List<DocumentConflict> {
        return queries.getConflictsByDocumentId(documentId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun getUnresolvedConflicts(documentId: String): List<DocumentConflict> {
        return queries.getUnresolvedConflicts(documentId).executeAsList().map { it.toDomainEntity() }
    }
    
    override suspend fun createConflict(conflict: DocumentConflict): DocumentConflict {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.insertConflict(
            id = conflict.id,
            documentId = conflict.documentId,
            baseVersionJson = kotlinx.serialization.json.Json.encodeToString(conflict.baseVersion),
            androidVersionJson = kotlinx.serialization.json.Json.encodeToString(conflict.androidVersion),
            webVersionJson = kotlinx.serialization.json.Json.encodeToString(conflict.webVersion),
            resolvedVersionJson = conflict.resolvedVersion?.let { kotlinx.serialization.json.Json.encodeToString(it) },
            status = conflict.status,
            createdAt = timestamp,
            resolvedAt = conflict.resolvedAt
        )
        return conflict.copy(createdAt = timestamp)
    }
    
    override suspend fun updateConflict(conflict: DocumentConflict): DocumentConflict {
        queries.updateConflict(
            status = conflict.status,
            resolvedVersionJson = conflict.resolvedVersion?.let { kotlinx.serialization.json.Json.encodeToString(it) },
            resolvedAt = conflict.resolvedAt,
            id = conflict.id
        )
        return conflict
    }
    
    override suspend fun resolveConflict(id: String, resolved: DocumentConflict): DocumentConflict {
        val timestamp = Clock.System.now().toEpochMilliseconds()
        queries.resolveConflict(
            status = "resolved",
            resolvedVersionJson = kotlinx.serialization.json.Json.encodeToString(resolved.resolvedVersion ?: resolved.webVersion),
            resolvedAt = timestamp,
            id = id
        )
        return resolved.copy(status = "resolved", resolvedAt = timestamp)
    }
    
    override suspend fun deleteConflict(id: String): Boolean {
        queries.deleteConflict(id)
        return true
    }
    
    override suspend fun deleteByDocumentId(documentId: String): Boolean {
        queries.deleteConflictsByDocumentId(documentId)
        return true
    }
}
