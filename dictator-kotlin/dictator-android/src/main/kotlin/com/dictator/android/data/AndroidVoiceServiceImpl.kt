package com.dictator.android.data

import android.content.Context
import android.speech.RecognitionListener
import android.speech.SpeechRecognizer
import android.speech.SpeechRecognizer.CONFIDENCE_SCORES
import android.os.Bundle
import com.dictator.core.service.VoiceService
import com.dictator.core.data.voice.ActivationCommand
import com.dictator.core.data.local.VoiceSettingsRepository
import com.dictator.core.service.SharedPreferences
import io.github.aakira.napier.Napier

class AndroidVoiceServiceImpl(
    private val context: Context,
    private val voiceSettingsRepository: VoiceSettingsRepository? = null
) : VoiceService {
    private var speechRecognizer: SpeechRecognizer? = null
    private var voiceListener: VoiceListener? = null
    private var isListening = false
    private var currentLanguage: String = "en-US"
    private var activationCommands: List<ActivationCommand> = emptyList()

    interface VoiceListener {
        fun onResults(text: String, confidence: Float)
        fun onError(errorCode: String, message: String)
    }

    fun setListener(listener: VoiceListener) {
        this.voiceListener = listener
    }

    /**
     * Set language and load corresponding activation commands
     */
    fun setLanguage(language: String) {
        currentLanguage = language
        voiceSettingsRepository?.let {
            activationCommands = it.getActivationCommandsForLanguage(language)
        }
    }

    /**
     * Get current activation commands for voice recognition
     */
    fun getActivationCommands(): List<ActivationCommand> {
        return activationCommands
    }

    fun startListening() {
        if (isListening) {
            return
        }

        try {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
            if (speechRecognizer == null) {
                voiceListener?.onError("NOT_AVAILABLE", "Speech recognition not available on this device")
                return
            }

            speechRecognizer!!.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    Napier.d("Ready for speech")
                    isListening = true
                }

                override fun onBeginningOfSpeech() {
                    Napier.d("Beginning of speech")
                }

                override fun onRmsChanged(rmsdB: Float) {
                    Napier.d("RMS changed: $rmsdB")
                }

                override fun onBufferReceived(buffer: ByteArray?) {
                    Napier.d("Buffer received")
                }

                override fun onEndOfSpeech() {
                    Napier.d("End of speech")
                }

                override fun onError(error: Int) {
                    isListening = false
                    val errorMessage = when (error) {
                        SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                        SpeechRecognizer.ERROR_CLIENT -> "Client side error"
                        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                        SpeechRecognizer.ERROR_NETWORK -> "Network error"
                        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                        SpeechRecognizer.ERROR_NO_MATCH -> "No speech match"
                        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
                        SpeechRecognizer.ERROR_SERVER -> "Server error"
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech input timeout"
                        else -> "Unknown error"
                    }
                    Napier.e("Speech recognition error: $errorMessage")
                    voiceListener?.onError(error.toString(), errorMessage)
                }

                override fun onResults(results: Bundle?) {
                    isListening = false
                    if (results != null) {
                        val matches = results.getStringArrayList("results_recognition") ?: emptyList()
                        val confidences = results.getFloatArray(CONFIDENCE_SCORES)

                        if (matches.isNotEmpty()) {
                            val text = matches[0]
                            val confidence = if (confidences != null && confidences.isNotEmpty())
                                confidences[0]
                            else
                                0.9f

                            Napier.d("Recognition result: $text (confidence: $confidence)")
                            voiceListener?.onResults(text, confidence)
                        }
                    }
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    Napier.d("Partial results")
                }

                override fun onEvent(eventType: Int, params: Bundle?) {
                    Napier.d("Event type: $eventType")
                }
            })

            val intent = android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            intent.putExtra(
                android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            )
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 5)

            speechRecognizer!!.startListening(intent)
        } catch (e: Exception) {
            Napier.e("Error starting speech recognition", e)
            voiceListener?.onError("EXCEPTION", e.message ?: "Unknown error")
        }
    }

    fun stopListening() {
        if (isListening && speechRecognizer != null) {
            try {
                speechRecognizer!!.stopListening()
                isListening = false
            } catch (e: Exception) {
                Napier.e("Error stopping speech recognition", e)
            }
        }
    }

    fun cancel() {
        if (speechRecognizer != null) {
            try {
                speechRecognizer!!.cancel()
                isListening = false
            } catch (e: Exception) {
                Napier.e("Error canceling speech recognition", e)
            }
        }
    }

    fun destroy() {
        if (speechRecognizer != null) {
            try {
                speechRecognizer!!.destroy()
                speechRecognizer = null
            } catch (e: Exception) {
                Napier.e("Error destroying speech recognition", e)
            }
        }
    }

    override suspend fun transcribe(audioBytes: ByteArray): String {
        // Android uses callback-based speech recognition through SpeechRecognizer
        // This method is not used in Android implementation since recognition happens
        // through the listener callbacks (startListening -> onResults)
        // For offline transcription, would need a separate speech-to-text library
        throw NotImplementedError("Use startListening() with setListener() for Android speech recognition")
    }

    override suspend fun startVoiceCommand(): String {
        startListening()
        return "Voice command started"
    }
}
