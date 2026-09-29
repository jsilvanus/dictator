package com.dictator.android.data.dictation

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.util.Base64
import com.dictator.android.data.AidosEngineConnection
import fi.italeino.aidos.sdk.client.EngineAvailability
import fi.italeino.aidos.sdk.client.TranscriptionRequest
import io.github.aakira.napier.Napier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch

/**
 * Offline dictation through Whisper in Aidos Engine (docs/AIDOS_SDK_INTEGRATION_PLAN.md, D2).
 *
 * Engine's transcription endpoint takes a whole utterance and returns no partial results
 * (sdk/CONTRACT.md, "Not covered"), so audio is recorded here, cut into utterances by loudness
 * ([UtteranceSegmenter]) and sent one at a time, in order. The tradeoff is stated in the settings
 * UI: no live partial text and a delay after each phrase, but nothing leaves the device.
 *
 * Requires RECORD_AUDIO; the caller checks it before [start].
 */
class AidosSpeechEngine(
    private val connection: AidosEngineConnection,
    private val preferredModel: () -> String? = { null }
) : DictationEngine {
    override val kind = DictationEngineKind.AIDOS

    private val main = Handler(Looper.getMainLooper())
    private var scope: CoroutineScope? = null
    private var capture: Job? = null
    @Volatile private var stopRequested = false
    @Volatile private var cancelled = false

    override suspend fun unavailableReason(): String? {
        val availability = connection.ensureAvailable()
        if (availability != EngineAvailability.Available) return AidosEngineConnection.explain(availability)
        return if (connection.client.capabilities().models.any { it.kind == "stt" }) null
        else "Aidos Engine has no speech model installed. Add a Whisper model in Aidos Engine."
    }

    @SuppressLint("MissingPermission") // Checked by the caller; see class doc.
    override fun start(language: String, listener: DictationListener) {
        if (capture?.isActive == true) return
        stopRequested = false
        cancelled = false
        val s = CoroutineScope(SupervisorJob() + Dispatchers.Default).also { scope = it }
        capture = s.launch {
            fun post(block: () -> Unit) { if (!cancelled) main.post { if (!cancelled) block() } }

            val reason = unavailableReason()
            if (reason != null) { post { listener.onError(reason) }; return@launch }
            val model = preferredModel()?.takeIf { it.isNotBlank() }
                ?: connection.client.capabilities().models.first { it.kind == "stt" }.id

            val segmenter = UtteranceSegmenter()
            val minBuffer = AudioRecord.getMinBufferSize(segmenter.sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val record = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION, segmenter.sampleRate, AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT, maxOf(minBuffer, segmenter.frameSamples * 8)
            )
            if (record.state != AudioRecord.STATE_INITIALIZED) {
                record.release()
                post { listener.onError("Could not open the microphone.") }
                return@launch
            }

            // Utterances are transcribed one at a time, in spoken order, while capture continues.
            val queue = Channel<ShortArray>(Channel.UNLIMITED)
            val transcriber = launch {
                for (pcm in queue) {
                    val wav = Base64.encodeToString(WavEncoder.encode(pcm, segmenter.sampleRate), Base64.NO_WRAP)
                    val response = connection.client.transcribe(TranscriptionRequest(file = wav, model = model, language = language.substringBefore('-')))
                    val text = response?.text?.trim().orEmpty()
                    if (response == null) post { listener.onError("Aidos Engine could not transcribe that. Is Engine still running?") }
                    else if (text.isNotEmpty()) post { listener.onFinal(text) }
                }
            }

            post { listener.onListening() }
            record.startRecording()
            try {
                val frame = ShortArray(segmenter.frameSamples)
                while (!stopRequested && !cancelled) {
                    var read = 0
                    while (read < frame.size && !stopRequested && !cancelled) {
                        val n = record.read(frame, read, frame.size - read)
                        if (n <= 0) { Napier.e("AudioRecord.read returned $n"); break }
                        read += n
                    }
                    if (read < frame.size) break
                    for (event in segmenter.feed(frame.copyOf())) {
                        when (event) {
                            is UtteranceSegmenter.Event.Level -> post { listener.onLevel(event.value) }
                            is UtteranceSegmenter.Event.Utterance -> queue.trySend(event.pcm)
                            UtteranceSegmenter.Event.SpeechStarted -> Unit
                        }
                    }
                }
                if (!cancelled) segmenter.flush()?.let { queue.trySend(it.pcm) }
            } finally {
                runCatching { record.stop() }
                record.release()
                queue.close()
            }
            transcriber.join()
            post { listener.onStopped() }
        }
    }

    override fun stop() { stopRequested = true }

    override fun cancel() {
        cancelled = true
        stopRequested = true
        scope?.cancel()
        scope = null
        main.removeCallbacksAndMessages(null)
    }
}
