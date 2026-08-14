package com.dictator.core.service

import com.dictator.core.data.error.DataException
import com.dictator.core.data.remote.RemoteApiService
import com.dictator.core.domain.entity.Document
import com.dictator.core.domain.entity.Share
import com.dictator.core.domain.repository.DocumentRepository
import com.dictator.core.domain.repository.ShareRepository
import io.github.aakira.napier.Napier
import kotlinx.datetime.Clock
import kotlin.random.Random

/**
 * Share service implementation.
 * Manages document sharing and collaboration permissions.
 * Handles share creation, updates, and revocation.
 */
class ShareServiceImpl(
    private val shareRepository: ShareRepository,
    private val documentRepository: DocumentRepository,
    private val remoteApiService: RemoteApiService
) : ShareService {
    
    /**
     * Shares a document with another user.
     * Creates a share record with specified permissions.
     * Syncs share to remote server.
     */
    override suspend fun shareDocument(documentId: String, withUserId: String, permission: String): Share {
        return try {
            Napier.d("Sharing document: $documentId with user: $withUserId with permission: $permission")
            
            // Validate inputs
            if (documentId.isBlank()) {
                throw DataException.ValidationError("Document ID cannot be empty")
            }
            if (withUserId.isBlank()) {
                throw DataException.ValidationError("User ID cannot be empty")
            }
            if (permission !in listOf("view", "edit", "admin")) {
                throw DataException.ValidationError("Invalid permission level: $permission")
            }
            
            // Verify document exists
            val document = documentRepository.getDocumentById(documentId)
                ?: throw DataException.NotFound("Document not found: $documentId")
            
            val shareId = generateShareId()
            val now = Clock.System.now().toEpochMilliseconds()
            
            val share = Share(
                id = shareId,
                documentId = documentId,
                sharedWithUserId = withUserId,
                permission = permission,
                createdAt = now
            )
            
            // Save to local storage
            val createdShare = shareRepository.createShare(share)
            
            // Sync to remote
            try {
                val remoteShare = remoteApiService.shareDocument(documentId, withUserId, permission)
                
                if (remoteShare.id != shareId) {
                    shareRepository.updateShare(remoteShare)
                    Napier.d("Share created remotely with ID: ${remoteShare.id}")
                    return remoteShare
                }
            } catch (e: DataException.NetworkError) {
                Napier.w("Could not sync share to remote (offline mode)")
            }
            
            Napier.i("Document shared successfully: $documentId with user: $withUserId")
            createdShare
        } catch (e: DataException) {
            Napier.e("Failed to share document: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error sharing document", e)
            throw DataException.DatabaseError("Failed to share document: ${e.message}", e)
        }
    }
    
    /**
     * Updates the permission level of an existing share.
     * Syncs changes to remote server.
     */
    override suspend fun updateShare(shareId: String, permission: String): Share {
        return try {
            Napier.d("Updating share: $shareId with permission: $permission")
            
            // Validate permission
            if (permission !in listOf("view", "edit", "admin")) {
                throw DataException.ValidationError("Invalid permission level: $permission")
            }
            
            val existing = shareRepository.getShareById(shareId)
                ?: throw DataException.NotFound("Share not found: $shareId")
            
            val updated = existing.copy(permission = permission)
            
            // Update local storage
            val result = shareRepository.updateShare(updated)
            
            // Sync to remote
            try {
                remoteApiService.updateShare(shareId, permission)
                Napier.d("Share synced to remote")
            } catch (e: DataException.NetworkError) {
                Napier.w("Could not sync share update to remote (offline mode)")
            }
            
            Napier.i("Share updated successfully: $shareId with permission: $permission")
            result
        } catch (e: DataException) {
            Napier.e("Failed to update share: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error updating share", e)
            throw DataException.DatabaseError("Failed to update share: ${e.message}", e)
        }
    }
    
    /**
     * Revokes access to a shared document.
     * Deletes the share record and syncs removal to remote.
     */
    override suspend fun revokeShare(shareId: String) {
        return try {
            Napier.d("Revoking share: $shareId")
            
            val share = shareRepository.getShareById(shareId)
                ?: throw DataException.NotFound("Share not found: $shareId")
            
            // Delete from local storage
            shareRepository.deleteShare(shareId)
            
            // Delete from remote
            try {
                remoteApiService.revokeShare(shareId)
                Napier.d("Share revoked on remote")
            } catch (e: DataException.NetworkError) {
                Napier.w("Could not revoke share on remote (offline mode)")
            }
            
            Napier.i("Share revoked successfully: $shareId")
        } catch (e: DataException) {
            Napier.e("Failed to revoke share: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error revoking share", e)
            throw DataException.DatabaseError("Failed to revoke share: ${e.message}", e)
        }
    }
    
    /**
     * Gets all documents shared with a user.
     * Returns list of documents that other users have shared access to.
     */
    override suspend fun getSharedDocuments(userId: String): List<Document> {
        return try {
            Napier.d("Fetching shared documents for user: $userId")
            
            // Get all shares for this user
            val shares = shareRepository.getSharesByUserId(userId)
            
            // Get documents for each share
            val sharedDocuments = mutableListOf<Document>()
            for (share in shares) {
                val document = documentRepository.getDocumentById(share.documentId)
                if (document != null) {
                    sharedDocuments.add(document)
                }
            }
            
            // Try to sync from remote
            try {
                val remoteSharedDocs = remoteApiService.getSharedDocuments(userId)
                
                // Update local cache with any new shared documents
                for (doc in remoteSharedDocs) {
                    documentRepository.updateDocument(doc)
                }
                
                Napier.d("Synced ${remoteSharedDocs.size} shared documents from remote")
                remoteSharedDocs
            } catch (e: DataException.NetworkError) {
                Napier.w("Network unavailable, using local shared documents: ${sharedDocuments.size}")
                sharedDocuments
            }
        } catch (e: DataException) {
            Napier.e("Failed to get shared documents: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error getting shared documents", e)
            throw DataException.DatabaseError("Failed to get shared documents: ${e.message}", e)
        }
    }
    
    private fun generateShareId(): String {
        return "share_${System.currentTimeMillis()}_${Random.nextInt(10000)}"
    }
}
