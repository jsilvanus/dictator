package com.dictator.core.service

import com.dictator.core.data.error.DataException
import com.dictator.core.data.remote.RemoteApiService
import com.dictator.core.domain.entity.Document
import com.dictator.core.domain.repository.DocumentRepository
import io.github.aakira.napier.Napier
import kotlinx.datetime.Clock
import kotlin.random.Random

/**
 * Document service implementation.
 * Orchestrates document operations combining local cache with remote synchronization.
 * Handles offline operations and triggers sync after mutations.
 */
class DocumentServiceImpl(
    private val documentRepository: DocumentRepository,
    private val remoteApiService: RemoteApiService,
    private val syncService: SyncService
) : DocumentService {
    
    /**
     * Gets all documents for a user, combining local cache with remote data.
     * Performs sync in background when online.
     */
    override suspend fun getDocuments(userId: String): List<Document> {
        return try {
            Napier.d("Fetching documents for user: $userId")
            
            // Get documents from local cache first
            val localDocuments = documentRepository.getDocumentsByUserId(userId)
            
            // Try to sync from remote in background
            try {
                val remoteDocuments = remoteApiService.getDocuments(userId)
                
                // Update local cache with remote data
                for (doc in remoteDocuments) {
                    documentRepository.updateDocument(doc)
                }
                
                Napier.d("Synced ${remoteDocuments.size} documents from remote")
                remoteDocuments
            } catch (e: DataException.NetworkError) {
                // Offline mode - return local cache
                Napier.w("Network unavailable, using local cache with ${localDocuments.size} documents")
                localDocuments
            }
        } catch (e: DataException) {
            Napier.e("Failed to get documents: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error getting documents", e)
            throw DataException.DatabaseError("Failed to get documents: ${e.message}", e)
        }
    }
    
    /**
     * Creates a new document in the specified folder.
     * Saves to local storage immediately, syncs to remote after creation.
     */
    override suspend fun createDocument(title: String, folderId: String, userId: String?): Document {
        return try {
            Napier.d("Creating document: $title in folder: $folderId")
            
            val documentId = generateDocumentId()
            val now = Clock.System.now().toEpochMilliseconds()
            
            val document = Document(
                id = documentId,
                title = title,
                folderId = folderId,
                userId = userId,
                createdAt = now,
                updatedAt = now,
                lastModifiedDevice = "kotlin",
                deviceVersion = 1
            )
            
            // Save to local storage first
            val createdDoc = documentRepository.createDocument(document)
            
            // Sync to remote
            try {
                val remoteDoc = remoteApiService.createDocument(
                    title = title,
                    folderId = folderId,
                    userId = userId
                )
                
                // Update local with remote ID if different
                if (remoteDoc.id != documentId) {
                    documentRepository.updateDocument(remoteDoc)
                    Napier.d("Document created remotely with ID: ${remoteDoc.id}")
                    return remoteDoc
                }
            } catch (e: DataException.NetworkError) {
                Napier.w("Could not sync document to remote (offline mode)")
                // Continue with local version
            }
            
            Napier.i("Document created successfully: $documentId")
            createdDoc
        } catch (e: DataException) {
            Napier.e("Failed to create document: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error creating document", e)
            throw DataException.DatabaseError("Failed to create document: ${e.message}", e)
        }
    }
    
    /**
     * Updates a document title.
     * Updates local storage and triggers remote sync.
     */
    override suspend fun updateDocument(id: String, title: String, userId: String?): Document {
        return try {
            Napier.d("Updating document: $id with title: $title")
            
            val existing = documentRepository.getDocumentById(id)
                ?: throw DataException.NotFound("Document not found: $id")
            
            val now = Clock.System.now().toEpochMilliseconds()
            val updated = existing.copy(
                title = title,
                updatedAt = now,
                lastModifiedDevice = "kotlin",
                deviceVersion = existing.deviceVersion + 1
            )
            
            // Update local storage
            val result = documentRepository.updateDocument(updated)
            
            // Sync to remote
            try {
                syncService.syncDocument(id, "kotlin")
                Napier.d("Document synced to remote")
            } catch (e: DataException.NetworkError) {
                Napier.w("Could not sync document update to remote (offline mode)")
                // Continue with local version
            }
            
            Napier.i("Document updated successfully: $id")
            result
        } catch (e: DataException) {
            Napier.e("Failed to update document: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error updating document", e)
            throw DataException.DatabaseError("Failed to update document: ${e.message}", e)
        }
    }
    
    /**
     * Deletes a document by ID.
     * Removes from local storage and remote.
     */
    override suspend fun deleteDocument(id: String) {
        return try {
            Napier.d("Deleting document: $id")
            
            // Delete from local storage
            documentRepository.deleteDocument(id)
            
            // Delete from remote
            try {
                remoteApiService.deleteDocument(id)
                Napier.d("Document deleted from remote")
            } catch (e: DataException.NetworkError) {
                Napier.w("Could not delete document from remote (offline mode)")
                // Local deletion still succeeded
            }
            
            Napier.i("Document deleted successfully: $id")
        } catch (e: DataException) {
            Napier.e("Failed to delete document: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error deleting document", e)
            throw DataException.DatabaseError("Failed to delete document: ${e.message}", e)
        }
    }
    
    /**
     * Gets a document by ID from local cache.
     * Returns null if not found.
     */
    override suspend fun getDocumentById(id: String): Document? {
        return try {
            Napier.d("Fetching document: $id")
            documentRepository.getDocumentById(id)
        } catch (e: Exception) {
            Napier.e("Error fetching document: $id", e)
            null
        }
    }
    
    private fun generateDocumentId(): String {
        return "doc_${System.currentTimeMillis()}_${Random.nextInt(10000)}"
    }
}
