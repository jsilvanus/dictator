package com.dictator.core.service

import com.dictator.core.data.error.DataException
import com.dictator.core.data.remote.RemoteApiService
import com.dictator.core.domain.entity.Document
import com.dictator.core.domain.entity.DocumentVersion
import com.dictator.core.domain.entity.SyncMetadata
import com.dictator.core.domain.repository.ConflictRepository
import com.dictator.core.domain.repository.DocumentRepository
import com.dictator.core.domain.repository.DocumentVersionRepository
import com.dictator.core.domain.repository.PendingSyncRepository
import com.dictator.core.domain.repository.SyncMetadataRepository
import io.github.aakira.napier.Napier
import kotlinx.datetime.Clock
import kotlin.random.Random

/**
 * Sync service implementation.
 * Manages device-aware synchronization of documents with conflict detection and resolution.
 * Coordinates between local storage and remote API.
 */
class SyncServiceImpl(
    private val documentRepository: DocumentRepository,
    private val documentVersionRepository: DocumentVersionRepository,
    private val syncMetadataRepository: SyncMetadataRepository,
    private val pendingSyncRepository: PendingSyncRepository,
    private val conflictRepository: ConflictRepository,
    private val remoteApiService: RemoteApiService
) : SyncService {
    
    /**
     * Syncs a single document with the remote server.
     * Handles pulling remote changes and pushing local changes.
     * Detects and manages conflicts.
     */
    override suspend fun syncDocument(documentId: String, deviceId: String): Document {
        return try {
            Napier.d("Syncing document: $documentId on device: $deviceId")
            
            val document = documentRepository.getDocumentById(documentId)
                ?: throw DataException.NotFound("Document not found: $documentId")
            
            // Get sync metadata
            var syncMetadata = syncMetadataRepository.getSyncMetadata(documentId)
                ?: SyncMetadata(
                    documentId = documentId,
                    lastSyncedAt = null,
                    localVersion = 1,
                    remoteVersion = 1,
                    pendingChanges = 0,
                    conflictStatus = "none",
                    updatedAt = Clock.System.now().toEpochMilliseconds()
                )
            
            // Pull changes from remote
            val remoteChanges = pullChanges(documentId, syncMetadata.lastSyncedAt ?: 0)
            
            // Check for conflicts
            if (remoteChanges.isNotEmpty()) {
                val localVersion = documentVersionRepository.getVersionsByDocumentId(documentId).lastOrNull()
                if (localVersion != null && hasConflict(localVersion, remoteChanges.last())) {
                    syncMetadata = syncMetadata.copy(conflictStatus = "unresolved")
                    Napier.w("Conflict detected for document: $documentId")
                }
            }
            
            // Push local changes
            pushChanges(documentId, mapOf("title" to document.title, "version" to document.deviceVersion.toString()), deviceId)
            
            // Update sync metadata
            syncMetadata = syncMetadata.copy(
                lastSyncedAt = Clock.System.now().toEpochMilliseconds(),
                remoteVersion = syncMetadata.remoteVersion + 1,
                pendingChanges = 0
            )
            syncMetadataRepository.upsertSyncMetadata(syncMetadata)
            
            Napier.i("Document synced successfully: $documentId")
            document
        } catch (e: DataException) {
            Napier.e("Failed to sync document: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error syncing document", e)
            throw DataException.SyncError("Failed to sync document: ${e.message}")
        }
    }
    
    /**
     * Pushes local changes to the remote server.
     * Queues changes if offline.
     */
    override suspend fun pushChanges(documentId: String, changes: Map<String, String>, deviceId: String) {
        return try {
            Napier.d("Pushing changes for document: $documentId")
            
            try {
                // Try to push to remote
                remoteApiService.pushDocumentChanges(documentId, changes, deviceId)
                Napier.d("Changes pushed to remote successfully")
            } catch (e: DataException.NetworkError) {
                // Queue for later sync if offline
                Napier.w("Network unavailable, queuing changes for later sync")
                queuePendingSync(documentId, changes, deviceId)
            }
        } catch (e: DataException) {
            Napier.e("Failed to push changes: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error pushing changes", e)
            throw DataException.SyncError("Failed to push changes: ${e.message}")
        }
    }
    
    /**
     * Pulls changes from remote server since a specific timestamp.
     * Returns list of document versions that have been updated.
     */
    override suspend fun pullChanges(documentId: String, since: Long): List<DocumentVersion> {
        return try {
            Napier.d("Pulling changes for document: $documentId since: $since")
            
            val remoteVersions = remoteApiService.getDocumentVersions(documentId, since)
            
            // Store remote versions locally
            for (version in remoteVersions) {
                documentVersionRepository.createVersion(version)
            }
            
            Napier.d("Pulled ${remoteVersions.size} versions from remote")
            remoteVersions
        } catch (e: DataException.NetworkError) {
            Napier.w("Network unavailable, cannot pull changes")
            emptyList()
        } catch (e: DataException) {
            Napier.e("Failed to pull changes: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error pulling changes", e)
            throw DataException.SyncError("Failed to pull changes: ${e.message}")
        }
    }
    
    /**
     * Gets the current sync status of a document.
     * Returns metadata about pending changes, conflicts, and versions.
     */
    override suspend fun getSyncStatus(documentId: String): SyncMetadata? {
        return try {
            Napier.d("Getting sync status for document: $documentId")
            syncMetadataRepository.getSyncMetadata(documentId)
        } catch (e: Exception) {
            Napier.e("Error getting sync status", e)
            null
        }
    }
    
    /**
     * Resolves a sync conflict by choosing a resolution version.
     * Updates the document to use the chosen version.
     */
    override suspend fun resolveSyncConflict(conflictId: String, resolution: DocumentVersion) {
        return try {
            Napier.d("Resolving sync conflict: $conflictId")
            
            val conflict = conflictRepository.getConflictById(conflictId)
                ?: throw DataException.NotFound("Conflict not found: $conflictId")
            
            // Use the resolution version as the canonical version
            documentVersionRepository.createVersion(resolution)
            
            // Update document to reflect resolution
            val document = documentRepository.getDocumentById(conflict.documentId)
            if (document != null) {
                val updated = document.copy(
                    updatedAt = Clock.System.now().toEpochMilliseconds(),
                    deviceVersion = resolution.deviceVersion + 1
                )
                documentRepository.updateDocument(updated)
            }
            
            // Update conflict as resolved
            conflictRepository.resolveConflict(conflictId)
            
            // Update sync metadata
            val syncMetadata = syncMetadataRepository.getSyncMetadata(conflict.documentId)
            if (syncMetadata != null) {
                val resolved = syncMetadata.copy(conflictStatus = "resolved")
                syncMetadataRepository.upsertSyncMetadata(resolved)
            }
            
            Napier.i("Conflict resolved: $conflictId")
        } catch (e: DataException) {
            Napier.e("Failed to resolve conflict: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error resolving conflict", e)
            throw DataException.ConflictError("Failed to resolve conflict: ${e.message}")
        }
    }
    
    private suspend fun queuePendingSync(documentId: String, changes: Map<String, String>, deviceId: String) {
        val pendingItem = com.dictator.core.domain.entity.PendingSyncItem(
            id = "sync_${System.currentTimeMillis()}_${Random.nextInt(10000)}",
            documentId = documentId,
            deviceId = deviceId,
            changeData = changes,
            status = "pending",
            createdAt = Clock.System.now().toEpochMilliseconds(),
            updatedAt = Clock.System.now().toEpochMilliseconds()
        )
        pendingSyncRepository.createPendingItem(pendingItem)
    }
    
    private fun hasConflict(localVersion: DocumentVersion, remoteVersion: DocumentVersion): Boolean {
        // Conflict exists if both versions have different content but same base
        return localVersion.content != remoteVersion.content &&
               localVersion.version > 0 && remoteVersion.version > 0
    }
}
