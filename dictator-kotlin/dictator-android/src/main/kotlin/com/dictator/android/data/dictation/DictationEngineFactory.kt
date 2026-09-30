package com.dictator.android.data.dictation

import android.content.Context
import com.dictator.android.data.AidosEngineConnection
import com.dictator.android.data.ai.AiSettingsKeys
import com.dictator.core.service.SharedPreferences

/** The dictation engine the user picked in Settings; an interface so tests can supply a fake. */
interface DictationEngines {
    fun selectedKind(): DictationEngineKind
    fun create(): DictationEngine
}

class DictationEngineFactory(
    private val context: Context,
    private val connection: AidosEngineConnection,
    private val prefs: SharedPreferences
) : DictationEngines {
    override fun selectedKind(): DictationEngineKind =
        DictationEngineKind.fromPref(prefs.getString(AiSettingsKeys.DICTATION_ENGINE, DictationEngineKind.SYSTEM.prefValue))

    override fun create(): DictationEngine = when (selectedKind()) {
        DictationEngineKind.SYSTEM -> SystemSpeechEngine(context)
        DictationEngineKind.AIDOS -> AidosSpeechEngine(connection) { prefs.getString(AiSettingsKeys.STT_MODEL, null) }
    }
}
