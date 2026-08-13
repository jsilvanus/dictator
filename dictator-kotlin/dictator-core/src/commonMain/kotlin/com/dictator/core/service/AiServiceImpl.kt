package com.dictator.core.service

import com.dictator.core.data.error.DataException
import com.dictator.core.data.remote.RemoteApiService
import com.dictator.core.domain.entity.AiSession
import com.dictator.core.domain.entity.AiTurn
import com.dictator.core.domain.repository.AiSessionRepository
import io.github.aakira.napier.Napier
import kotlinx.datetime.Clock
import kotlin.random.Random

/**
 * AI service implementation.
 * Handles interaction with Claude API for inline prompts and multi-turn sessions.
 * Manages AI sessions and stores conversation history in the database.
 */
class AiServiceImpl(
    private val remoteApiService: RemoteApiService,
    private val aiSessionRepository: AiSessionRepository
) : AiService {
    
    /**
     * Asks a single inline question to Claude.
     * Used for quick questions without maintaining a conversation session.
     * Returns the AI response directly.
     */
    override suspend fun askInline(prompt: String, context: String): String {
        return try {
            Napier.d("Asking inline question to AI")
            
            if (prompt.isBlank()) {
                throw DataException.ValidationError("Prompt cannot be empty")
            }
            
            // Call Claude API through remote service
            val response = remoteApiService.askAi(prompt, context)
            
            Napier.i("Received inline AI response: ${response.length} chars")
            response
        } catch (e: DataException) {
            Napier.e("Failed to ask AI: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error asking AI", e)
            throw DataException.NetworkError("Failed to connect to AI service: ${e.message}", e)
        }
    }
    
    /**
     * Starts a new AI conversation session.
     * Used for side-panel chat and multi-turn interactions.
     * Creates and stores session in database.
     */
    override suspend fun startSession(mode: String, userId: String?): AiSession {
        return try {
            Napier.d("Starting new AI session with mode: $mode for user: $userId")
            
            // Validate mode
            if (mode !in listOf("inline", "panel")) {
                throw DataException.ValidationError("Invalid session mode: $mode")
            }
            
            val sessionId = generateSessionId()
            val now = Clock.System.now().toEpochMilliseconds()
            
            val session = AiSession(
                id = sessionId,
                userId = userId,
                mode = mode,
                turns = emptyList(),
                createdAt = now
            )
            
            // Store in database
            val createdSession = aiSessionRepository.createSession(session)
            
            Napier.i("AI session created: $sessionId")
            createdSession
        } catch (e: DataException) {
            Napier.e("Failed to start AI session: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error starting AI session", e)
            throw DataException.DatabaseError("Failed to create AI session: ${e.message}", e)
        }
    }
    
    /**
     * Adds a new turn to an existing AI conversation session.
     * Sends message to Claude API and stores the conversation turn.
     * Returns updated session with new turn added.
     */
    override suspend fun addTurn(sessionId: String, role: String, content: String): AiSession {
        return try {
            Napier.d("Adding turn to AI session: $sessionId with role: $role")
            
            // Validate inputs
            if (sessionId.isBlank()) {
                throw DataException.ValidationError("Session ID cannot be empty")
            }
            if (role !in listOf("user", "assistant")) {
                throw DataException.ValidationError("Invalid role: $role")
            }
            if (content.isBlank()) {
                throw DataException.ValidationError("Content cannot be empty")
            }
            
            // Get existing session
            val session = aiSessionRepository.getSessionById(sessionId)
                ?: throw DataException.NotFound("AI session not found: $sessionId")
            
            // If this is a user message, get AI response
            val finalRole = role
            val finalContent = if (role == "user") {
                // Call Claude API to get response
                val aiResponse = remoteApiService.askAi(content, "")
                
                // Create user turn
                val userTurn = AiTurn(role = "user", content = content)
                val updatedTurns = session.turns + userTurn
                val assistantTurn = AiTurn(role = "assistant", content = aiResponse)
                val finalTurns = updatedTurns + assistantTurn
                
                // Update session with both turns
                val updatedSession = session.copy(turns = finalTurns)
                val saved = aiSessionRepository.updateSession(updatedSession)
                
                Napier.d("Added user and assistant turns to session: $sessionId")
                return saved
            } else {
                content
            }
            
            // Add assistant message directly (shouldn't normally happen)
            val turn = AiTurn(role = finalRole, content = finalContent)
            val updatedTurns = session.turns + turn
            val updatedSession = session.copy(turns = updatedTurns)
            
            val saved = aiSessionRepository.updateSession(updatedSession)
            
            Napier.i("Turn added to session: $sessionId")
            saved
        } catch (e: DataException) {
            Napier.e("Failed to add turn to AI session: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error adding turn to AI session", e)
            throw DataException.DatabaseError("Failed to add turn to session: ${e.message}", e)
        }
    }
    
    private fun generateSessionId(): String {
        return "session_${System.currentTimeMillis()}_${Random.nextInt(10000)}"
    }
}
