package com.dictator.android.data.dictation

enum class DictationEngineKind(val prefValue: String) {
    /** Android's [android.speech.SpeechRecognizer]: partial results, but usually cloud-backed. */
    SYSTEM("system"),
    /** Whisper on this device through Aidos Engine: nothing leaves the phone, one result per utterance. */
    AIDOS("aidos");

    companion object {
        fun fromPref(value: String?): DictationEngineKind = entries.firstOrNull { it.prefValue == value } ?: SYSTEM
    }
}

/** Callbacks arrive on the main thread. */
interface DictationListener {
    fun onListening()
    /** Loudness 0..1, for a level meter. */
    fun onLevel(level: Float) {}
    /** Engines without partial results (Aidos) never call this. */
    fun onPartial(text: String) {}
    fun onFinal(text: String)
    /** [message] is user-presentable. After an error the engine is stopped. */
    fun onError(message: String)
    fun onStopped()
}

interface DictationEngine {
    val kind: DictationEngineKind

    /** Null when usable, otherwise why not (shown to the user). May contact Aidos Engine. */
    suspend fun unavailableReason(): String?

    /** Listen until [stop]; deliver each utterance through [DictationListener.onFinal]. */
    fun start(language: String, listener: DictationListener)

    /** Finish the utterance in progress, deliver it, then call [DictationListener.onStopped]. */
    fun stop()

    /** Drop everything without delivering. */
    fun cancel()
}
