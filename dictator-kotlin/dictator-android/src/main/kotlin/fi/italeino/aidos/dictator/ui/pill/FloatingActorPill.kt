package fi.italeino.aidos.dictator.ui.pill

import androidx.compose.animation.core.animateOffsetAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dictator.core.actor.ActorPillConfig
import com.dictator.core.actor.ActorPillStatus
import com.dictator.core.actor.ActorRole
import com.dictator.core.actor.GlyphType
import kotlin.math.roundToInt

/**
 * Molecular TCR component: The interactive cursor/target floating pill.
 *
 * Implements:
 * 1. Red Pill: Drag-to-Move Cursor (moves text caret).
 * 2. Worker Pills (Blue/Green): Elastic Drag-to-Pause (20dp) & Tear-to-Abort (80dp)
 *    with Spring & Freeze paused controls ([▶ Jatka] / [✕ Peru]).
 * 3. Gestures: Tap for Happenings HUD, Double-tap for Transcript Drawer.
 */
@Composable
fun FloatingActorPill(
    config: ActorPillConfig,
    status: ActorPillStatus,
    onSingleClick: () -> Unit,
    onDoubleClick: () -> Unit,
    modifier: Modifier = Modifier,
    onDragCursor: ((dragDelta: Offset) -> Unit)? = null,
    onPauseStaging: (() -> Unit)? = null,
    onResumeStaging: (() -> Unit)? = null,
    onAbortStaging: (() -> Unit)? = null
) {
    val pillColor = Color(config.colorArgb)
    val isPulsing = status is ActorPillStatus.WaitingAmbient
    val density = LocalDensity.current

    // Elastic drag state for worker pills during CadenceStaging
    var rawDragOffset by remember { mutableStateOf(Offset.Zero) }
    var isDragging by remember { mutableStateOf(false) }

    val pauseThresholdPx = with(density) { 20.dp.toPx() }
    val abortThresholdPx = with(density) { 80.dp.toPx() }

    // Animated spring return when released in pause zone (Spring & Freeze)
    val springTarget = if (isDragging) rawDragOffset * 0.45f else Offset.Zero
    val animatedOffset by animateOffsetAsState(
        targetValue = springTarget,
        animationSpec = spring(dampingRatio = 0.6f, stiffness = 400f),
        label = "elasticOffset"
    )

    val activeGlyph = when (status) {
        is ActorPillStatus.CadenceStaging -> status.glyph
        is ActorPillStatus.WorkingOnTarget -> status.glyph
        is ActorPillStatus.CommitFlash -> GlyphType.CHECK
        is ActorPillStatus.Disambiguation -> GlyphType.QUESTION
        is ActorPillStatus.HoldingSelection -> GlyphType.SELECTION
        else -> config.defaultGlyph
    }

    // Pointer input configuration depending on pill role & state
    val dragModifier = if (config.role == ActorRole.ORCHESTRATOR_DICTATION && onDragCursor != null) {
        // Red Pill: Dragging always relocates the text cursor
        Modifier.pointerInput(Unit) {
            detectDragGestures { change, dragAmount ->
                change.consume()
                onDragCursor(dragAmount)
            }
        }
    } else if (status is ActorPillStatus.CadenceStaging) {
        // Worker Pill (Blue/Green): Elastic drag-to-pause and tear-to-abort
        Modifier.pointerInput(Unit) {
            detectDragGestures(
                onDragStart = {
                    isDragging = true
                    rawDragOffset = Offset.Zero
                },
                onDragEnd = {
                    isDragging = false
                    rawDragOffset = Offset.Zero
                },
                onDragCancel = {
                    isDragging = false
                    rawDragOffset = Offset.Zero
                },
                onDrag = { change, dragAmount ->
                    change.consume()
                    rawDragOffset += dragAmount
                    val dist = rawDragOffset.getDistance()

                    if (dist >= abortThresholdPx) {
                        // Exceeded 80dp: Tear-to-Abort
                        isDragging = false
                        rawDragOffset = Offset.Zero
                        onAbortStaging?.invoke()
                    } else if (dist >= pauseThresholdPx) {
                        // Exceeded 20dp: Pause countdown (Spring & Freeze)
                        onPauseStaging?.invoke()
                    }
                }
            )
        }
    } else {
        Modifier
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .offset {
                IntOffset(
                    animatedOffset.x.roundToInt(),
                    animatedOffset.y.roundToInt()
                )
            }
            .then(dragModifier)
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { onSingleClick() },
                    onDoubleTap = { onDoubleClick() }
                )
            }
    ) {
        ActorPillBadge(
            backgroundColor = pillColor,
            isPulsing = isPulsing
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(24.dp)
            ) {
                // Radial Countdown Ring during Cadence Staging or indeterminate/determinate WorkingGeneric
                if (status is ActorPillStatus.CadenceStaging) {
                    RadialCountdownRing(
                        progress = status.progress,
                        ringColor = Color.White,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                } else if (status is ActorPillStatus.WorkingGeneric) {
                    RadialCountdownRing(
                        progress = status.progress,
                        ringColor = Color.White,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                }

                ActionGlyph(
                    glyphType = activeGlyph,
                    tint = Color.White,
                    modifier = Modifier.size(14.dp)
                )
            }

            // Holding selection badge, staging label, or working status message
            when (status) {
                is ActorPillStatus.HoldingSelection -> {
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${status.wordCount} sanaa",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                is ActorPillStatus.CadenceStaging -> {
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (status.isPaused) "Tauko: ${status.actionDescription}" else status.actionDescription,
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
                is ActorPillStatus.WorkingGeneric -> {
                    status.statusMessage?.let { msg ->
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = msg,
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                else -> {
                    // Micro label for pill identity if needed
                }
            }
        }

        // Pointer Beak when locked onto a target
        if (status is ActorPillStatus.WorkingOnTarget || status is ActorPillStatus.CadenceStaging) {
            androidx.compose.foundation.Canvas(
                modifier = Modifier.size(width = 8.dp, height = 4.dp)
            ) {
                val path = androidx.compose.ui.graphics.Path().apply {
                    moveTo(0f, 0f)
                    lineTo(size.width, 0f)
                    lineTo(size.width / 2f, size.height)
                    close()
                }
                drawPath(path = path, color = pillColor)
            }
        }

        // Spring & Freeze Paused Controls: [▶ Jatka] [✕ Peru]
        if (status is ActorPillStatus.CadenceStaging && status.isPaused) {
            Row(
                modifier = Modifier
                    .padding(top = 4.dp)
                    .background(
                        color = Color.Black.copy(alpha = 0.75f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = "▶ Jatka",
                    color = Color(0xFF4ADE80),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clickable { onResumeStaging?.invoke() }
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "✕ Peru",
                    color = Color(0xFFF87171),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clickable { onAbortStaging?.invoke() }
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                )
            }
        }
    }
}
