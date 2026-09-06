package com.dictator.core.data.ai

import com.dictator.core.data.privacy.AiContentSource
import com.dictator.core.data.privacy.AiRequestScope
import kotlinx.serialization.Serializable

enum class ModelProvider {
    CLAUDE,
    OPENAI,
    OLLAMA,
    OPENAI_COMPATIBLE,
    DICTATOR,
    AIDOS
}

data class AiInlineRequest(
    val prompt: String,
    val context: String? = null,
    val temperature: Double? = null,
    val maxTokens: Int? = null,
    val thinkingBudgetTokens: Int? = null
)

data class AiChatMessage(val role: String, val content: String)

data class AiChatRequest(
    val messages: List<AiChatMessage>,
    val systemPrompt: String? = null,
    val temperature: Double? = null,
    val maxTokens: Int? = null,
    val stream: Boolean = false,
    val thinkingBudgetTokens: Int? = null
)

data class AiResponse(
    val content: String,
    val stopReason: String? = null,
    val usage: AiUsage? = null,
    val thinking: String? = null
)

@Serializable
data class AiUsage(val inputTokens: Int = 0, val outputTokens: Int = 0)

sealed class AiStreamChunk {
    data class Delta(val content: String) : AiStreamChunk()
    data class ThinkingDelta(val content: String) : AiStreamChunk()
    object ThinkingComplete : AiStreamChunk()
    object Complete : AiStreamChunk()
    data class Error(val error: String) : AiStreamChunk()
}

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

data class ProviderConfig(
    val type: ModelProvider,
    val apiKey: String? = null,
    val baseUrl: String? = null,
    val model: String? = null,
    val temperature: Double? = null,
    val maxTokens: Int? = null
)

@Serializable
data class AiTurnProvenance(
    val id: String,
    val aiSessionId: String,
    val turnId: String,
    val source: AiContentSource,
    val confidence: Double? = null,
    val contentScope: AiRequestScope? = null,
    val policyId: String? = null,
    val reviewedAt: Long? = null,
    val device: String,
    val userId: String,
    val thinkingContent: String? = null,
    val thinkingBudgetTokens: Int? = null,
    val createdAt: Long = System.currentTimeMillis()
)

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
