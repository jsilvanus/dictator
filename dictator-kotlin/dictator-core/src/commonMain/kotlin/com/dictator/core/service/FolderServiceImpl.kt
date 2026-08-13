package com.dictator.core.service

import com.dictator.core.data.error.DataException
import com.dictator.core.data.remote.RemoteApiService
import com.dictator.core.domain.entity.Folder
import com.dictator.core.domain.repository.DocumentRepository
import com.dictator.core.domain.repository.FolderRepository
import io.github.aakira.napier.Napier
import kotlinx.datetime.Clock
import kotlin.random.Random

/**
 * Folder service implementation.
 * Manages folder hierarchy and operations.
 * Validates parent-child relationships and handles cascading deletes.
 */
class FolderServiceImpl(
    private val folderRepository: FolderRepository,
    private val documentRepository: DocumentRepository,
    private val remoteApiService: RemoteApiService
) : FolderService {
    
    /**
     * Gets all folders for a user.
     * Returns flat list of folders.
     */
    override suspend fun getFolders(userId: String): List<Folder> {
        return try {
            Napier.d("Fetching folders for user: $userId")
            
            val localFolders = folderRepository.getFoldersByUserId(userId)
            
            // Try to sync from remote
            try {
                val remoteFolders = remoteApiService.getFolders(userId)
                
                // Update local cache
                for (folder in remoteFolders) {
                    folderRepository.updateFolder(folder)
                }
                
                Napier.d("Synced ${remoteFolders.size} folders from remote")
                remoteFolders
            } catch (e: DataException.NetworkError) {
                Napier.w("Network unavailable, using local folders: ${localFolders.size}")
                localFolders
            }
        } catch (e: DataException) {
            Napier.e("Failed to get folders: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error getting folders", e)
            throw DataException.DatabaseError("Failed to get folders: ${e.message}", e)
        }
    }
    
    /**
     * Creates a new folder.
     * Validates parent folder exists if parentId is provided.
     * Saves to local storage and syncs to remote.
     */
    override suspend fun createFolder(name: String, userId: String, parentId: String?): Folder {
        return try {
            Napier.d("Creating folder: $name for user: $userId with parent: $parentId")
            
            // Validate inputs
            if (name.isBlank()) {
                throw DataException.ValidationError("Folder name cannot be empty")
            }
            
            // Validate parent folder exists if provided
            if (parentId != null) {
                val parentFolder = folderRepository.getFolderById(parentId)
                    ?: throw DataException.NotFound("Parent folder not found: $parentId")
                
                // Ensure parent belongs to same user
                if (parentFolder.userId != userId) {
                    throw DataException.AuthorizationError("Parent folder does not belong to user")
                }
            }
            
            val folderId = generateFolderId()
            val now = Clock.System.now().toEpochMilliseconds()
            
            val folder = Folder(
                id = folderId,
                name = name,
                userId = userId,
                parentId = parentId,
                createdAt = now
            )
            
            // Save to local storage
            val createdFolder = folderRepository.createFolder(folder)
            
            // Sync to remote
            try {
                val remoteFolder = remoteApiService.createFolder(name, userId, parentId)
                
                if (remoteFolder.id != folderId) {
                    folderRepository.updateFolder(remoteFolder)
                    Napier.d("Folder created remotely with ID: ${remoteFolder.id}")
                    return remoteFolder
                }
            } catch (e: DataException.NetworkError) {
                Napier.w("Could not sync folder to remote (offline mode)")
            }
            
            Napier.i("Folder created successfully: $folderId")
            createdFolder
        } catch (e: DataException) {
            Napier.e("Failed to create folder: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error creating folder", e)
            throw DataException.DatabaseError("Failed to create folder: ${e.message}", e)
        }
    }
    
    /**
     * Updates a folder's name.
     * Syncs changes to remote.
     */
    override suspend fun updateFolder(id: String, name: String): Folder {
        return try {
            Napier.d("Updating folder: $id with name: $name")
            
            // Validate inputs
            if (name.isBlank()) {
                throw DataException.ValidationError("Folder name cannot be empty")
            }
            
            val existing = folderRepository.getFolderById(id)
                ?: throw DataException.NotFound("Folder not found: $id")
            
            val updated = existing.copy(name = name)
            
            // Update local storage
            val result = folderRepository.updateFolder(updated)
            
            // Sync to remote
            try {
                remoteApiService.updateFolder(id, name)
                Napier.d("Folder synced to remote")
            } catch (e: DataException.NetworkError) {
                Napier.w("Could not sync folder update to remote (offline mode)")
            }
            
            Napier.i("Folder updated successfully: $id")
            result
        } catch (e: DataException) {
            Napier.e("Failed to update folder: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error updating folder", e)
            throw DataException.DatabaseError("Failed to update folder: ${e.message}", e)
        }
    }
    
    /**
     * Deletes a folder and all documents within it.
     * Handles cascading deletes.
     */
    override suspend fun deleteFolder(id: String) {
        return try {
            Napier.d("Deleting folder: $id")
            
            val folder = folderRepository.getFolderById(id)
                ?: throw DataException.NotFound("Folder not found: $id")
            
            // Get all documents in this folder
            val documents = documentRepository.getDocumentsByFolderId(id)
            
            // Delete all documents in this folder
            for (doc in documents) {
                documentRepository.deleteDocument(doc.id)
            }
            
            // Delete child folders recursively
            val childFolders = folderRepository.getFoldersByParentId(id)
            for (childFolder in childFolders) {
                deleteFolder(childFolder.id)
            }
            
            // Delete the folder itself
            folderRepository.deleteFolder(id)
            
            // Delete from remote
            try {
                remoteApiService.deleteFolder(id)
                Napier.d("Folder deleted from remote")
            } catch (e: DataException.NetworkError) {
                Napier.w("Could not delete folder from remote (offline mode)")
            }
            
            Napier.i("Folder deleted successfully: $id")
        } catch (e: DataException) {
            Napier.e("Failed to delete folder: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error deleting folder", e)
            throw DataException.DatabaseError("Failed to delete folder: ${e.message}", e)
        }
    }
    
    /**
     * Gets the hierarchical folder structure for a user.
     * Organizes folders by parent-child relationships.
     */
    override suspend fun getFolderHierarchy(userId: String): List<Folder> {
        return try {
            Napier.d("Getting folder hierarchy for user: $userId")
            
            val allFolders = folderRepository.getFoldersByUserId(userId)
            
            // Return folders organized hierarchically
            // In a real implementation, this might return a nested structure
            // For now, return sorted by parentId (nulls first)
            allFolders.sortedWith(compareBy<Folder> { it.parentId != null }.thenBy { it.parentId })
        } catch (e: DataException) {
            Napier.e("Failed to get folder hierarchy: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error getting folder hierarchy", e)
            throw DataException.DatabaseError("Failed to get folder hierarchy: ${e.message}", e)
        }
    }
    
    private fun generateFolderId(): String {
        return "folder_${System.currentTimeMillis()}_${Random.nextInt(10000)}"
    }
}
