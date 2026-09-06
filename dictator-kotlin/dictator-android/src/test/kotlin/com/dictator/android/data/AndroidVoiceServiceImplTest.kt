package com.dictator.android.data

import android.content.Context
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class AndroidVoiceServiceImplTest {
    private val context: Context = mock {
        on { packageName } doReturn "com.dictator.android"
    }

    @Test
    fun `recognizer intent propagates language and enables partial results`() {
        val service = AndroidVoiceServiceImpl(context)
        service.setLanguage("fi-FI")

        val intent = service.createRecognizerIntent()

        assertEquals("fi-FI", intent.getStringExtra(RecognizerIntent.EXTRA_LANGUAGE))
        assertEquals(
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
            intent.getStringExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL)
        )
        assertTrue(intent.getBooleanExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false))
        assertEquals(5, intent.getIntExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 0))
    }

    @Test
    fun `language rejects blank values`() {
        val service = AndroidVoiceServiceImpl(context)

        org.junit.Assert.assertThrows(IllegalArgumentException::class.java) {
            service.setLanguage(" ")
        }
    }

    @Test
    fun `speech errors are mapped to user readable messages`() {
        val service = AndroidVoiceServiceImpl(context)

        assertEquals("Network error", service.errorMessage(SpeechRecognizer.ERROR_NETWORK))
        assertEquals("Language unavailable", service.errorMessage(SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE))
        assertEquals("Speech recognition service disconnected", service.errorMessage(SpeechRecognizer.ERROR_SERVER_DISCONNECTED))
    }
}
