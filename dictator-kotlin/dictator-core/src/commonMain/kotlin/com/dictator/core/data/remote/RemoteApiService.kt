package com.dictator.core.data.remote

import com.dictator.core.data.error.DataException
import com.dictator.core.domain.entity.*
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*

/**
 * Remote data source implementations using Ktor HTTP client.
 * 
 * REFACTORING NOTE: This service is currently monolithic (588 LOC) and should be split
 * into domain-specific sub-services for better maintainability:
 * 
 * - AuthApiService (implemented) - login, signup, token management
 * - DocumentApiService - document CRUD, versions
 * - FolderApiService - folder management  
 * - ShareApiService - document sharing
 * - AiApiService - AI sessions and chat
 * 
 * This facade will delegate to these services in a future refactoring.
 * For now, all endpoints are implemented here with clear section markers.
 * 
 * TODO: Extract into separate services (Phase 6)
 */

class RemoteApiService(
    private val httpClient: HttpClient,
    private val baseUrl: String = "http://localhost:3000",
    private var authToken: String? = null
) {
    
    // ============= Authentication =============
    
    suspend fun login(email: String, password: String): Pair<String, User> {
        return try {
            val response = httpClient.post("$baseUrl/api/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(LoginRequest(email, password))
            }
            
            if (response.status.isSuccess()) {
                val loginResp = response.body<LoginResponse>()
                authToken = loginResp.token
                val user = User(
                    id = loginResp.userId,
                    email = loginResp.email,
                    name = loginResp.name,
                    createdAt = System.currentTimeMillis()
                )
                Pair(loginResp.token, user)
            } else {
                throw DataException.ServerError("Login failed", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Login error", e)
        }
    }
    
    suspend fun signup(email: String, name: String, password: String): Pair<String, User> {
        return try {
            val response = httpClient.post("$baseUrl/api/auth/signup") {
                contentType(ContentType.Application.Json)
                setBody(SignupRequest(email, name, password))
            }
            
            if (response.status.isSuccess()) {
                val signupResp = response.body<LoginResponse>()
                authToken = signupResp.token
                val user = User(
                    id = signupResp.userId,
                    email = signupResp.email,
                    name = signupResp.name,
                    createdAt = System.currentTimeMillis()
                )
                Pair(signupResp.token, user)
            } else {
                throw DataException.ServerError("Signup failed", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Signup error", e)
        }
    }
    
    suspend fun logout(): Boolean {
        return try {
            val response = httpClient.post("$baseUrl/api/auth/logout") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
            }
            
            if (response.status.isSuccess()) {
                authToken = null
                true
            } else {
                throw DataException.ServerError("Logout failed", response.status.value)
            }
        } catch (e: Exception) {
            authToken = null
            false
        }
    }
    
    suspend fun getSession(): User? {
        return try {
            val response = httpClient.get("$baseUrl/api/auth/session") {
                authToken?.let { header("Authorization", "******") }
            }
            
            if (response.status.isSuccess()) {
                val sessionResp = response.body<SessionResponse>()
                User(
                    id = sessionResp.userId,
                    email = sessionResp.email,
                    name = sessionResp.name,
                    createdAt = System.currentTimeMillis()
                )
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
    
    suspend fun validateToken(token: String): Boolean {
        return try {
            val response = httpClient.post("$baseUrl/api/auth/validate") {
                contentType(ContentType.Application.Json)
                header("Authorization", "******")
                setBody(mapOf("token" to token))
            }
            response.status.isSuccess()
        } catch (e: Exception) {
            throw DataException.AuthenticationError("Token validation failed: ${e.message}")
        }
    }
    
    suspend fun refreshToken(token: String): String {
        return try {
            val response = httpClient.post("$baseUrl/api/auth/refresh") {
                contentType(ContentType.Application.Json)
                header("Authorization", "******")
                setBody(mapOf("token" to token))
            }
            
            if (response.status.isSuccess()) {
                val refreshResp = response.body<RefreshTokenResponse>()
                authToken = refreshResp.token
                refreshResp.token
            } else {
                throw DataException.ServerError("Token refresh failed", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Token refresh error", e)
        }
    }
    
    // ============= Documents =============
    
    suspend fun getDocuments(userId: String): List<Document> {
        return try {
            val response = httpClient.get("$baseUrl/api/documents") {
                authToken?.let { header("Authorization", "******") }
                parameter("userId", userId)
            }
            
            if (response.status.isSuccess()) {
                response.body<List<DocumentResponse>>().map { dto ->
                    Document(
                        id = dto.id,
                        title = dto.title,
                        folderId = dto.folderId,
                        userId = dto.userId,
                        createdAt = dto.createdAt,
                        updatedAt = dto.updatedAt,
                        lastModifiedDevice = dto.lastModifiedDevice,
                        deviceVersion = dto.deviceVersion
                    )
                }
            } else {
                throw DataException.ServerError("Failed to fetch documents", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Document fetch error", e)
        }
    }
    
    suspend fun getDocument(id: String): Document {
        return try {
            val response = httpClient.get("$baseUrl/api/documents/$id") {
                authToken?.let { header("Authorization", "******") }
            }
            
            if (response.status.isSuccess()) {
                val dto = response.body<DocumentResponse>()
                Document(
                    id = dto.id,
                    title = dto.title,
                    folderId = dto.folderId,
                    userId = dto.userId,
                    createdAt = dto.createdAt,
                    updatedAt = dto.updatedAt,
                    lastModifiedDevice = dto.lastModifiedDevice,
                    deviceVersion = dto.deviceVersion
                )
            } else if (response.status == HttpStatusCode.NotFound) {
                throw DataException.NotFound("Document not found")
            } else {
                throw DataException.ServerError("Failed to fetch document", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Document fetch error", e)
        }
    }
    
    suspend fun createDocument(title: String, folderId: String, userId: String?): Document {
        return try {
            val response = httpClient.post("$baseUrl/api/documents") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
                setBody(DocumentRequest(title, folderId))
            }
            
            if (response.status.isSuccess()) {
                val dto = response.body<DocumentResponse>()
                Document(
                    id = dto.id,
                    title = dto.title,
                    folderId = dto.folderId,
                    userId = dto.userId,
                    createdAt = dto.createdAt,
                    updatedAt = dto.updatedAt,
                    lastModifiedDevice = dto.lastModifiedDevice,
                    deviceVersion = dto.deviceVersion
                )
            } else {
                throw DataException.ServerError("Failed to create document", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Document creation error", e)
        }
    }
    
    suspend fun updateDocument(id: String, title: String, folderId: String): Document {
        return try {
            val response = httpClient.put("$baseUrl/api/documents/$id") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
                setBody(DocumentRequest(title, folderId))
            }
            
            if (response.status.isSuccess()) {
                val dto = response.body<DocumentResponse>()
                Document(
                    id = dto.id,
                    title = dto.title,
                    folderId = dto.folderId,
                    userId = dto.userId,
                    createdAt = dto.createdAt,
                    updatedAt = dto.updatedAt,
                    lastModifiedDevice = dto.lastModifiedDevice,
                    deviceVersion = dto.deviceVersion
                )
            } else {
                throw DataException.ServerError("Failed to update document", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Document update error", e)
        }
    }
    
    suspend fun deleteDocument(id: String): Boolean {
        return try {
            val response = httpClient.delete("$baseUrl/api/documents/$id") {
                authToken?.let { header("Authorization", "******") }
            }
            
            response.status.isSuccess()
        } catch (e: Exception) {
            throw DataException.NetworkError("Document deletion error", e)
        }
    }
    
    // ============= Folders =============
    
    suspend fun getFolders(userId: String): List<Folder> {
        return try {
            val response = httpClient.get("$baseUrl/api/folders") {
                authToken?.let { header("Authorization", "******") }
                parameter("userId", userId)
            }
            
            if (response.status.isSuccess()) {
                response.body<List<FolderResponse>>().map { dto ->
                    Folder(
                        id = dto.id,
                        name = dto.name,
                        userId = dto.userId,
                        parentId = dto.parentId,
                        createdAt = dto.createdAt
                    )
                }
            } else {
                throw DataException.ServerError("Failed to fetch folders", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Folder fetch error", e)
        }
    }
    
    suspend fun createFolder(name: String, userId: String, parentId: String?): Folder {
        return try {
            val response = httpClient.post("$baseUrl/api/folders") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
                setBody(FolderRequest(name, parentId))
            }
            
            if (response.status.isSuccess()) {
                val dto = response.body<FolderResponse>()
                Folder(
                    id = dto.id,
                    name = dto.name,
                    userId = dto.userId,
                    parentId = dto.parentId,
                    createdAt = dto.createdAt
                )
            } else {
                throw DataException.ServerError("Failed to create folder", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Folder creation error", e)
        }
    }
    
    suspend fun updateFolder(id: String, name: String): Folder {
        return try {
            val response = httpClient.put("$baseUrl/api/folders/$id") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
                setBody(FolderRequest(name))
            }
            
            if (response.status.isSuccess()) {
                val dto = response.body<FolderResponse>()
                Folder(
                    id = dto.id,
                    name = dto.name,
                    userId = dto.userId,
                    parentId = dto.parentId,
                    createdAt = dto.createdAt
                )
            } else {
                throw DataException.ServerError("Failed to update folder", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Folder update error", e)
        }
    }
    
    suspend fun deleteFolder(id: String): Boolean {
        return try {
            val response = httpClient.delete("$baseUrl/api/folders/$id") {
                authToken?.let { header("Authorization", "******") }
            }
            
            response.status.isSuccess()
        } catch (e: Exception) {
            throw DataException.NetworkError("Folder deletion error", e)
        }
    }
    
    // ============= Sharing =============
    
    suspend fun shareDocument(documentId: String, withUserId: String, permission: String): Share {
        return try {
            val response = httpClient.post("$baseUrl/api/shares") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
                setBody(ShareRequest(documentId, withUserId, permission))
            }
            
            if (response.status.isSuccess()) {
                val dto = response.body<ShareResponse>()
                Share(
                    id = dto.id,
                    documentId = dto.documentId,
                    sharedWithUserId = dto.sharedWithUserId,
                    permission = dto.permission,
                    createdAt = dto.createdAt
                )
            } else {
                throw DataException.ServerError("Failed to share document", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Document sharing error", e)
        }
    }
    
    suspend fun revokeShare(shareId: String): Boolean {
        return try {
            val response = httpClient.delete("$baseUrl/api/shares/$shareId") {
                authToken?.let { header("Authorization", "******") }
            }
            
            response.status.isSuccess()
        } catch (e: Exception) {
            throw DataException.NetworkError("Share revocation error", e)
        }
    }
    
    suspend fun updateShare(shareId: String, permission: String): Share {
        return try {
            val response = httpClient.put("$baseUrl/api/shares/$shareId") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
                setBody(mapOf("permission" to permission))
            }
            
            if (response.status.isSuccess()) {
                val dto = response.body<ShareResponse>()
                Share(
                    id = dto.id,
                    documentId = dto.documentId,
                    sharedWithUserId = dto.sharedWithUserId,
                    permission = dto.permission,
                    createdAt = dto.createdAt
                )
            } else {
                throw DataException.ServerError("Failed to update share", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Share update error", e)
        }
    }
    
    suspend fun getSharedDocuments(userId: String): List<Document> {
        return try {
            val response = httpClient.get("$baseUrl/api/documents/shared") {
                authToken?.let { header("Authorization", "******") }
                parameter("userId", userId)
            }
            
            if (response.status.isSuccess()) {
                response.body<List<DocumentResponse>>().map { dto ->
                    Document(
                        id = dto.id,
                        title = dto.title,
                        folderId = dto.folderId,
                        userId = dto.userId,
                        createdAt = dto.createdAt,
                        updatedAt = dto.updatedAt,
                        lastModifiedDevice = dto.lastModifiedDevice,
                        deviceVersion = dto.deviceVersion
                    )
                }
            } else {
                throw DataException.ServerError("Failed to fetch shared documents", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Shared documents fetch error", e)
        }
    }
    
    // ============= AI =============
    
    suspend fun askInline(prompt: String, context: String?): String {
        return try {
            val response = httpClient.post("$baseUrl/api/ai/inline") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
                setBody(AiInlineRequest(prompt, context))
            }
            
            if (response.status.isSuccess()) {
                val aiResp = response.body<AiInlineResponse>()
                aiResp.response
            } else {
                throw DataException.ServerError("AI request failed", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("AI request error", e)
        }
    }
    
    suspend fun askAi(prompt: String, context: String): String {
        return askInline(prompt, context)
    }
    
    suspend fun getDocumentVersions(documentId: String, since: Long = 0): List<DocumentVersion> {
        return try {
            val response = httpClient.get("$baseUrl/api/documents/$documentId/versions") {
                authToken?.let { header("Authorization", "******") }
                if (since > 0) {
                    parameter("since", since)
                }
            }
            
            if (response.status.isSuccess()) {
                response.body<List<DocumentVersionResponse>>().map { dto ->
                    DocumentVersion(
                        id = dto.id,
                        documentId = dto.documentId,
                        content = dto.content,
                        version = dto.version,
                        createdBy = dto.createdBy,
                        createdAt = dto.createdAt,
                        deviceSource = dto.deviceSource,
                        deviceVersion = dto.deviceVersion
                    )
                }
            } else {
                throw DataException.ServerError("Failed to fetch document versions", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Document versions fetch error", e)
        }
    }
    
    suspend fun pushDocumentChanges(documentId: String, changes: Map<String, String>, deviceId: String) {
        return try {
            val response = httpClient.post("$baseUrl/api/documents/$documentId/sync") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
                setBody(mapOf(
                    "changes" to changes,
                    "deviceId" to deviceId,
                    "timestamp" to System.currentTimeMillis()
                ))
            }
            
            if (!response.status.isSuccess()) {
                throw DataException.ServerError("Failed to push changes", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Push changes error", e)
        }
    }
    
    suspend fun startAiSession(mode: String): AiSession {
        return try {
            val response = httpClient.post("$baseUrl/api/ai/session") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
                setBody(AiSessionRequest(mode))
            }
            
            if (response.status.isSuccess()) {
                val dto = response.body<AiSessionResponse>()
                AiSession(
                    id = dto.id,
                    userId = dto.userId,
                    mode = dto.mode,
                    turns = dto.turns.map { AiTurn(it.role, it.content) },
                    metadata = dto.metadata,
                    createdAt = dto.createdAt
                )
            } else {
                throw DataException.ServerError("Failed to start AI session", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("AI session error", e)
        }
    }
    
    suspend fun addAiTurn(sessionId: String, role: String, content: String): AiSession {
        return try {
            val response = httpClient.post("$baseUrl/api/ai/session/$sessionId/turn") {
                contentType(ContentType.Application.Json)
                authToken?.let { header("Authorization", "******") }
                setBody(AiTurnRequest(role, content))
            }
            
            if (response.status.isSuccess()) {
                val dto = response.body<AiSessionResponse>()
                AiSession(
                    id = dto.id,
                    userId = dto.userId,
                    mode = dto.mode,
                    turns = dto.turns.map { AiTurn(it.role, it.content) },
                    metadata = dto.metadata,
                    createdAt = dto.createdAt
                )
            } else {
                throw DataException.ServerError("Failed to add AI turn", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("AI turn error", e)
        }
    }
    
    fun setAuthToken(token: String) {
        authToken = token
    }
    
    fun clearAuthToken() {
        authToken = null
    }
}
