package com.dictator.core.service

import com.dictator.core.data.error.DataException
import com.dictator.core.data.remote.RemoteApiService
import com.dictator.core.domain.repository.UserRepository
import io.github.aakira.napier.Napier

/**
 * Authentication service implementation.
 * Handles user login, signup, token management, and session validation.
 */
class AuthServiceImpl(
    private val remoteApiService: RemoteApiService,
    private val userRepository: UserRepository,
    private val sharedPreferences: SharedPreferences
) : AuthService {
    
    private var currentUserId: String? = null
    private var currentToken: String? = null
    
    init {
        // Restore token from storage on initialization
        currentToken = sharedPreferences.getString("auth_token", null)
        currentUserId = sharedPreferences.getString("current_user_id", null)
    }
    
    /**
     * Logs in a user with email and password.
     * Stores JWT token and user information.
     */
    override suspend fun login(email: String, password: String): String {
        return try {
            Napier.d("Attempting login for email: $email")
            
            val (token, user) = remoteApiService.login(email, password)
            
            // Save user to local storage
            userRepository.createUser(user)
            
            // Store token and user ID
            sharedPreferences.setString("auth_token", token)
            sharedPreferences.setString("current_user_id", user.id)
            
            currentToken = token
            currentUserId = user.id
            
            Napier.i("Login successful for user: ${user.id}")
            token
        } catch (e: DataException) {
            Napier.e("Login failed: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error during login", e)
            throw DataException.AuthenticationError("Login failed: ${e.message}")
        }
    }
    
    /**
     * Signs up a new user.
     * Creates user account and returns JWT token.
     */
    override suspend fun signup(email: String, name: String, password: String): String {
        return try {
            Napier.d("Attempting signup for email: $email")
            
            val (token, user) = remoteApiService.signup(email, name, password)
            
            // Save user to local storage
            userRepository.createUser(user)
            
            // Store token and user ID
            sharedPreferences.setString("auth_token", token)
            sharedPreferences.setString("current_user_id", user.id)
            
            currentToken = token
            currentUserId = user.id
            
            Napier.i("Signup successful for user: ${user.id}")
            token
        } catch (e: DataException) {
            Napier.e("Signup failed: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error during signup", e)
            throw DataException.AuthenticationError("Signup failed: ${e.message}")
        }
    }
    
    /**
     * Logs out the current user.
     * Clears stored token and user information.
     */
    override suspend fun logout() {
        return try {
            Napier.d("Logging out user: $currentUserId")
            
            // Call logout endpoint
            remoteApiService.logout()
            
            // Clear stored data
            sharedPreferences.remove("auth_token")
            sharedPreferences.remove("current_user_id")
            
            currentToken = null
            currentUserId = null
            
            Napier.i("Logout successful")
        } catch (e: DataException) {
            Napier.e("Logout error: ${e.message}", e)
            // Still clear local data even if server call fails
            sharedPreferences.remove("auth_token")
            sharedPreferences.remove("current_user_id")
            currentToken = null
            currentUserId = null
        } catch (e: Exception) {
            Napier.e("Unexpected error during logout", e)
            // Still clear local data even if error occurs
            sharedPreferences.remove("auth_token")
            sharedPreferences.remove("current_user_id")
            currentToken = null
            currentUserId = null
        }
    }
    
    /**
     * Validates if a token is still valid.
     * Checks with remote service and verifies token structure.
     */
    override suspend fun validateToken(token: String): Boolean {
        return try {
            Napier.d("Validating token")
            
            // Token should not be empty
            if (token.isBlank()) {
                Napier.w("Token validation failed: empty token")
                return false
            }
            
            // Call remote validation
            remoteApiService.validateToken(token)
        } catch (e: DataException.AuthenticationError) {
            Napier.w("Token validation failed: ${e.message}")
            false
        } catch (e: Exception) {
            Napier.e("Token validation error", e)
            false
        }
    }
    
    /**
     * Refreshes an expired token.
     * Returns new JWT token.
     */
    override suspend fun refreshToken(token: String): String {
        return try {
            Napier.d("Refreshing token")
            
            val newToken = remoteApiService.refreshToken(token)
            
            // Update stored token
            sharedPreferences.setString("auth_token", newToken)
            currentToken = newToken
            
            Napier.i("Token refresh successful")
            newToken
        } catch (e: DataException) {
            Napier.e("Token refresh failed: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error during token refresh", e)
            throw DataException.AuthenticationError("Token refresh failed: ${e.message}")
        }
    }
    
    /**
     * Gets the ID of the currently logged-in user.
     * Returns null if no user is logged in.
     */
    override fun getCurrentUserId(): String? {
        return currentUserId
    }
}

