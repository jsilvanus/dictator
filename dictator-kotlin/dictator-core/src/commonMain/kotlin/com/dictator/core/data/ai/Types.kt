package com.dictator.core.data.ai

import com.dictator.core.data.privacy.AiContentSource
import com.dictator.core.data.privacy.AiRequestScope
import kotlinx.serialization.Serializable

/**
 * AI Model Provider Types
 */
enum class ModelProvider {
    CLAUDE,
    OPENAI,
    OLLAMA,
    OPENAI_COMPATIBLE,
    DICTATOR
}

/**
 * AI Inline Request
 */
data class AiInlineRequest(
    val prompt: String,
    val context: String? = null,
    val temperature: Double? = null,
    val maxTokens: Int? = null,
    val thinkingBudgetTokens: Int? = null
)

/**
 * AI Chat Message
 */
data class AiChatMessage(
    val role: String,
    val content: String
)

/**
 * AI Chat Request
 */
data class AiChatRequest(
    val messages: List<AiChatMessage>,
    val systemPrompt: String? = null,
    val temperature: Double? = null,
    val maxTokens: Int? = null,
    val stream: Boolean = false,
    val thinkingBudgetTokens: Int? = null
)

/**
 * AI Response
 */
data class AiResponse(
    val content: String,
    val stopReason: String? = null,
    val usage: AiUsage? = null,
    val thinking: String? = null
)

/**
 * AI Token Usage
 */
data class AiUsage(
    val inputTokens: Int = 0,
    val outputTokens: Int = 0
)

/**
 * AI Stream Chunk
 */
sealed class AiStreamChunk {
    data class Delta(val content: String) : AiStreamChunk()
    data class ThinkingDelta(val content: String) : AiStreamChunk()
    object ThinkingComplete : AiStreamChunk()
    object Complete : AiStreamChunk()
    data class Error(val error: String) : AiStreamChunk()
}

/**
 * User AI Preferences
 */
data class UserAiPreferences(
    val userId: String,
    val preferredProvider: ModelProvider,
    val preferredModel: String? = null,
    val customTemperature: Double? = null,
    val customMaxTokens: Int? = null,
    val ollamaUrl: String? = null,
    val thinkingBudgetTokens: Int? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

/**
 * Provider Configuration
 */
data class ProviderConfig(
    val type: ModelProvider,
    val apiKey: String? = null,
    val baseUrl: String? = null,
    val model: String? = null,
    val temperature: Double? = null,
    val maxTokens: Int? = null
)

/**
 * AI Turn Provenance - tracks metadata about an AI interaction
 * Includes source, confidence, scope, device, and thinking content
 */
@Serializable
data class AiTurnProvenance(
    val id: String,
    val aiSessionId: String,
    val turnId: String,
    val source: AiContentSource,
    val confidence: Double? = null, // 0-1 for AI content
    val contentScope: AiRequestScope? = null,
    val policyId: String? = null,
    val reviewedAt: Long? = null,
    val device: String,
    val userId: String,
    val thinkingContent: String? = null,
    val thinkingBudgetTokens: Int? = null,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * AI Turn with provenance metadata
 * Represents a single turn in an AI conversation with full tracking data
 */
@Serializable
data class AiTurnWithProvenance(
    val turnId: String,
    val userMessage: String,
    val assistantResponse: String,
    val model: String? = null,
    val provider: ModelProvider? = null,
    val tokenUsage: AiUsage? = null,
    val thinking: String? = null,
    val thinkingBudgetTokens: Int? = null,
    val provenance: AiTurnProvenance,
    val createdAt: Long = System.currentTimeMillis(),
    val acceptedAt: Long? = null
)
