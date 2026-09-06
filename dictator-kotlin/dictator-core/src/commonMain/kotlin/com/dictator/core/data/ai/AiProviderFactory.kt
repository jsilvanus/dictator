package com.dictator.core.data.ai

import io.github.aakira.napier.Napier
import io.ktor.client.HttpClient

object AiProviderFactory {
    fun createProvider(httpClient: HttpClient, config: ProviderConfig): AiProvider {
        return when (config.type) {
            ModelProvider.CLAUDE -> {
                val apiKey = config.apiKey ?: throw IllegalArgumentException("Claude provider requires apiKey")
                ClaudeProvider(httpClient, apiKey, config.model ?: "claude-sonnet-4-6")
            }
            ModelProvider.OPENAI -> {
                val apiKey = config.apiKey ?: throw IllegalArgumentException("OpenAI provider requires apiKey")
                OpenAiProvider(httpClient, apiKey, config.model ?: "gpt-4o", config.baseUrl ?: "https://api.openai.com/v1")
            }
            ModelProvider.OLLAMA -> OllamaProvider(httpClient, config.baseUrl ?: "http://localhost:11434", config.model ?: "mistral")
            ModelProvider.OPENAI_COMPATIBLE -> {
                val apiKey = config.apiKey ?: throw IllegalArgumentException("Generic OpenAI provider requires apiKey")
                val baseUrl = config.baseUrl ?: throw IllegalArgumentException("Generic OpenAI provider requires baseUrl")
                GenericOpenAiProvider(httpClient, baseUrl, apiKey, config.model ?: "gpt-3.5-turbo")
            }
            ModelProvider.DICTATOR -> DictatorProvider(
                httpClient,
                config.baseUrl ?: "https://ai.dictator.dev",
                config.model ?: "dictator-ai-default"
            )
            ModelProvider.AIDOS -> throw UnsupportedOperationException(
                "Aidos provider is Android-specific; resolve it through AndroidAiProviderResolver"
            )
        }
    }

    fun createFromEnv(httpClient: HttpClient): AiProvider {
        val anthropicApiKey = System.getenv("ANTHROPIC_API_KEY")
        if (!anthropicApiKey.isNullOrEmpty()) return ClaudeProvider(httpClient, anthropicApiKey, System.getenv("CLAUDE_MODEL") ?: "claude-sonnet-4-6")
        val openaiApiKey = System.getenv("OPENAI_API_KEY")
        if (!openaiApiKey.isNullOrEmpty()) return OpenAiProvider(httpClient, openaiApiKey, System.getenv("OPENAI_MODEL") ?: "gpt-4o", System.getenv("OPENAI_BASE_URL") ?: "https://api.openai.com/v1")
        val ollamaUrl = System.getenv("OLLAMA_BASE_URL")
        if (!ollamaUrl.isNullOrEmpty()) return OllamaProvider(httpClient, ollamaUrl, System.getenv("OLLAMA_MODEL") ?: "mistral")
        val compatibleUrl = System.getenv("OPENAI_COMPATIBLE_BASE_URL")
        val compatibleApiKey = System.getenv("OPENAI_COMPATIBLE_API_KEY")
        if (!compatibleUrl.isNullOrEmpty() && !compatibleApiKey.isNullOrEmpty()) return GenericOpenAiProvider(httpClient, compatibleUrl, compatibleApiKey, System.getenv("OPENAI_COMPATIBLE_MODEL") ?: "gpt-3.5-turbo")
        return OllamaProvider(httpClient)
    }

    fun createByType(httpClient: HttpClient, type: ModelProvider, config: ProviderConfig = ProviderConfig(type)): AiProvider =
        createProvider(httpClient, config.copy(type = type))

    fun getAvailableProviders(): List<AvailableProvider> {
        val providers = mutableListOf<AvailableProvider>()
        providers.add(AvailableProvider(ModelProvider.CLAUDE, "Claude (Anthropic)", !System.getenv("ANTHROPIC_API_KEY").isNullOrEmpty()))
        providers.add(AvailableProvider(ModelProvider.OPENAI, "OpenAI", !System.getenv("OPENAI_API_KEY").isNullOrEmpty()))
        providers.add(AvailableProvider(ModelProvider.OLLAMA, "Ollama (Self-hosted)", !System.getenv("OLLAMA_BASE_URL").isNullOrEmpty()))
        providers.add(AvailableProvider(ModelProvider.OPENAI_COMPATIBLE, "OpenAI-Compatible", !System.getenv("OPENAI_COMPATIBLE_BASE_URL").isNullOrEmpty() && !System.getenv("OPENAI_COMPATIBLE_API_KEY").isNullOrEmpty()))
        providers.add(AvailableProvider(ModelProvider.DICTATOR, "Dictator Service", true))
        providers.add(AvailableProvider(ModelProvider.AIDOS, "Aidos Engine", true))
        return providers
    }

    fun validateConfig(config: ProviderConfig): ConfigValidation {
        val errors = mutableListOf<String>()
        when (config.type) {
            ModelProvider.CLAUDE -> if (config.apiKey.isNullOrEmpty()) errors.add("Claude provider requires apiKey")
            ModelProvider.OPENAI -> if (config.apiKey.isNullOrEmpty()) errors.add("OpenAI provider requires apiKey")
            ModelProvider.OLLAMA -> Unit
            ModelProvider.OPENAI_COMPATIBLE -> {
                if (config.apiKey.isNullOrEmpty()) errors.add("OpenAI-compatible provider requires apiKey")
                if (config.baseUrl.isNullOrEmpty()) errors.add("OpenAI-compatible provider requires baseUrl")
            }
            ModelProvider.DICTATOR, ModelProvider.AIDOS -> Unit
        }
        return ConfigValidation(errors.isEmpty(), errors)
    }
}

data class AvailableProvider(val type: ModelProvider, val name: String, val configured: Boolean)
data class ConfigValidation(val valid: Boolean, val errors: List<String>)
