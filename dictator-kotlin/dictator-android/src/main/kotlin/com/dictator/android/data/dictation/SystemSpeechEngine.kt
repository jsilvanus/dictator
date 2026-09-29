package com.dictator.android.data.dictation

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import io.github.aakira.napier.Napier

/**
 * Dictation through Android's [SpeechRecognizer]. Gives partial results as the user speaks, but on
 * most devices audio goes to the recognizer service's cloud — the reason Aidos offline dictation
 * exists (docs/AIDOS_SDK_INTEGRATION_PLAN.md, D2). Must be driven from the main thread.
 *
 * The platform recognizer ends after each utterance and beeps on restart; this class restarts it
 * until [stop]/[cancel], so callers see one continuous session.
 */
class SystemSpeechEngine(private val context: Context) : DictationEngine {
    override val kind = DictationEngineKind.SYSTEM

    private val main = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var listener: DictationListener? = null
    private var language = "en-US"
    private var active = false
    private var stopping = false

    override suspend fun unavailableReason(): String? =
        if (SpeechRecognizer.isRecognitionAvailable(context)) null
        else "No speech recognition service on this device. Install Google's speech services, or use Aidos Engine."

    override fun start(language: String, listener: DictationListener) {
        main.post {
            if (active) return@post
            this.language = language
            this.listener = listener
            active = true
            stopping = false
            listenOnce()
        }
    }

    private fun listenOnce() {
        val r = recognizer ?: SpeechRecognizer.createSpeechRecognizer(context).also { recognizer = it }
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) { listener?.onListening() }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) { listener?.onLevel(((rmsdB + 2f) / 12f).coerceIn(0f, 1f)) }
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}

            override fun onPartialResults(partialResults: Bundle?) {
                partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                    ?.takeIf { it.isNotBlank() }?.let { listener?.onPartial(it) }
            }

            override fun onResults(results: Bundle?) {
                results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                    ?.takeIf { it.isNotBlank() }?.let { listener?.onFinal(it) }
                if (stopping || !active) finish() else main.postDelayed({ if (active) listenOnce() }, 150)
            }

            override fun onError(error: Int) {
                when (error) {
                    // Silence and unintelligible audio are normal in continuous dictation.
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT ->
                        if (stopping || !active) finish() else main.postDelayed({ if (active) listenOnce() }, 150)
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> main.postDelayed({ if (active) listenOnce() }, 500)
                    else -> {
                        Napier.e("SpeechRecognizer error $error")
                        val message = describe(error)
                        val l = listener
                        teardown()
                        l?.onError(message)
                    }
                }
            }
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            .putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
        r.startListening(intent)
    }

    override fun stop() {
        main.post {
            if (!active) return@post
            stopping = true
            recognizer?.stopListening()   // delivers the utterance in progress via onResults, then finish()
            // If the recognizer never answers, do not hang the UI.
            main.postDelayed({ if (active && stopping) finish() }, 2500)
        }
    }

    override fun cancel() {
        main.post { teardown() }
    }

    private fun finish() {
        val l = listener
        teardown()
        l?.onStopped()
    }

    private fun teardown() {
        active = false
        stopping = false
        main.removeCallbacksAndMessages(null)
        recognizer?.destroy()
        recognizer = null
        listener = null
    }

    private fun describe(error: Int) = when (error) {
        SpeechRecognizer.ERROR_AUDIO -> "Audio recording error."
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission is missing."
        SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
            "The speech service needs a network connection. Switch to Aidos offline dictation in Settings to dictate without one."
        SpeechRecognizer.ERROR_SERVER -> "The speech service reported an error."
        SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE ->
            "This language is not available for on-device or online recognition."
        else -> "Speech recognition failed (code $error)."
    }
}
