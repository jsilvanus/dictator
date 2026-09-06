package com.dictator.android.ui.ai

import com.dictator.core.data.ai.AiProvider
import com.dictator.core.data.ai.AiProviderFactory
import com.dictator.core.data.ai.ModelProvider
import com.dictator.core.data.ai.ProviderConfig
import com.dictator.core.service.SharedPreferences
import io.ktor.client.HttpClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Resolves the Android AI configuration into a real core AiProvider.
 * The same provider implementations are used by Android and the other Kotlin targets.
 */
@Singleton
class AndroidAiProviderResolver @Inject constructor(
    private val httpClient: HttpClient,
    private val sharedPreferences: SharedPreferences
) {
    fun resolve(): AiProvider {
        val mode = sharedPreferences.getString("settings_mode", "dictator_service")

        if (mode != "direct_provider") {
            return AiProviderFactory.createProvider(
                httpClient,
                ProviderConfig(
                    type = ModelProvider.DICTATOR,
                    baseUrl = sharedPreferences.getString(
                        "dictator_service_url",
                        DEFAULT_DICTATOR_URL
                    )?.trim()?.ifEmpty { DEFAULT_DICTATOR_URL }
                )
            )
        }

        val type = sharedPreferences.getString("provider_type", ModelProvider.CLAUDE.name)
            ?.let { runCatching { ModelProvider.valueOf(it) }.getOrNull() }
            ?: ModelProvider.CLAUDE

        return AiProviderFactory.createProvider(
            httpClient,
            ProviderConfig(
                type = type,
                apiKey = sharedPreferences.getString("provider_api_key", null),
                baseUrl = sharedPreferences.getString("provider_base_url", null),
                model = sharedPreferences.getString("provider_model", null),
                temperature = sharedPreferences.getString("provider_temperature", null)?.toDoubleOrNull(),
                maxTokens = sharedPreferences.getString("provider_max_tokens", null)?.toIntOrNull()
            )
        )
    }

    companion object {
        const val DEFAULT_DICTATOR_URL = "https://ai.dictator.dev"
    }
}
