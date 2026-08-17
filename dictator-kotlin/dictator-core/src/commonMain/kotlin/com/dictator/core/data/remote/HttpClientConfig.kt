package com.dictator.core.data.remote

import io.ktor.client.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.header
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * HTTP client configuration for multiplatform Ktor client.
 */

object HttpClientFactory {
    fun createHttpClient(
        baseUrl: String = "http://localhost:3000",
        timeout: Long = 30000,
        enableLogging: Boolean = true,
        authToken: String? = null
    ): HttpClient {
        return HttpClient {
            // Set base URL and timeout
            install(HttpTimeout) {
                requestTimeoutMillis = timeout
                connectTimeoutMillis = timeout
                socketTimeoutMillis = timeout
            }

            // Add content type and JSON serialization
            install(ContentNegotiation) {
                json(Json {
                    ignoreUnknownKeys = true
                    coerceInputValues = true
                    encodeDefaults = true
                })
            }

            // Add logging
            if (enableLogging) {
                install(Logging) {
                    logger = Logger.DEFAULT
                    level = LogLevel.INFO
                }
            }

            // Add auth header and default headers
            install(DefaultRequest) {
                authToken?.let { token ->
                    header("Authorization", token)
                }
                header("Content-Type", "application/json")
            }
        }
    }
}

// ============= Request/Response DTOs =============

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class SignupRequest(
    val email: String,
    val name: String,
    val password: String
)

@Serializable
data class LoginResponse(
    val token: String,
    val userId: String,
    val email: String,
    val name: String?
)

@Serializable
data class SessionResponse(
    val userId: String,
    val email: String,
    val name: String?
)

@Serializable
data class DocumentRequest(
    val title: String,
    val folderId: String
)

@Serializable
data class DocumentResponse(
    val id: String,
    val title: String,
    val folderId: String,
    val userId: String?,
    val createdAt: Long,
    val updatedAt: Long,
    val lastModifiedDevice: String = "kotlin",
    val deviceVersion: Long = 1
)

@Serializable
data class DocumentVersionResponse(
    val id: String,
    val documentId: String,
    val content: String,
    val version: Int,
    val createdBy: String?,
    val createdAt: Long,
    val deviceSource: String = "kotlin",
    val deviceVersion: Long = 1
)

@Serializable
data class FolderRequest(
    val name: String,
    val parentId: String? = null
)

@Serializable
data class FolderResponse(
    val id: String,
    val name: String,
    val userId: String,
    val parentId: String?,
    val createdAt: Long
)

@Serializable
data class ShareRequest(
    val documentId: String,
    val sharedWithUserId: String,
    val permission: String
)

@Serializable
data class ShareResponse(
    val id: String,
    val documentId: String,
    val sharedWithUserId: String,
    val permission: String,
    val createdAt: Long
)

@Serializable
data class AiInlineRequest(
    val prompt: String,
    val context: String? = null
)

@Serializable
data class AiInlineResponse(
    val response: String
)

@Serializable
data class AiSessionRequest(
    val mode: String // "inline" or "panel"
)

@Serializable
data class AiSessionResponse(
    val id: String,
    val userId: String?,
    val mode: String,
    val turns: List<AiTurnResponse> = emptyList(),
    val metadata: Map<String, String>? = null,
    val createdAt: Long
)

@Serializable
data class AiTurnResponse(
    val role: String,
    val content: String
)

@Serializable
data class AiTurnRequest(
    val role: String,
    val content: String
)

@Serializable
data class SyncStatusResponse(
    val documentId: String,
    val lastSyncedAt: Long?,
    val localVersion: Long,
    val remoteVersion: Long,
    val pendingChanges: Int,
    val conflictStatus: String,
    val updatedAt: Long
)

@Serializable
data class SyncPushRequest(
    val content: String,
    val deviceId: String,
    val deviceVersion: Long
)

@Serializable
data class ErrorResponse(
    val error: String,
    val code: Int? = null,
    val details: String? = null
)

@Serializable
data class RefreshTokenResponse(
    val token: String
)

