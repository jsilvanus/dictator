package fi.italeino.aidos.dictator.ui.pill

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.dictator.core.actor.ActorPillStatus
import com.dictator.core.actor.PillConstellationManager

/**
 * Organism TCR component: Hosts the multi-pill constellation overlay (Option B).
 *
 * Coordinates:
 * - Red Pill (Voice Orchestrator) at cursor coordinates with Drag-to-Move Cursor
 * - Blue Pill (Deterministic Editor) with Spring & Freeze drag-to-pause and tear-to-abort
 * - Green Pill (AI Generator) with token streaming & drag intervention
 * - 1-click Happenings HUD floating card
 * - 2-click Transcript Drawer (docked on desktop, 50% on mobile)
 */
@Composable
fun PillConstellationOverlay(
    manager: PillConstellationManager,
    cursorX: Int,
    cursorY: Int,
    modifier: Modifier = Modifier,
    onDragCursor: ((Offset) -> Unit)? = null
) {
    val orchestratorConfig by manager.orchestratorConfig.collectAsState()
    val orchestratorStatus by manager.orchestratorStatus.collectAsState()

    val editorConfig by manager.editorConfig.collectAsState()
    val editorStatus by manager.editorStatus.collectAsState()

    val aiConfig by manager.aiConfig.collectAsState()
    val aiStatus by manager.aiStatus.collectAsState()

    val isHudVisible by manager.isHappeningsHudVisible.collectAsState()
    val isTranscriptOpen by manager.isTranscriptDrawerOpen.collectAsState()
    val happenings by manager.happenings.collectAsState()
    val transcript by manager.transcript.collectAsState()

    Box(modifier = modifier.fillMaxSize()) {
        // 1. Red Pill: Anchored above cursor coordinates like a superscript symbol
        FloatingActorPill(
            config = orchestratorConfig,
            status = orchestratorStatus,
            onSingleClick = { manager.onPillSingleClick(orchestratorConfig.id) },
            onDoubleClick = { manager.onPillDoubleClick(orchestratorConfig.id) },
            onDragCursor = onDragCursor,
            modifier = Modifier.offset {
                IntOffset(x = cursorX.coerceAtLeast(16), y = (cursorY - 48).coerceAtLeast(16))
            }
        )

        // 2. Blue Pill: Rendered when active, staging an edit, or holding text selection
        if (editorStatus !is ActorPillStatus.WaitingAmbient || manager.selectionHolder.isHolding) {
            FloatingActorPill(
                config = editorConfig,
                status = editorStatus,
                onSingleClick = { manager.onPillSingleClick(editorConfig.id) },
                onDoubleClick = { manager.onPillDoubleClick(editorConfig.id) },
                onPauseStaging = { manager.cadenceEngine.pause() },
                onResumeStaging = { manager.cadenceEngine.resume() },
                onAbortStaging = { manager.cadenceEngine.abortCurrentAction() },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 16.dp, end = 16.dp)
            )
        }

        // 3. Green Pill: Rendered when AI is working / generating
        if (aiStatus !is ActorPillStatus.WaitingAmbient) {
            FloatingActorPill(
                config = aiConfig,
                status = aiStatus,
                onSingleClick = { manager.onPillSingleClick(aiConfig.id) },
                onDoubleClick = { manager.onPillDoubleClick(aiConfig.id) },
                onPauseStaging = { manager.cadenceEngine.pause() },
                onResumeStaging = { manager.cadenceEngine.resume() },
                onAbortStaging = { manager.cadenceEngine.abortCurrentAction() },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 24.dp, end = 24.dp)
            )
        }

        // 4. Happenings HUD (Single-click floating popover)
        AnimatedVisibility(
            visible = isHudVisible,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 72.dp)
        ) {
            HappeningsHUD(
                events = happenings,
                onDismiss = { manager.dismissHappeningsHud() }
            )
        }

        // 5. Transcript Drawer (Double-click docked panel / split drawer)
        AnimatedVisibility(
            visible = isTranscriptOpen,
            enter = slideInHorizontally(initialOffsetX = { it }),
            exit = slideOutHorizontally(targetOffsetX = { it }),
            modifier = Modifier.align(Alignment.CenterEnd)
        ) {
            TranscriptSplitDrawer(
                entries = transcript,
                onClose = { manager.closeTranscriptDrawer() }
            )
        }
    }
}
