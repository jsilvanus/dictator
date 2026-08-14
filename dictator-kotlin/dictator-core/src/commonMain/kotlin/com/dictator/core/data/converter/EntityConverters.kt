package com.dictator.core.data.converter

import com.dictator.core.domain.entity.*
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Entity converters for mapping between database DTOs and domain entities.
 * Handles JSON serialization/deserialization for complex fields.
 */

private val json = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
}

// ============= User Converters =============

fun DbUser.toDomainEntity(): User = User(
    id = id,
    email = email,
    name = name,
    createdAt = createdAt
)

data class DbUser(
    val id: String,
    val email: String,
    val name: String?,
    val createdAt: Long
)

// ============= Folder Converters =============

fun DbFolder.toDomainEntity(): Folder = Folder(
    id = id,
    name = name,
    userId = userId,
    parentId = parentId,
    createdAt = createdAt
)

data class DbFolder(
    val id: String,
    val name: String,
    val userId: String,
    val parentId: String?,
    val createdAt: Long
)

// ============= Document Converters =============

fun DbDocument.toDomainEntity(): Document = Document(
    id = id,
    title = title,
    folderId = folderId,
    userId = userId,
    createdAt = createdAt,
    updatedAt = updatedAt,
    lastModifiedDevice = lastModifiedDevice,
    deviceVersion = deviceVersion
)

data class DbDocument(
    val id: String,
    val title: String,
    val folderId: String,
    val userId: String?,
    val createdAt: Long,
    val updatedAt: Long,
    val lastModifiedDevice: String = "kotlin",
    val deviceVersion: Long = 1
)

// ============= DocumentVersion Converters =============

fun DbDocumentVersion.toDomainEntity(): DocumentVersion = DocumentVersion(
    id = id,
    documentId = documentId,
    content = content,
    version = version,
    createdBy = createdBy,
    createdAt = createdAt,
    deviceSource = deviceSource,
    deviceVersion = deviceVersion
)

data class DbDocumentVersion(
    val id: String,
    val documentId: String,
    val content: String,
    val version: Int,
    val createdBy: String?,
    val createdAt: Long,
    val deviceSource: String = "kotlin",
    val deviceVersion: Long = 1
)

// ============= Share Converters =============

fun DbShare.toDomainEntity(): Share = Share(
    id = id,
    documentId = documentId,
    sharedWithUserId = sharedWithUserId,
    permission = permission,
    createdAt = createdAt
)

data class DbShare(
    val id: String,
    val documentId: String,
    val sharedWithUserId: String,
    val permission: String,
    val createdAt: Long
)

// ============= AiSession Converters =============

fun DbAiSession.toDomainEntity(): AiSession {
    val turns = try {
        // Parse JSON array of turns
        val turnsArray = json.decodeFromString<List<AiTurn>>("[$turnsJson]")
        turnsArray
    } catch (e: Exception) {
        emptyList()
    }
    
    val meta = metadata?.let { metaStr ->
        try {
            json.decodeFromString(metaStr)
        } catch (e: Exception) {
            null
        }
    }
    
    return AiSession(
        id = id,
        userId = userId,
        mode = mode,
        turns = turns,
        metadata = meta,
        createdAt = createdAt
    )
}

data class DbAiSession(
    val id: String,
    val userId: String?,
    val mode: String,
    val turnsJson: String,
    val metadata: String?,
    val createdAt: Long
)

// ============= SyncMetadata Converters =============

fun DbSyncMetadata.toDomainEntity(): SyncMetadata = SyncMetadata(
    documentId = documentId,
    lastSyncedAt = lastSyncedAt,
    localVersion = localVersion,
    remoteVersion = remoteVersion,
    pendingChanges = pendingChanges,
    conflictStatus = conflictStatus,
    updatedAt = updatedAt
)

data class DbSyncMetadata(
    val documentId: String,
    val lastSyncedAt: Long?,
    val localVersion: Long,
    val remoteVersion: Long,
    val pendingChanges: Int = 0,
    val conflictStatus: String = "none",
    val updatedAt: Long
)

// ============= PendingSyncItem Converters =============

fun DbPendingSyncItem.toDomainEntity(): PendingSyncItem {
    val changeData = try {
        val jsonStr = "{$changeDataJson}"
        json.decodeFromString<Map<String, String>>(jsonStr)
    } catch (e: Exception) {
        emptyMap()
    }
    
    return PendingSyncItem(
        id = id,
        documentId = documentId,
        userId = userId,
        deviceId = deviceId,
        changeData = changeData,
        status = status,
        retryCount = retryCount,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}

data class DbPendingSyncItem(
    val id: String,
    val documentId: String,
    val userId: String?,
    val deviceId: String,
    val changeDataJson: String,
    val status: String = "pending",
    val retryCount: Int = 0,
    val createdAt: Long,
    val updatedAt: Long
)

// ============= DocumentConflict Converters =============

fun DbDocumentConflict.toDomainEntity(): DocumentConflict {
    return DocumentConflict(
        id = id,
        documentId = documentId,
        baseVersion = parseVersionJson(baseVersionJson),
        androidVersion = parseVersionJson(androidVersionJson),
        webVersion = parseVersionJson(webVersionJson),
        resolvedVersion = resolvedVersionJson?.let { parseVersionJson(it) },
        status = status,
        createdAt = createdAt,
        resolvedAt = resolvedAt
    )
}

private fun parseVersionJson(jsonStr: String): DocumentVersion {
    return try {
        kotlinx.serialization.json.Json.decodeFromString(jsonStr)
    } catch (e: Exception) {
        // Fallback to minimal version
        DocumentVersion(
            id = "unknown",
            documentId = "unknown",
            content = "",
            version = 0,
            createdAt = System.currentTimeMillis()
        )
    }
}

data class DbDocumentConflict(
    val id: String,
    val documentId: String,
    val baseVersionJson: String,
    val androidVersionJson: String,
    val webVersionJson: String,
    val resolvedVersionJson: String?,
    val status: String = "unresolved",
    val createdAt: Long,
    val resolvedAt: Long?
)
