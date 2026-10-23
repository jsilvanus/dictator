package fi.italeino.aidos.dictator.ui.pill

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.animateOffsetAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dictator.core.actor.ActorPillConfig
import com.dictator.core.actor.ActorPillStatus
import com.dictator.core.actor.ActorRole
import com.dictator.core.actor.GlyphType
import com.dictator.core.actor.TextRangeBounds
import fi.italeino.aidos.dictator.ui.theme.DictatorTheme
import kotlin.math.roundToInt

/**
 * Molecular TCR component: Redesigned interactive floating AI actor pill.
 *
 * Visual System:
 * - Ember (Cursor Actor): Warm coral/vermilion capsule with subtle highlight, restrained shadow,
 *   soft ambient halo, and luminous inset pip. Follows caret with smooth spring feedback.
 * - Orbit (Worker Actors): Theme-adaptive capsule (dark charcoal in light mode, warm neutral in dark mode)
 *   with actor-coded accent pips (blue/green/custom) and radial countdown rings.
 *
 * Touch & Accessibility:
 * - Ultra-compact visible capsule (~24-28dp width, ~14-16dp height at rest) centered inside a
 *   generous 48dp minimum interactive touch target.
 *
 * Gestures & Functional Behavior:
 * 1. Ember: Drag-to-Move Cursor (relocates text caret with elevation boost & scale feedback).
 * 2. Orbit: Elastic Drag-to-Pause (20dp) & Tear-to-Abort (80dp) with Spring & Freeze controls.
 * 3. Tap: Happenings HUD; Double-tap: Transcript Drawer.
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
    onAbortStaging: (() -> Unit)? = null,
    isDarkTheme: Boolean = MaterialTheme.colorScheme.surface.luminance() < 0.5f
) {
    val density = LocalDensity.current

    // Drag states
    var isCursorDragging by remember { mutableStateOf(false) }
    var isWorkerDragging by remember { mutableStateOf(false) }
    var rawDragOffset by remember { mutableStateOf(Offset.Zero) }

    val isDragging = isCursorDragging || isWorkerDragging

    val pauseThresholdPx = with(density) { 20.dp.toPx() }
    val abortThresholdPx = with(density) { 80.dp.toPx() }

    // Animated spring return when released in pause zone (Spring & Freeze)
    val springTarget = if (isWorkerDragging) rawDragOffset * 0.45f else Offset.Zero
    val animatedOffset by animateOffsetAsState(
        targetValue = springTarget,
        animationSpec = spring(dampingRatio = 0.6f, stiffness = 400f),
        label = "elasticOffset"
    )

    // Tactile scale feedback during dragging
    val dragScale by animateFloatAsState(
        targetValue = if (isDragging) 1.08f else 1.0f,
        animationSpec = spring(dampingRatio = 0.65f, stiffness = 450f),
        label = "dragScale"
    )

    // Status checks
    val isPulsing = status is ActorPillStatus.WaitingAmbient
    val isCommitFlash = status is ActorPillStatus.CommitFlash
    val isDisambiguation = status is ActorPillStatus.Disambiguation
    val isPaused = status is ActorPillStatus.CadenceStaging && status.isPaused

    // Visual Tokens Resolution (Ember vs Orbit, theme adaptation, status-driven)
    val tokens = PillVisualTokens.resolve(
        config = config,
        status = status,
        isDarkTheme = isDarkTheme,
        isDragging = isDragging
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
        // Ember (Cursor Actor): Dragging relocates text cursor with responsive tactile feedback
        Modifier.pointerInput(Unit) {
            detectDragGestures(
                onDragStart = { isCursorDragging = true },
                onDragEnd = { isCursorDragging = false },
                onDragCancel = { isCursorDragging = false },
                onDrag = { change, dragAmount ->
                    change.consume()
                    onDragCursor(dragAmount)
                }
            )
        }
    } else if (status is ActorPillStatus.CadenceStaging) {
        // Orbit (Worker Actor): Elastic drag-to-pause (20dp) & tear-to-abort (80dp)
        Modifier.pointerInput(Unit) {
            detectDragGestures(
                onDragStart = {
                    isWorkerDragging = true
                    rawDragOffset = Offset.Zero
                },
                onDragEnd = {
                    isWorkerDragging = false
                    rawDragOffset = Offset.Zero
                },
                onDragCancel = {
                    isWorkerDragging = false
                    rawDragOffset = Offset.Zero
                },
                onDrag = { change, dragAmount ->
                    change.consume()
                    rawDragOffset += dragAmount
                    val dist = rawDragOffset.getDistance()

                    if (dist >= abortThresholdPx) {
                        // Exceeded 80dp: Tear-to-Abort
                        isWorkerDragging = false
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

    // Interactive container: provides a generous 48dp minimum touch target
    // while centering the compact visible pill capsule.
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .offset {
                IntOffset(
                    animatedOffset.x.roundToInt(),
                    animatedOffset.y.roundToInt()
                )
            }
            .sizeIn(minWidth = 48.dp, minHeight = 48.dp)
            .then(dragModifier)
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { onSingleClick() },
                    onDoubleTap = { onDoubleClick() }
                )
            }
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.scale(dragScale)
        ) {
            ActorPillCapsule(
                tokens = tokens,
                isPulsing = isPulsing,
                isCommitFlash = isCommitFlash,
                isDisambiguation = isDisambiguation
            ) {
                // Micro Glyph / Radial Countdown Ring Container
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(14.dp)
                ) {
                    if (status is ActorPillStatus.CadenceStaging) {
                        RadialCountdownRing(
                            progress = status.progress,
                            ringColor = if (tokens.isEmber) Color.White else tokens.actorAccentColor,
                            trackColor = tokens.ringTrackColor,
                            modifier = Modifier.size(14.dp),
                            strokeWidth = 1.5.dp
                        )
                    } else if (status is ActorPillStatus.WorkingGeneric) {
                        RadialCountdownRing(
                            progress = status.progress,
                            ringColor = if (tokens.isEmber) Color.White else tokens.actorAccentColor,
                            trackColor = tokens.ringTrackColor,
                            modifier = Modifier.size(14.dp),
                            strokeWidth = 1.5.dp
                        )
                    }

                    ActionGlyph(
                        glyphType = activeGlyph,
                        tint = tokens.contentColor,
                        modifier = Modifier.size(9.dp)
                    )
                }

                // Small Inset Indicator Pip
                Spacer(modifier = Modifier.width(3.5.dp))
                ActorPillPip(
                    color = tokens.pipColor,
                    isPulsing = isPulsing && !tokens.isEmber
                )

                // Status text / badge information (holding selection, staging, working)
                when (status) {
                    is ActorPillStatus.HoldingSelection -> {
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${status.wordCount} sanaa",
                            color = tokens.contentColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    is ActorPillStatus.CadenceStaging -> {
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (status.isPaused) "Tauko: ${status.actionDescription}" else status.actionDescription,
                            color = tokens.contentColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    is ActorPillStatus.WorkingGeneric -> {
                        status.statusMessage?.let { msg ->
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = msg,
                                color = tokens.contentColor,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    else -> Unit
                }
            }

            // Directional pointer beak when locked onto a text target
            if (status is ActorPillStatus.WorkingOnTarget || status is ActorPillStatus.CadenceStaging) {
                Canvas(
                    modifier = Modifier.size(width = 8.dp, height = 4.dp)
                ) {
                    val path = Path().apply {
                        moveTo(0f, 0f)
                        lineTo(size.width, 0f)
                        lineTo(size.width / 2f, size.height)
                        close()
                    }
                    drawPath(path = path, color = tokens.beakColor)
                }
            }

            // Spring & Freeze Paused Controls: [▶ Jatka] [✕ Peru]
            if (status is ActorPillStatus.CadenceStaging && status.isPaused) {
                Row(
                    modifier = Modifier
                        .padding(top = 4.dp)
                        .background(
                            color = if (isDarkTheme) Color(0xFF1F242D).copy(alpha = 0.94f) else Color(0xFF2B303A).copy(alpha = 0.94f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .border(
                            width = 0.5.dp,
                            color = Color.White.copy(alpha = 0.15f),
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
}

/**
 * Small inset indicator pip inside the pill capsule.
 * Gives the pill distinct AI character and pulses gently during ambient waiting.
 */
