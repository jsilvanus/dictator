package com.dictator.android.data

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat
import com.dictator.core.data.local.VoiceSettingsRepository
import com.dictator.core.data.voice.ActivationCommand
import io.github.aakira.napier.Napier
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Android system speech-recognition provider.
 *
 * This deliberately remains separate from Aidos/local inference: callers can choose
 * the Android provider when they want the system recognizer, including its partial
 * results and device-specific recognition service.
 */
@Singleton
class AndroidVoiceServiceImpl @Inject constructor(
    private val context: Context,
    private val voiceSettingsRepository: VoiceSettingsRepository? = null
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var speechRecognizer: SpeechRecognizer? = null
    private var voiceListener: VoiceListener? = null
    private var isListening = false
    private var currentLanguage: String = "en-US"
    private var activationCommands: List<ActivationCommand> = emptyList()
    private var useOnDeviceRecognizer = false

    interface VoiceListener {
        fun onResults(text: String, confidence: Float)
        fun onPartialResults(text: String)
        fun onError(errorCode: String, message: String)
    }

    fun setListener(listener: VoiceListener?) {
        voiceListener = listener
    }

    fun setLanguage(language: String) {
        currentLanguage = language
        activationCommands = voiceSettingsRepository?.getActivationCommandsForLanguage(language).orEmpty()
    }

    fun getLanguage(): String = currentLanguage

    fun getActivationCommands(): List<ActivationCommand> = activationCommands

    /** Whether the Android runtime currently has microphone permission. */
    fun hasRecordAudioPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    /** Whether any Android speech recognizer is available. */
    fun isRecognitionAvailable(): Boolean = SpeechRecognizer.isRecognitionAvailable(context)

    /** Whether an on-device recognizer is available on this device. */
    fun isOnDeviceRecognitionAvailable(): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            SpeechRecognizer.isOnDeviceRecognitionAvailable(context)

    /**
     * Select the Android provider mode. Aidos remains a separate provider and is not
     * affected by this setting.
     */
    fun setUseOnDeviceRecognizer(enabled: Boolean) {
        useOnDeviceRecognizer = enabled
    }

    fun isUsingOnDeviceRecognizer(): Boolean = useOnDeviceRecognizer

    fun startListening() {
        mainHandler.post {
            if (isListening) return@post

            if (!hasRecordAudioPermission()) {
                voiceListener?.onError("INSUFFICIENT_PERMISSIONS", "Microphone permission not granted")
                return@post
            }

            if (!isRecognitionAvailable()) {
                voiceListener?.onError("NOT_AVAILABLE", "Speech recognition is not available on this device")
                return@post
            }

            try {
                destroyRecognizer()
                speechRecognizer = createRecognizer()
                speechRecognizer?.setRecognitionListener(createRecognitionListener())
                speechRecognizer?.startListening(createRecognizerIntent())
            } catch (e: Exception) {
                isListening = false
                Napier.e("Error starting speech recognition", e)
                voiceListener?.onError("EXCEPTION", e.message ?: "Unknown error")
            }
        }
    }

    fun stopListening() {
        mainHandler.post {
            speechRecognizer?.let {
                try {
                    it.stopListening()
                } catch (e: Exception) {
                    Napier.e("Error stopping speech recognition", e)
                } finally {
                    isListening = false
                }
            }
        }
    }

    fun cancel() {
        mainHandler.post {
            try {
                speechRecognizer?.cancel()
            } catch (e: Exception) {
                Napier.e("Error canceling speech recognition", e)
            } finally {
                isListening = false
            }
        }
    }

    fun destroy() {
        mainHandler.post { destroyRecognizer() }
    }

    internal fun createRecognizerIntent(): Intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, currentLanguage)
        putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
    }

    private fun createRecognizer(): SpeechRecognizer {
        if (useOnDeviceRecognizer && isOnDeviceRecognitionAvailable()) {
            return SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
        }
        return SpeechRecognizer.createSpeechRecognizer(context)
    }

    private fun createRecognitionListener() = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            isListening = true
            Napier.d("Ready for speech ($currentLanguage)")
        }

        override fun onBeginningOfSpeech() {
            Napier.d("Beginning of speech")
        }

        override fun onRmsChanged(rmsdB: Float) = Unit

        override fun onBufferReceived(buffer: ByteArray?) = Unit

        override fun onEndOfSpeech() {
            Napier.d("End of speech")
        }

        override fun onError(error: Int) {
            isListening = false
            val message = errorMessage(error)
            Napier.e("Speech recognition error: $message")
            voiceListener?.onError(error.toString(), message)
        }

        override fun onResults(results: Bundle?) {
            isListening = false
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty()
            if (matches.isEmpty()) return

            val confidences = results?.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)
            val confidence = confidences?.firstOrNull()?.takeIf { it >= 0f } ?: 0f
            val text = matches.first()
            Napier.d("Recognition result: $text (confidence: $confidence)")
            voiceListener?.onResults(text, confidence)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val text = partialResults
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()
                ?: return
            voiceListener?.onPartialResults(text)
        }

        override fun onEvent(eventType: Int, params: Bundle?) = Unit
    }

    private fun errorMessage(error: Int): String = when (error) {
        SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
        SpeechRecognizer.ERROR_CLIENT -> "Client side error"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
        SpeechRecognizer.ERROR_NETWORK -> "Network error"
        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
        SpeechRecognizer.ERROR_NO_MATCH -> "No speech match"
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
        SpeechRecognizer.ERROR_SERVER -> "Server error"
        SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> "Speech recognition service disconnected"
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech input timeout"
        SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED -> "Language not supported"
        SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "Language unavailable"
        else -> "Unknown speech recognition error"
    }

    private fun destroyRecognizer() {
        try {
            speechRecognizer?.destroy()
        } catch (e: Exception) {
            Napier.e("Error destroying speech recognizer", e)
        } finally {
            speechRecognizer = null
            isListening = false
        }
    }
}
