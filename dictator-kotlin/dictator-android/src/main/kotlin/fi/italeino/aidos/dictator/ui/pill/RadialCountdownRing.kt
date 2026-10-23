package fi.italeino.aidos.dictator.ui.pill

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Atomic TCR component: Radial countdown ring.
 * Visualizes the human-friendly cadence fuse before committing actions,
 * or an indeterminate rotating orbital arc signal when working without a known duration.
 * "Work, as a concept, requires time."
 *
 * @param progress Value from 1.0 down to 0.0, or null for indeterminate rotating orbital arc
 * @param ringColor Color of the active draining or rotating arc
 * @param trackColor Color of the background ring track
 * @param strokeWidth Width of the ring outline
 */
@Composable
fun RadialCountdownRing(
    progress: Float?,
    ringColor: Color,
    modifier: Modifier = Modifier,
    trackColor: Color = ringColor.copy(alpha = 0.25f),
    strokeWidth: Dp = 2.5.dp
) {
    val infiniteTransition = rememberInfiniteTransition(label = "RadialCountdownRingIndeterminate")
    val rotationAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "orbitalRotation"
    )

    Canvas(modifier = modifier) {
        val stroke = Stroke(width = strokeWidth.toPx(), cap = StrokeCap.Round)
        val diameter = size.minDimension - stroke.width
        val topLeft = Offset(
            (size.width - diameter) / 2f,
            (size.height - diameter) / 2f
        )
        val arcSize = Size(diameter, diameter)

        // Background circular track
        drawArc(
            color = trackColor,
            startAngle = 0f,
            sweepAngle = 360f,
            useCenter = false,
            topLeft = topLeft,
            size = arcSize,
            style = stroke
        )

        if (progress == null) {
            // Indeterminate rotating orbital arc (radar sweep)
            drawArc(
                color = ringColor,
                startAngle = rotationAngle - 90f,
                sweepAngle = 90f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = stroke
            )
        } else if (progress > 0.001f) {
            // Draining progress arc (starts at 12 o'clock: -90 degrees)
            val sweep = (progress.coerceIn(0f, 1f)) * 360f
            drawArc(
                color = ringColor,
                startAngle = -90f,
                sweepAngle = sweep,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = stroke
            )
        }
    }
}
