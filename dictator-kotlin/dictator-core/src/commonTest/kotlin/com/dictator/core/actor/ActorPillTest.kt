package com.dictator.core.actor

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class ActorPillTest {

    @Test
    fun testPillConfigDefaultsAndCustomization() {
        val orchestrator = ActorPillConfig.createDefaultOrchestrator()
        assertEquals(ActorRole.ORCHESTRATOR_DICTATION, orchestrator.role)
        assertEquals(ActorPillConfig.DEFAULT_RED_ORCHESTRATOR, orchestrator.colorArgb)
        assertEquals(GlyphType.MIC, orchestrator.defaultGlyph)

        val editor = ActorPillConfig.createDefaultEditor()
        assertEquals(ActorRole.DETERMINISTIC_EDITOR, editor.role)
        assertEquals(ActorPillConfig.DEFAULT_BLUE_EDITOR, editor.colorArgb)

        val ai = ActorPillConfig.createDefaultAi()
        assertEquals(ActorRole.GENERATIVE_AI, ai.role)
        assertEquals(ActorPillConfig.DEFAULT_GREEN_AI, ai.colorArgb)

        // Customization
        val renamed = editor.copy(displayName = "Super Editor", colorArgb = 0xFF5500FFL)
        assertEquals("Super Editor", renamed.displayName)
        assertEquals(0xFF5500FFL, renamed.colorArgb)
    }

    @Test
    fun testCadenceDurationCalculation() {
        runTest {
            val engine = CadenceEngine(this)
            assertEquals(900L, engine.calculateCadenceMs(OperationSeverity.DESTRUCTIVE))
            assertEquals(500L, engine.calculateCadenceMs(OperationSeverity.STRUCTURAL))
            assertEquals(250L, engine.calculateCadenceMs(OperationSeverity.MINOR))
        }
    }

    @Test
    fun testCadenceStagingAndCommitFlow() = runTest {
        val engine = CadenceEngine(this, defaultTickIntervalMs = 50L)
        var committed = false

        val targetRange = TextRangeBounds(0, 100)
        engine.stageAndExecute(
            targetRange = targetRange,
            severity = OperationSeverity.DESTRUCTIVE,
            description = "Poista kappale",
            glyph = GlyphType.DELETE
        ) {
            committed = true
        }

        // Run current coroutines to start the staging loop
        runCurrent()

        // Initially in CadenceStaging
        val initialStatus = engine.currentStatus.value
        assertTrue(initialStatus is ActorPillStatus.CadenceStaging)
        assertEquals(GlyphType.DELETE, initialStatus.glyph)
        assertEquals(900L, initialStatus.durationMs)
        assertEquals(100, initialStatus.targetRange.length)

        // Advance halfway (450ms)
        advanceTimeBy(450L)
        val midStatus = engine.currentStatus.value
        assertTrue(midStatus is ActorPillStatus.CadenceStaging)
        assertTrue(midStatus.progress in 0.35f..0.65f)
        assertFalse(committed)

        // Advance to completion + commit flash (100ms) + ambient return
        advanceTimeBy(600L)
        assertTrue(committed, "Action should commit after full cadence")
        assertEquals(ActorPillStatus.WaitingAmbient, engine.currentStatus.value)
    }

    @Test
    fun testCadenceStagingAbort() = runTest {
        val engine = CadenceEngine(this, defaultTickIntervalMs = 50L)
        var committed = false

        engine.stageAndExecute(
            targetRange = TextRangeBounds(10, 50),
            severity = OperationSeverity.DESTRUCTIVE,
            description = "Poista kappale",
            glyph = GlyphType.DELETE
        ) {
            committed = true
        }

        runCurrent()
        advanceTimeBy(300L)
        assertTrue(engine.currentStatus.value is ActorPillStatus.CadenceStaging)

        // Abort action
        val aborted = engine.abortCurrentAction()
        assertTrue(aborted, "Abort should succeed for active staging")

        // Advance time past the original duration
        advanceTimeBy(1000L)
        assertFalse(committed, "Aborted action must NOT commit")
        assertEquals(ActorPillStatus.WaitingAmbient, engine.currentStatus.value)
    }

    @Test
    fun testCadencePauseAndResume() = runTest {
        val engine = CadenceEngine(this, defaultTickIntervalMs = 50L)
        var committed = false

        engine.stageAndExecute(
            targetRange = TextRangeBounds(0, 50),
            severity = OperationSeverity.DESTRUCTIVE,
            description = "Poista kappale",
            glyph = GlyphType.DELETE
        ) {
            committed = true
        }

        runCurrent()
        advanceTimeBy(300L)
        assertTrue(engine.currentStatus.value is ActorPillStatus.CadenceStaging)

        // Pause (Spring & Freeze)
        val paused = engine.pause()
        assertTrue(paused)
        val pausedStatus = engine.currentStatus.value as ActorPillStatus.CadenceStaging
        assertTrue(pausedStatus.isPaused)

        // Advance 2 seconds while paused: should not commit
        advanceTimeBy(2000L)
        assertFalse(committed)

        // Resume
        val resumed = engine.resume()
        assertTrue(resumed)

        // Advance remaining cadence time + flash (600ms remaining + 100ms flash + buffer)
        advanceTimeBy(800L)
        assertTrue(committed)
        assertEquals(ActorPillStatus.WaitingAmbient, engine.currentStatus.value)
    }

    @Test
    fun testActorSelectionHolderWordCountAndBounds() {
        val holder = ActorSelectionHolder()
        assertFalse(holder.isHolding)
        assertNull(holder.holdingState.value)

        val docText = "Yksi kaksi kolme neljä viisi kuusi seitsemän."
        val state = holder.holdSelection(docText, startChar = 0, endChar = docText.length)

        assertTrue(holder.isHolding)
        assertEquals(7, state.wordCount)
        assertEquals(0, state.selectedRange.startChar)
        assertEquals(docText.length, state.selectedRange.endChar)

        // Partial selection: "kaksi kolme"
        val partialState = holder.holdSelection(docText, startChar = 5, endChar = 16)
        assertEquals(2, partialState.wordCount)

        holder.clearSelection()
        assertFalse(holder.isHolding)
        assertNull(holder.holdingState.value)
    }

    @Test
    fun testPillConstellationManagerGesturesAndCustomization() = runTest {
        val manager = PillConstellationManager(this)

        // Verify initial state
        assertFalse(manager.isHappeningsHudVisible.value)
        assertFalse(manager.isTranscriptDrawerOpen.value)

        // Single click toggles Happenings HUD
        manager.onPillSingleClick(manager.orchestratorConfig.value.id)
        assertTrue(manager.isHappeningsHudVisible.value)
        manager.onPillSingleClick(manager.orchestratorConfig.value.id)
        assertFalse(manager.isHappeningsHudVisible.value)

        // Double click toggles Transcript Drawer
        manager.onPillDoubleClick(manager.orchestratorConfig.value.id)
        assertTrue(manager.isTranscriptDrawerOpen.value)
        manager.closeTranscriptDrawer()
        assertFalse(manager.isTranscriptDrawerOpen.value)

        // Customization
        manager.renamePill(manager.editorConfig.value.id, "Sininen Muokkain")
        assertEquals("Sininen Muokkain", manager.editorConfig.value.displayName)

        manager.changePillColor(manager.orchestratorConfig.value.id, 0xFFFF0055L)
        assertEquals(0xFFFF0055L, manager.orchestratorConfig.value.colorArgb)

        // Happenings telemetry logging
        manager.recordHappening(
            recognizedUtterance = "poista kappale",
            actorRole = ActorRole.DETERMINISTIC_EDITOR,
            actionName = "DELETE_PARAGRAPH",
            details = "Paragraph 2 (chars 40-120)",
            status = HappeningsEvent.EventStatus.COMMITTED
        )
        assertEquals(1, manager.happenings.value.size)
        assertEquals("poista kappale", manager.happenings.value.first().recognizedUtterance)
        assertEquals(manager.editorConfig.value.colorArgb, manager.happenings.value.first().actorColorArgb)

        // Happenings telemetry logging with explicit actorColorArgb
        manager.recordHappening(
            recognizedUtterance = "kirjoita lisää",
            actorRole = ActorRole.GENERATIVE_AI,
            actionName = "STREAM_TEXT",
            details = "Section 3",
            status = HappeningsEvent.EventStatus.COMMITTED,
            actorColorArgb = 0xFF123456L
        )
        assertEquals(2, manager.happenings.value.size)
        assertEquals(0xFF123456L, manager.happenings.value.first().actorColorArgb)

        // Transcript streaming
        manager.appendTranscript(
            speaker = "User",
            text = "Kirjoita yhteenveto.",
            confidence = 0.96f,
            isFinal = true
        )
        assertEquals(1, manager.transcript.value.size)
        assertEquals("Kirjoita yhteenveto.", manager.transcript.value.first().text)
    }
}