@Composable
fun ActorPillPip(
    color: Color,
    isPulsing: Boolean,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "PipPulse")
    val pipAlpha by if (isPulsing) {
        infiniteTransition.animateFloat(
            initialValue = 0.45f,
            targetValue = 1.0f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 1800, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "pipAlpha"
        )
    } else {
        remember { mutableFloatStateOf(1.0f) }
    }

    Box(
        modifier = modifier
            .size(3.5.dp)
            .alpha(pipAlpha)
            .background(color = color, shape = CircleShape)
    )
}

// -----------------------------------------------------------------------------
// Compose Previews (Theme & Status Verification)
// -----------------------------------------------------------------------------

@Preview(name = "Ember Cursor - Dark Theme", showBackground = true, backgroundColor = 0xFF0F1419)
@Composable
fun PreviewEmberDark() {
    DictatorTheme(darkTheme = true) {
        FloatingActorPill(
            config = ActorPillConfig.createDefaultOrchestrator(),
            status = ActorPillStatus.WaitingAmbient,
            onSingleClick = {},
            onDoubleClick = {}
        )
    }
}

@Preview(name = "Ember Cursor - Light Theme", showBackground = true, backgroundColor = 0xFFFBFBFB)
@Composable
fun PreviewEmberLight() {
    DictatorTheme(darkTheme = false) {
        FloatingActorPill(
            config = ActorPillConfig.createDefaultOrchestrator(),
            status = ActorPillStatus.WaitingAmbient,
            onSingleClick = {},
            onDoubleClick = {}
        )
    }
}

