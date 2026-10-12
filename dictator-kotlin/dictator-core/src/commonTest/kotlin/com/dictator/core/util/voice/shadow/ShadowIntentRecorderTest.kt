package com.dictator.core.util.voice.shadow

import com.dictator.core.util.voice.CommandType
import com.dictator.core.util.voice.DictationAction
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ShadowIntentRecorderTest {
    private val lines = mutableListOf<String>()
    private var enabled = true
    private var storeText = false
    private var signal: IntentSignal? = IntentSignal(0.9, 0.1)

    private fun recorder(probe: ShadowIntentProbe = ShadowIntentProbe { _, _ -> signal }) =
        ShadowIntentRecorder(probe, { lines += it }, { enabled }, { storeText }, { 1234L })

    @Test fun offByDefaultGate_recordsNothingAndNeverCallsTheModel() = runTest {
        enabled = false
        var called = false
        recorder { _, _ -> called = true; signal }.record("poista", "fi-FI", DictationAction.Insert("poista"))
        assertTrue(lines.isEmpty()); assertFalse(called)
    }

    @Test fun textIsNotStoredUnlessAsked() = runTest {
        recorder().record("Tänään lauloimme virsi", "fi-FI", DictationAction.Insert("Tänään lauloimme virsi"))
        assertEquals(1, lines.size)
        assertFalse(lines[0].contains("virsi"), lines[0])
        assertTrue(lines[0].contains("\"parser\":\"insert\"") && lines[0].contains("\"words\":3"))
    }

    @Test fun textIsStoredWhenOptedIn() = runTest {
        storeText = true
        recorder().record("kumoa", "fi-FI", DictationAction.Insert("kumoa"))
        assertTrue(lines[0].contains("\"text\":\"kumoa\""))
    }

    @Test fun flagsTheCostlyDisagreement() = runTest {
        recorder().record("poista edellinen lause", "fi-FI", DictationAction.Insert("poista edellinen lause"))
        assertTrue(lines[0].contains("model_command_parser_insert"))
    }

    @Test fun flagsAParserCommandTheModelCalledText() = runTest {
        signal = IntentSignal(0.1, 0.0)
        recorder().record("tietokone kumoa", "fi-FI", DictationAction.Command(CommandType.UNDO, "kumoa"))
        assertTrue(lines[0].contains("model_text_parser_command"))
    }

    @Test fun noDisagreementFieldWhenTheyAgree() = runTest {
        signal = IntentSignal(0.05, 0.0)
        recorder().record("hyvää huomenta", "fi-FI", DictationAction.Insert("hyvää huomenta"))
        assertFalse(lines[0].contains("disagreement"))
    }

    @Test fun anUnavailableOrFailingModelRecordsNothingAndDoesNotThrow() = runTest {
        signal = null
        recorder().record("a", "en-US", DictationAction.Insert("a"))
        recorder { _, _ -> error("engine down") }.record("a", "en-US", DictationAction.Insert("a"))
        assertTrue(lines.isEmpty())
    }

    @Test fun aFailingSinkNeverBreaksDictation() = runTest {
        ShadowIntentRecorder({ _, _ -> signal }, { error("disk full") }, { true }, { false }, { 0L })
            .record("a", "en-US", DictationAction.Insert("a"))
    }
}
