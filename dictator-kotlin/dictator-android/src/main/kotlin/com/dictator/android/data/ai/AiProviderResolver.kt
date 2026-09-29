package com.dictator.android.data.ai

import com.dictator.android.data.AidosEngineConnection
import com.dictator.core.data.ai.AiProvider
import com.dictator.core.data.ai.AiProviderFactory
import com.dictator.core.data.ai.ModelProvider
import com.dictator.core.data.ai.ProviderConfig
import com.dictator.core.service.SharedPreferences
import io.ktor.client.HttpClient

/** Preference keys shared with the settings screen. */
object AiSettingsKeys {
    const val MODE = "settings_mode"
    const val MODE_SERVICE = "dictator_service"
    const val MODE_DIRECT = "direct_provider"
    const val SERVICE_URL = "dictator_service_url"
    const val PROVIDER = "provider_type"
    const val API_KEY = "provider_api_key"
    const val BASE_URL = "provider_base_url"
    const val MODEL = "provider_model"
    const val TEMPERATURE = "provider_temperature"
    const val MAX_TOKENS = "provider_max_tokens"
    const val AIDOS_MODEL = "aidos_model"
    const val STT_MODEL = "aidos_stt_model"
    const val DICTATION_ENGINE = "dictation_engine"   // "system" | "aidos"
}

/** What the UI needs to know about the chosen provider without building it. */
interface AiProviderSelection {
    fun selectedType(): ModelProvider
}

/**
 * Builds the [AiProvider] the user selected in settings. Also registers the Aidos provider with
 * [AiProviderFactory], the seam dictator-core provides because it cannot link the Android-only SDK.
 */
class AiProviderResolver(
    private val prefs: SharedPreferences,
    private val httpClient: HttpClient,
    private val engine: AidosEngineConnection
) : AiProviderSelection {
    init {
        AiProviderFactory.register(ModelProvider.AIDOS) { _, config ->
            AidosProvider(
                connection = engine,
                preferredModel = config.model.orEmpty(),
                temperature = config.temperature ?: 0.7,
                maxTokens = config.maxTokens ?: 2048
            )
        }
    }

    /** The selected provider type, without building it (used for privacy decisions). */
    override fun selectedType(): ModelProvider {
        if (prefs.getString(AiSettingsKeys.MODE, AiSettingsKeys.MODE_DIRECT) == AiSettingsKeys.MODE_SERVICE) {
            return ModelProvider.DICTATOR
        }
        return runCatching {
            ModelProvider.valueOf(prefs.getString(AiSettingsKeys.PROVIDER, ModelProvider.AIDOS.name) ?: ModelProvider.AIDOS.name)
        }.getOrDefault(ModelProvider.AIDOS)
    }

    fun resolve(): AiProvider {
        val type = selectedType()
        val model = prefs.getString(AiSettingsKeys.MODEL, null)?.takeIf { it.isNotBlank() }
        val config = if (type == ModelProvider.DICTATOR) {
            ProviderConfig(type = type, baseUrl = prefs.getString(AiSettingsKeys.SERVICE_URL, null)?.takeIf { it.isNotBlank() })
        } else {
            ProviderConfig(
                type = type,
                apiKey = prefs.getString(AiSettingsKeys.API_KEY, null)?.takeIf { it.isNotBlank() },
                baseUrl = prefs.getString(AiSettingsKeys.BASE_URL, null)?.takeIf { it.isNotBlank() },
                // Engine model ids are their own namespace, so they have their own key: a saved
                // "gpt-4o" means nothing to Engine.
                model = if (type == ModelProvider.AIDOS) prefs.getString(AiSettingsKeys.AIDOS_MODEL, null)?.takeIf { it.isNotBlank() } else model,
                temperature = prefs.getString(AiSettingsKeys.TEMPERATURE, null)?.toDoubleOrNull(),
                maxTokens = prefs.getString(AiSettingsKeys.MAX_TOKENS, null)?.toIntOrNull()
            )
        }
        val problems = AiProviderFactory.validateConfig(config)
        if (!problems.valid) throw IllegalStateException(problems.errors.joinToString("; ") + ". Check Settings.")
        return AiProviderFactory.createProvider(httpClient, config)
    }
}
