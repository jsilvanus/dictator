package com.dictator.android.data.dictation

import kotlin.math.sqrt

/**
 * Cuts a stream of 16 kHz PCM16 frames into utterances by loudness, for engines (Aidos) that
 * transcribe a whole utterance at a time. Pure Kotlin so it can be tested with synthetic audio.
 *
 * Speech is a frame whose RMS is above both an absolute minimum and a multiple of the running
 * background level; an utterance ends after [endSilenceMs] of quiet or at [maxUtteranceMs]. A short
 * pre-roll is kept so the first syllable is not clipped, and sounds shorter than [minSpeechMs]
 * (coughs, taps) are dropped.
 */
class UtteranceSegmenter(
    val sampleRate: Int = 16_000,
    val frameMs: Int = 20,
    private val minSpeechMs: Int = 250,
    private val endSilenceMs: Int = 900,
    private val maxUtteranceMs: Int = 25_000,
    private val preRollMs: Int = 300,
    private val absoluteThreshold: Double = 350.0,
    private val noiseMultiplier: Double = 3.0
) {
    sealed class Event {
        data class Level(val value: Float) : Event()
        data object SpeechStarted : Event()
        class Utterance(val pcm: ShortArray) : Event()
    }

    val frameSamples: Int get() = sampleRate * frameMs / 1000

    private val preRoll = ArrayDeque<ShortArray>()
    private val current = ArrayList<ShortArray>()
    private var inSpeech = false
    private var speechFrames = 0
    private var silenceFrames = 0
    private var noiseFloor = 0.0

    fun feed(frame: ShortArray): List<Event> {
        val events = ArrayList<Event>(2)
        val rms = rms(frame)
        events += Event.Level((rms / 6000.0).coerceIn(0.0, 1.0).toFloat())

        val speaking = rms > maxOf(absoluteThreshold, noiseFloor * noiseMultiplier)
        if (!speaking) noiseFloor = if (noiseFloor == 0.0) rms else noiseFloor * 0.95 + rms * 0.05

        if (!inSpeech) {
            preRoll.addLast(frame)
            while (preRoll.size > preRollMs / frameMs) preRoll.removeFirst()
            if (speaking) {
                inSpeech = true
                speechFrames = 1
                silenceFrames = 0
                current.addAll(preRoll)
                preRoll.clear()
                events += Event.SpeechStarted
            }
            return events
        }

        current += frame
        if (speaking) {
            speechFrames++
            silenceFrames = 0
        } else {
            silenceFrames++
        }
        if (silenceFrames * frameMs >= endSilenceMs || current.size * frameMs >= maxUtteranceMs) {
            finish()?.let { events += it }
        }
        return events
    }

    /** The utterance in progress, if it is long enough to be speech. Call when recording stops. */
    fun flush(): Event.Utterance? = if (inSpeech) finish() else null

    private fun finish(): Event.Utterance? {
        val long = speechFrames * frameMs >= minSpeechMs
        val pcm = if (long) concat(current) else null
        current.clear()
        inSpeech = false
        speechFrames = 0
        silenceFrames = 0
        return pcm?.let { Event.Utterance(it) }
    }

    private fun concat(frames: List<ShortArray>): ShortArray {
        val out = ShortArray(frames.sumOf { it.size })
        var at = 0
        for (f in frames) { f.copyInto(out, at); at += f.size }
        return out
    }

    private fun rms(frame: ShortArray): Double {
        if (frame.isEmpty()) return 0.0
        var sum = 0.0
        for (s in frame) sum += s.toDouble() * s
        return sqrt(sum / frame.size)
    }
}

/** Minimal 16-bit mono PCM WAV container, the shape Engine's transcription endpoint decodes. */
object WavEncoder {
    fun encode(pcm: ShortArray, sampleRate: Int = 16_000): ByteArray {
        val dataSize = pcm.size * 2
        val out = ByteArray(44 + dataSize)
        fun putInt(at: Int, v: Int) { for (i in 0..3) out[at + i] = (v shr (8 * i)).toByte() }
        fun putShort(at: Int, v: Int) { out[at] = v.toByte(); out[at + 1] = (v shr 8).toByte() }
        "RIFF".forEachIndexed { i, c -> out[i] = c.code.toByte() }
        putInt(4, 36 + dataSize)
        "WAVEfmt ".forEachIndexed { i, c -> out[8 + i] = c.code.toByte() }
        putInt(16, 16)
        putShort(20, 1)               // PCM
        putShort(22, 1)               // mono
        putInt(24, sampleRate)
        putInt(28, sampleRate * 2)    // byte rate
        putShort(32, 2)               // block align
        putShort(34, 16)              // bits per sample
        "data".forEachIndexed { i, c -> out[36 + i] = c.code.toByte() }
        putInt(40, dataSize)
        for (i in pcm.indices) putShort(44 + i * 2, pcm[i].toInt())
        return out
    }
}
