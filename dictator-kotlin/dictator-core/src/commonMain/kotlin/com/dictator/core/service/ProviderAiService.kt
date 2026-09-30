package com.dictator.core.service

import com.dictator.core.data.ai.AiChatMessage
import com.dictator.core.data.ai.AiChatRequest
import com.dictator.core.data.ai.AiInlineRequest
import com.dictator.core.data.ai.AiProvider
import com.dictator.core.data.ai.AiStreamChunk
import com.dictator.core.data.error.DataException
import com.dictator.core.domain.entity.AiSession
import com.dictator.core.domain.entity.AiTurn
import com.dictator.core.domain.repository.AiSessionRepository
import kotlinx.datetime.Clock
import kotlin.random.Random

/**
 * [AiService] backed by whichever [AiProvider] the user selected (Claude, OpenAI, Ollama, Aidos
 * Engine, …), instead of the Dictator server only ([AiServiceImpl]). [providerSource] is asked on
 * every call so a settings change or Engine going away takes effect without rebuilding the service.
 * Failures surface as [DataException] so callers keep a single error type.
 */
class ProviderAiService(
    private val providerSource: suspend () -> AiProvider,
    private val aiSessionRepository: AiSessionRepository
) : AiService {

    override suspend fun askInline(prompt: String, context: String): String {
        if (prompt.isBlank()) throw DataException.ValidationError("Prompt cannot be empty")
        return try {
            providerSource().askInline(AiInlineRequest(prompt = prompt, context = context.ifBlank { null })).content
        } catch (e: DataException) {
            throw e
        } catch (e: Exception) {
            throw DataException.NetworkError("AI request failed: ${e.message}", e)
        }
    }

    override suspend fun startSession(mode: String, userId: String?): AiSession {
        if (mode !in listOf("inline", "panel")) throw DataException.ValidationError("Invalid session mode: $mode")
        val session = AiSession(
            id = "session_${Clock.System.now().toEpochMilliseconds()}_${Random.nextInt(10000)}",
            userId = userId,
            mode = mode,
            turns = emptyList(),
            createdAt = Clock.System.now().toEpochMilliseconds()
        )
        return aiSessionRepository.createSession(session)
    }

    override suspend fun addTurn(sessionId: String, role: String, content: String): AiSession {
        if (role !in listOf("user", "assistant")) throw DataException.ValidationError("Invalid role: $role")
        if (content.isBlank()) throw DataException.ValidationError("Content cannot be empty")
        val session = aiSessionRepository.getSessionById(sessionId)
            ?: throw DataException.NotFound("AI session not found: $sessionId")

        val turns = session.turns + AiTurn(role = role, content = content)
        if (role == "assistant") return aiSessionRepository.updateSession(session.copy(turns = turns))

        val reply = try {
            collectReply(turns)
        } catch (e: DataException) {
            throw e
        } catch (e: Exception) {
            throw DataException.NetworkError("AI request failed: ${e.message}", e)
        }
        return aiSessionRepository.updateSession(session.copy(turns = turns + AiTurn(role = "assistant", content = reply)))
    }

    private suspend fun collectReply(turns: List<AiTurn>): String {
        val request = AiChatRequest(messages = turns.map { AiChatMessage(it.role, it.content) })
        val text = StringBuilder()
        providerSource().chat(request).collect { chunk ->
            when (chunk) {
                is AiStreamChunk.Delta -> text.append(chunk.content)
                is AiStreamChunk.Error -> throw DataException.NetworkError(chunk.error, null)
                else -> Unit
            }
        }
        return text.toString()
    }
}