@Preview(name = "Orbit Editor - Light Theme", showBackground = true, backgroundColor = 0xFFFBFBFB)
@Composable
fun PreviewOrbitEditorLight() {
    DictatorTheme(darkTheme = false) {
        FloatingActorPill(
            config = ActorPillConfig.createDefaultEditor(),
            status = ActorPillStatus.CadenceStaging(
                targetRange = TextRangeBounds(0, 10),
                durationMs = 900,
                remainingMs = 450,
                progress = 0.5f,
                actionDescription = "Poista sana",
                glyph = GlyphType.DELETE
            ),
            onSingleClick = {},
            onDoubleClick = {}
        )
    }
}

@Preview(name = "Orbit Editor - Dark Theme", showBackground = true, backgroundColor = 0xFF0F1419)
@Composable
fun PreviewOrbitEditorDark() {
    DictatorTheme(darkTheme = true) {
        FloatingActorPill(
            config = ActorPillConfig.createDefaultEditor(),
            status = ActorPillStatus.CadenceStaging(
                targetRange = TextRangeBounds(0, 10),
                durationMs = 900,
                remainingMs = 450,
                progress = 0.5f,
                actionDescription = "Poista sana",
                glyph = GlyphType.DELETE
            ),
            onSingleClick = {},
            onDoubleClick = {}
        )
    }
}

@Preview(name = "Orbit AI - Dark Theme Paused", showBackground = true, backgroundColor = 0xFF0F1419)
@Composable
fun PreviewOrbitAiDarkPaused() {
    DictatorTheme(darkTheme = true) {
        FloatingActorPill(
            config = ActorPillConfig.createDefaultAi(),
            status = ActorPillStatus.CadenceStaging(
                targetRange = TextRangeBounds(0, 10),
                durationMs = 900,
                remainingMs = 450,
                progress = 0.5f,
                actionDescription = "Kirjoita teksti",
                glyph = GlyphType.SPARK,
                isPaused = true
            ),
            onSingleClick = {},
            onDoubleClick = {}
        )
    }
}

@Preview(name = "Orbit Editor - Holding Selection", showBackground = true, backgroundColor = 0xFFFBFBFB)
@Composable
fun PreviewOrbitEditorHoldingSelection() {
    DictatorTheme(darkTheme = false) {
        FloatingActorPill(
            config = ActorPillConfig.createDefaultEditor(),
            status = ActorPillStatus.HoldingSelection(
                selectedRange = TextRangeBounds(0, 25),
                wordCount = 4
            ),
            onSingleClick = {},
            onDoubleClick = {}
        )
    }
}
