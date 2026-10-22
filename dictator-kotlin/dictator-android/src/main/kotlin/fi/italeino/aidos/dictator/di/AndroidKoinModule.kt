package fi.italeino.aidos.dictator.di

import android.content.Context
import fi.italeino.aidos.dictator.BuildConfig
import fi.italeino.aidos.dictator.data.AidosEngineConnection
import fi.italeino.aidos.dictator.data.AndroidSharedPreferences
import fi.italeino.aidos.dictator.data.ai.AiProviderResolver
import fi.italeino.aidos.dictator.data.ai.AiSettingsKeys
import com.dictator.core.data.local.VoiceSettingsRepository
import com.dictator.core.data.remote.RemoteApiService
import com.dictator.core.service.AiService
import com.dictator.core.service.LocalDocumentStore
import com.dictator.core.service.ProviderAiService
import com.dictator.core.service.SharedPreferences
import fi.italeino.aidos.dictator.data.dictation.DictationEngineFactory
import fi.italeino.aidos.dictator.data.shadow.EngineIntentProbe
import fi.italeino.aidos.dictator.data.shadow.ShadowFileSink
import fi.italeino.aidos.dictator.data.shadow.ShadowSettings
import com.dictator.core.util.voice.shadow.ShadowIntentRecorder
import java.io.File
import fi.italeino.aidos.dictator.ui.auth.AuthViewModel
import fi.italeino.aidos.dictator.ui.document.DocumentViewModel
import fi.italeino.aidos.dictator.ui.editor.EditorViewModel
import fi.italeino.aidos.dictator.ui.mcp.McpViewModel
import fi.italeino.aidos.dictator.ui.privacy.PrivacyViewModel
import fi.italeino.aidos.dictator.ui.settings.SettingsViewModel
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.dsl.module

/**
 * Android's additions to (and overrides of) dictator-core's Koin module. dictator-core stays the
 * single place services are wired; this module only supplies what needs a [Context] or the Aidos SDK.
 * Later modules override earlier ones, which is how the in-memory preferences are replaced.
 * View models are registered here too (Hilt was dropped: no Hilt release reads Kotlin 2.4 metadata
 * while still supporting AGP 8, and kapt/KSP are the fragile part of this toolchain).
 */
fun androidKoinModule(context: Context, engine: AidosEngineConnection) = module {
    single<SharedPreferences> { AndroidSharedPreferences(context) }

    single { engine }

    // The Dictator server URL is read once at startup; changing it in Settings takes effect on restart.
    single {
        val prefs: SharedPreferences = get()
        RemoteApiService(
            httpClient = get(),
            baseUrl = prefs.getString(AiSettingsKeys.SERVICE_URL, null)?.takeIf { it.isNotBlank() } ?: BuildConfig.API_BASE_URL
        )
    }

    single { AiProviderResolver(prefs = get(), httpClient = get(), engine = get()) }

    // AI goes to whichever provider the user picked (Aidos, Claude, Ollama, …), not only the Dictator server.
    single<AiService> {
        val resolver: AiProviderResolver = get()
        ProviderAiService(providerSource = { resolver.resolve() }, aiSessionRepository = get())
    }

    single { VoiceSettingsRepository(sharedPreferences = get()) }

    single { LocalDocumentStore(documents = get(), versions = get(), folders = get(), users = get()) }

    single { DictationEngineFactory(context = context, connection = get(), prefs = get()) }

    // Shadow-mode intent logging (LAYA.md): records what Aidos Engine's decision model would say beside what
    // the parser did. Both switches default to off and nothing here changes dictation behaviour.
    single { ShadowFileSink(File(context.filesDir, "shadow-intent.jsonl")) }
    single {
        val prefs: SharedPreferences = get()
        ShadowIntentRecorder(
            probe = EngineIntentProbe(get<AidosEngineConnection>()),
            sink = get<ShadowFileSink>(),
            enabled = { ShadowSettings.isEnabled(prefs) },
            storeText = { ShadowSettings.storesText(prefs) },
            nowMillis = { System.currentTimeMillis() }
        )
    }

    viewModel { AuthViewModel(authService = get()) }
    viewModel { DocumentViewModel(store = get()) }
    viewModel { SettingsViewModel(sharedPreferences = get(), engine = get(), voiceSettingsRepository = get()) }
    viewModel { PrivacyViewModel(privacyService = get()) }
    viewModel { McpViewModel(mcpService = get()) }
    viewModel {
        EditorViewModel(
            store = get(), aiService = get(), aiResolver = get<AiProviderResolver>(), policies = get(), privacy = get(),
            voiceSettings = get(), prefs = get(), engines = get<DictationEngineFactory>(),
            shadow = get<ShadowIntentRecorder>()
        )
    }
}
