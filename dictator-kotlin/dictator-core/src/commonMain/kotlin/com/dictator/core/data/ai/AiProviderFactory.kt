package com.dictator.core.data.ai

import io.github.aakira.napier.Napier
import io.ktor.client.HttpClient

/**
 * AI Provider Factory for Kotlin
 * Creates and manages AI provider instances based on configuration
 */
object AiProviderFactory {

    /**
     * Create a provider instance based on configuration
     */
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

            ModelProvider.OLLAMA -> {
                OllamaProvider(httpClient, config.baseUrl ?: "http://localhost:11434", config.model ?: "mistral")
            }

            ModelProvider.OPENAI_COMPATIBLE -> {
                val apiKey = config.apiKey ?: throw IllegalArgumentException("Generic OpenAI provider requires apiKey")
                val baseUrl = config.baseUrl ?: throw IllegalArgumentException("Generic OpenAI provider requires baseUrl")
                GenericOpenAiProvider(httpClient, baseUrl, apiKey, config.model ?: "gpt-3.5-turbo")
            }
        }
    }

    /**
     * Create provider from environment variables
     * Defaults to Claude if available
     */
    fun createFromEnv(httpClient: HttpClient): AiProvider {
        val anthropicApiKey = System.getenv("ANTHROPIC_API_KEY")
        if (!anthropicApiKey.isNullOrEmpty()) {
            val model = System.getenv("CLAUDE_MODEL") ?: "claude-sonnet-4-6"
            Napier.i("Using Claude provider")
            return ClaudeProvider(httpClient, anthropicApiKey, model)
        }

        val openaiApiKey = System.getenv("OPENAI_API_KEY")
        if (!openaiApiKey.isNullOrEmpty()) {
            val model = System.getenv("OPENAI_MODEL") ?: "gpt-4o"
            val baseUrl = System.getenv("OPENAI_BASE_URL") ?: "https://api.openai.com/v1"
            Napier.i("Using OpenAI provider")
            return OpenAiProvider(httpClient, openaiApiKey, model, baseUrl)
        }

        val ollamaUrl = System.getenv("OLLAMA_BASE_URL")
        if (!ollamaUrl.isNullOrEmpty()) {
            val model = System.getenv("OLLAMA_MODEL") ?: "mistral"
            Napier.i("Using Ollama provider")
            return OllamaProvider(httpClient, ollamaUrl, model)
        }

        val compatibleUrl = System.getenv("OPENAI_COMPATIBLE_BASE_URL")
        val compatibleApiKey = System.getenv("OPENAI_COMPATIBLE_API_KEY")
        if (!compatibleUrl.isNullOrEmpty() && !compatibleApiKey.isNullOrEmpty()) {
            val model = System.getenv("OPENAI_COMPATIBLE_MODEL") ?: "gpt-3.5-turbo"
            Napier.i("Using Generic OpenAI-compatible provider")
            return GenericOpenAiProvider(httpClient, compatibleUrl, compatibleApiKey, model)
        }

        Napier.e("No AI provider configured, defaulting to Ollama")
        // Fallback to Ollama with default localhost
        return OllamaProvider(httpClient)
    }

    /**
     * Create provider by type
     */
    fun createByType(httpClient: HttpClient, type: ModelProvider, config: ProviderConfig = ProviderConfig(type)): AiProvider {
        return createProvider(httpClient, config.copy(type = type))
    }

    /**
     * Get available providers based on environment configuration
     */
    fun getAvailableProviders(): List<AvailableProvider> {
        val providers = mutableListOf<AvailableProvider>()

        val isClaudeConfigured = !System.getenv("ANTHROPIC_API_KEY").isNullOrEmpty()
        providers.add(AvailableProvider(ModelProvider.CLAUDE, "Claude (Anthropic)", isClaudeConfigured))

        val isOpenAiConfigured = !System.getenv("OPENAI_API_KEY").isNullOrEmpty()
        providers.add(AvailableProvider(ModelProvider.OPENAI, "OpenAI", isOpenAiConfigured))

        val isOllamaConfigured = !System.getenv("OLLAMA_BASE_URL").isNullOrEmpty()
        providers.add(AvailableProvider(ModelProvider.OLLAMA, "Ollama (Self-hosted)", isOllamaConfigured))

        val isCompatibleConfigured = !System.getenv("OPENAI_COMPATIBLE_BASE_URL").isNullOrEmpty() &&
            !System.getenv("OPENAI_COMPATIBLE_API_KEY").isNullOrEmpty()
        providers.add(AvailableProvider(ModelProvider.OPENAI_COMPATIBLE, "OpenAI-Compatible", isCompatibleConfigured))

        return providers
    }

    /**
     * Validate provider configuration
     */
    fun validateConfig(config: ProviderConfig): ConfigValidation {
        val errors = mutableListOf<String>()

        when (config.type) {
            ModelProvider.CLAUDE -> {
                if (config.apiKey.isNullOrEmpty()) {
                    errors.add("Claude provider requires apiKey")
                }
            }

            ModelProvider.OPENAI -> {
                if (config.apiKey.isNullOrEmpty()) {
                    errors.add("OpenAI provider requires apiKey")
                }
            }

            ModelProvider.OLLAMA -> {
                // Ollama doesn't require API key, optional baseUrl
            }

            ModelProvider.OPENAI_COMPATIBLE -> {
                if (config.apiKey.isNullOrEmpty()) {
                    errors.add("OpenAI-compatible provider requires apiKey")
                }
                if (config.baseUrl.isNullOrEmpty()) {
                    errors.add("OpenAI-compatible provider requires baseUrl")
                }
            }
        }

        return ConfigValidation(errors.isEmpty(), errors)
    }
}

data class AvailableProvider(
    val type: ModelProvider,
    val name: String,
    val configured: Boolean
)

data class ConfigValidation(
    val valid: Boolean,
    val errors: List<String>
)
