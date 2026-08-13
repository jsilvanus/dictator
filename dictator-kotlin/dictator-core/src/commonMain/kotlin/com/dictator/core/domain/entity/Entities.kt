package com.dictator.core.domain.entity

import kotlinx.serialization.Serializable

/**
 * Represents a user in the Dictator system.
 * Users can create documents, folders, and collaborate with others.
 */
@Serializable
data class User(
    val id: String,
    val email: String,
    val name: String? = null,
    val createdAt: Long  // Milliseconds since epoch
)

/**
 * Represents a folder for organizing documents.
 * Folders support hierarchical structure with parent/child relationships.
 */
@Serializable
data class Folder(
    val id: String,
    val name: String,
    val userId: String,
    val parentId: String? = null,  // Null for root folders
    val createdAt: Long
)

/**
 * Represents a document in the system.
 * Documents can contain rich text content, be shared, and synced across devices.
 */
@Serializable
data class Document(
    val id: String,
    val title: String,
    val folderId: String,
    val userId: String? = null,  // Nullable for offline-first support
    val createdAt: Long,
    val updatedAt: Long,
    val lastModifiedDevice: String = "kotlin",  // 'kotlin', 'web', 'android'
    val deviceVersion: Long = 1  // Version number for conflict tracking
)

/**
 * Represents a version snapshot of a document.
 * Each time a document is saved, a new version is created.
 */
@Serializable
data class DocumentVersion(
    val id: String,
    val documentId: String,
    val content: String,  // Rich text content
    val version: Int,
    val createdBy: String? = null,
    val createdAt: Long,
    val deviceSource: String = "kotlin",  // Device that created this version
    val deviceVersion: Long = 1
)

/**
 * Represents a document share/permission record.
 * Defines who has access to a document and what permissions they have.
 */
@Serializable
data class Share(
    val id: String,
    val documentId: String,
    val sharedWithUserId: String,
    val permission: String,  // "view", "edit", "admin"
    val createdAt: Long
)

/**
 * Represents an AI conversation session.
 * Can be used for inline prompts or side-panel chat.
 */
@Serializable
data class AiSession(
    val id: String,
    val userId: String? = null,  // Nullable for offline-first mode
    val mode: String,  // "inline" or "panel"
    val turns: List<AiTurn> = emptyList(),
    val metadata: Map<String, String>? = null,
    val createdAt: Long
) {
    fun turnsJson(): String = turns.joinToString(",") { 
        """{"role":"${it.role}","content":"${it.content.replace("\"", "\\\"")}"}"""
    }
}

/**
 * Represents a single turn in an AI conversation.
 */
@Serializable
data class AiTurn(
    val role: String,  // "user" or "assistant"
    val content: String
)

/**
 * Tracks synchronization state for a document.
 * Used for managing device-aware sync and conflict resolution.
 */
@Serializable
data class SyncMetadata(
    val documentId: String,
    val lastSyncedAt: Long? = null,
    val localVersion: Long = 1,
    val remoteVersion: Long = 1,
    val pendingChanges: Int = 0,
    val conflictStatus: String = "none",  // "none", "resolved", "unresolved"
    val updatedAt: Long
)

/**
 * Represents a queued change waiting to be synced.
 * Used for offline-first mode to queue changes when network is unavailable.
 */
@Serializable
data class PendingSyncItem(
    val id: String,
    val documentId: String,
    val userId: String? = null,
    val deviceId: String = "kotlin",
    val changeData: Map<String, String>,
    val status: String = "pending",  // "pending", "failed", "synced"
    val retryCount: Int = 0,
    val createdAt: Long,
    val updatedAt: Long
) {
    fun changeDataJson(): String {
        return changeData.entries.joinToString(",") { (k, v) ->
            """"$k":"${v.replace("\"", "\\\"")}""""
        }
    }
}

/**
 * Represents a version conflict for a document.
 * Occurs when different devices make conflicting changes.
 */
@Serializable
data class DocumentConflict(
    val id: String,
    val documentId: String,
    val baseVersion: DocumentVersion,
    val androidVersion: DocumentVersion,
    val webVersion: DocumentVersion,
    val resolvedVersion: DocumentVersion? = null,
    val status: String = "unresolved",  // "unresolved", "resolved"
    val createdAt: Long,
    val resolvedAt: Long? = null
)
