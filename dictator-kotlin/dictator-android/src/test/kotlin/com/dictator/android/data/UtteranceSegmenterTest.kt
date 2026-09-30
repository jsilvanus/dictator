package com.dictator.android.data

import com.dictator.android.data.dictation.UtteranceSegmenter
import com.dictator.android.data.dictation.WavEncoder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.PI
import kotlin.math.sin

class UtteranceSegmenterTest {
    private val seg = UtteranceSegmenter()

    private fun tone(amplitude: Int): ShortArray =
        ShortArray(seg.frameSamples) { i -> (amplitude * sin(2 * PI * 220 * i / seg.sampleRate)).toInt().toShort() }

    private fun silence(): ShortArray = ShortArray(seg.frameSamples)

    private fun feed(vararg frames: Pair<ShortArray, Int>): List<UtteranceSegmenter.Event> =
        frames.flatMap { (frame, times) -> (1..times).flatMap { seg.feed(frame) } }

    private fun utterances(events: List<UtteranceSegmenter.Event>) = events.filterIsInstance<UtteranceSegmenter.Event.Utterance>()

    @Test
    fun `silence alone yields nothing`() {
        assertTrue(utterances(feed(silence() to 200)).isEmpty())
    }

    @Test
    fun `speech followed by a pause yields one utterance including pre-roll`() {
        val events = feed(silence() to 30, tone(3000) to 50, silence() to 60)
        val out = utterances(events)
        assertEquals(1, out.size)
        // 300 ms pre-roll + 1 s speech + 900 ms of trailing silence, in 20 ms frames.
        val frames = out.single().pcm.size / seg.frameSamples
        assertTrue("frames=$frames", frames in 100..112)
        assertTrue(events.any { it is UtteranceSegmenter.Event.SpeechStarted })
    }

    @Test
    fun `a short blip is dropped`() {
        assertTrue(utterances(feed(silence() to 20, tone(3000) to 4, silence() to 80)).isEmpty())
    }

    @Test
    fun `two phrases separated by a pause are two utterances`() {
        val out = utterances(feed(tone(3000) to 40, silence() to 60, tone(3000) to 40, silence() to 60))
        assertEquals(2, out.size)
    }

    @Test
    fun `flush returns the utterance in progress when recording stops`() {
        feed(tone(3000) to 40)
        assertNotNull(seg.flush())
        assertNull(seg.flush())
    }

    @Test
    fun `very long speech is cut at the maximum length`() {
        val out = utterances(feed(tone(3000) to 1500))
        assertTrue(out.isNotEmpty())
        assertTrue(out.all { it.pcm.size / seg.frameSamples <= 1300 })
    }

    @Test
    fun `wav header matches the pcm it wraps`() {
        val pcm = ShortArray(160) { it.toShort() }
        val wav = WavEncoder.encode(pcm, 16_000)
        assertEquals(44 + 320, wav.size)
        assertEquals("RIFF", String(wav, 0, 4))
        assertEquals("WAVE", String(wav, 8, 4))
        fun int(at: Int) = (0..3).sumOf { (wav[at + it].toInt() and 0xFF) shl (8 * it) }
        assertEquals(36 + 320, int(4))
        assertEquals(16_000, int(24))
        assertEquals(320, int(40))
        // Sample 1 is little-endian 0x0001.
        assertEquals(1, wav[46].toInt())
    }
}
