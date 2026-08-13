package com.dictator.core.data.remote

import com.dictator.core.data.error.DataException
import com.dictator.core.domain.entity.User
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.http.*

/**
 * Remote API service for authentication endpoints.
 * Handles login, signup, logout, token validation, and token refresh.
 */
class AuthApiService(
    private val httpClient: HttpClient,
    private val baseUrl: String,
    private val authTokenProvider: () -> String?
) {
    
    suspend fun login(email: String, password: String): Pair<String, User> {
        return try {
            val response = httpClient.post("$baseUrl/api/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(LoginRequest(email, password))
            }
            
            if (response.status.isSuccess()) {
                val loginResp = response.body<LoginResponse>()
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
                authTokenProvider()?.let { header("Authorization", "******") }
            }
            response.status.isSuccess()
        } catch (e: Exception) {
            false
        }
    }
    
    suspend fun getSession(): User? {
        return try {
            val response = httpClient.get("$baseUrl/api/auth/session") {
                authTokenProvider()?.let { header("Authorization", "******") }
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
                refreshResp.token
            } else {
                throw DataException.ServerError("Token refresh failed", response.status.value)
            }
        } catch (e: Exception) {
            throw DataException.NetworkError("Token refresh error", e)
        }
    }
}
