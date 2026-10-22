package fi.italeino.aidos.dictator

import android.util.Base64
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import fi.italeino.aidos.dictator.data.AidosEngineConnection
import fi.italeino.aidos.sdk.client.EngineAvailability
import fi.italeino.aidos.sdk.client.TranscriptionRequest
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class AidosEngineE2ETest {

    @Test
    fun testOfflineSttTranscriptionOnDevice() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val connection = AidosEngineConnection.create(context)

        val avail = connection.connect()
        android.util.Log.i("AidosEngineE2ETest", "Engine availability: $avail")
        assertEquals(EngineAvailability.Available, avail)

        val caps = connection.client.capabilities()
        android.util.Log.i("AidosEngineE2ETest", "Engine capabilities models: ${caps.models.map { "${it.id} (${it.kind})" }}")
        assertTrue("Expected at least one STT model", caps.models.any { it.kind == "stt" })

        val wavFile = File("/data/local/tmp/jfk.wav")
        assertTrue("WAV file exists at /data/local/tmp/jfk.wav", wavFile.exists())
        val wavBytes = wavFile.readBytes()
        val wavBase64 = Base64.encodeToString(wavBytes, Base64.NO_WRAP)

        android.util.Log.i("AidosEngineE2ETest", "Sending transcription request for whisper-tiny...")
        val response = connection.client.transcribe(
            TranscriptionRequest(
                file = wavBase64,
                model = "whisper-tiny",
                language = "en"
            )
        )
        assertNotNull("Expected non-null transcription response", response)
        val text = response?.text?.trim().orEmpty()
        android.util.Log.i("AidosEngineE2ETest", "Transcription result: '$text'")
        assertTrue("Transcription text should not be blank", text.isNotBlank())
        assertTrue(
            "Transcription should contain expected keywords from JFK speech, got: '$text'",
            text.lowercase().contains("ask") || text.lowercase().contains("country") || text.lowercase().contains("what")
        )
    }
}
