package fi.italeino.aidos.dictator.ui.pill

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dictator.core.actor.ActorPillConfig
import com.dictator.core.actor.ActorPillStatus
import com.dictator.core.actor.ActorRole

/**
 * Visual styling tokens for an Actor Pill, resolved from actor role,
 * configured colors, active theme (light/dark), and execution status.
 *
 * Implements:
 * 1. Ember (Cursor Actor): Warm coral/vermilion surface with restrained shadow,
 *    subtle highlight, and soft ambient halo.
 * 2. Orbit (Worker Actors): Theme-adaptive surface:
 *    - Light theme: dark graphite/charcoal capsule with light glyphs and restrained shadow.
 *    - Dark theme: warm neutral/off-white capsule with dark glyphs and subtle outline.
 *    - Actor identity colors (blue, green, custom) are preserved as accent indicator pips
 *      and countdown rings.
 */
data class PillVisualTokens(
    val isEmber: Boolean,
    val surfaceBrush: Brush,
    val borderStroke: BorderStroke,
    val contentColor: Color,
    val actorAccentColor: Color,
    val pipColor: Color,
    val haloColor: Color,
    val elevation: Dp,
    val shadowAmbientColor: Color,
    val shadowSpotColor: Color,
    val beakColor: Color,
    val ringTrackColor: Color
) {
    companion object {
        // Ember (Cursor Actor) Color Tokens
        val EmberCoral = Color(0xFFFF5C4D)
        val EmberCoralTop = Color(0xFFFF7465)
        val EmberCoralBottom = Color(0xFFE54738)
        val EmberPip = Color(0xFFFFDDD7)
        val EmberDarkBorder = Color.White.copy(alpha = 0.28f)
        val EmberLightBorder = Color(0xFFCC3324).copy(alpha = 0.35f)

        // Orbit (Worker Actor) Dark Theme Tokens (Surface is light neutral contrasting with dark editor)
        val OrbitDarkSurfaceTop = Color(0xFFECEEF2)
        val OrbitDarkSurfaceBottom = Color(0xFFDFE2E6)
        val OrbitDarkContent = Color(0xFF181B20)
        val OrbitDarkBorder = Color(0xFF181B20).copy(alpha = 0.15f)

        // Orbit (Worker Actor) Light Theme Tokens (Surface is dark charcoal contrasting with light editor)
        val OrbitLightSurfaceTop = Color(0xFF2C323B)
        val OrbitLightSurfaceBottom = Color(0xFF1E232A)
        val OrbitLightContent = Color(0xFFF2F4F7)
        val OrbitLightBorder = Color.White.copy(alpha = 0.14f)

        // Status Accent Tokens
        val PausedAmber = Color(0xFFF59E0B)

        fun resolve(
            config: ActorPillConfig,
            status: ActorPillStatus,
            isDarkTheme: Boolean,
            isDragging: Boolean = false
        ): PillVisualTokens {
            val isEmber = config.role == ActorRole.ORCHESTRATOR_DICTATION
            val isPaused = status is ActorPillStatus.CadenceStaging && status.isPaused
            val configuredColor = Color(config.colorArgb)

            if (isEmber) {
                // Ember: Warm Coral / Vermilion Identity
                val (topColor, bottomColor) = if (config.colorArgb == ActorPillConfig.DEFAULT_RED_ORCHESTRATOR) {
                    EmberCoralTop to EmberCoralBottom
                } else {
                    // Respect user-customized color with subtle tonal depth
                    configuredColor to configuredColor
                }

                val border = if (isDarkTheme) {
                    BorderStroke(0.75.dp, EmberDarkBorder)
                } else {
                    BorderStroke(0.75.dp, EmberLightBorder)
                }

                val halo = if (isDarkTheme) {
                    EmberCoral.copy(alpha = 0.28f)
                } else {
                    EmberCoral.copy(alpha = 0.18f)
                }

                val elevation = if (isDragging) 6.dp else 2.dp
                val shadowAmbient = if (isDarkTheme) {
                    Color.Black.copy(alpha = 0.35f)
                } else {
                    Color(0xFF260502).copy(alpha = 0.18f)
                }
                val shadowSpot = if (isDarkTheme) {
                    EmberCoral.copy(alpha = 0.25f)
                } else {
                    Color(0xFF260502).copy(alpha = 0.28f)
                }

                val pip = if (isPaused) PausedAmber else EmberPip

                return PillVisualTokens(
                    isEmber = true,
                    surfaceBrush = Brush.verticalGradient(listOf(topColor, bottomColor)),
                    borderStroke = border,
                    contentColor = Color(0xFFFFF7F5),
                    actorAccentColor = EmberCoral,
                    pipColor = pip,
                    haloColor = halo,
                    elevation = elevation,
                    shadowAmbientColor = shadowAmbient,
                    shadowSpotColor = shadowSpot,
                    beakColor = bottomColor,
                    ringTrackColor = Color.White.copy(alpha = 0.25f)
                )
            } else {
                // Orbit: Theme-Adaptive Surface
                // Light theme -> Dark charcoal surface; Dark theme -> Light neutral surface
                val actorAccent = configuredColor
                val pip = if (isPaused) PausedAmber else actorAccent
                val elevation = if (isDragging) 6.dp else 2.dp

                if (isDarkTheme) {
                    // Dark Theme: Warm grey / off-white capsule contrasting against dark background
                    return PillVisualTokens(
                        isEmber = false,
                        surfaceBrush = Brush.verticalGradient(listOf(OrbitDarkSurfaceTop, OrbitDarkSurfaceBottom)),
                        borderStroke = BorderStroke(0.75.dp, OrbitDarkBorder),
                        contentColor = OrbitDarkContent,
                        actorAccentColor = actorAccent,
                        pipColor = pip,
                        haloColor = actorAccent.copy(alpha = 0.22f),
                        elevation = elevation,
                        shadowAmbientColor = Color.Black.copy(alpha = 0.40f),
                        shadowSpotColor = Color.Black.copy(alpha = 0.25f),
                        beakColor = OrbitDarkSurfaceBottom,
                        ringTrackColor = OrbitDarkContent.copy(alpha = 0.15f)
                    )
                } else {
                    // Light Theme: Dark graphite / charcoal capsule contrasting against light document
                    return PillVisualTokens(
                        isEmber = false,
                        surfaceBrush = Brush.verticalGradient(listOf(OrbitLightSurfaceTop, OrbitLightSurfaceBottom)),
                        borderStroke = BorderStroke(0.75.dp, OrbitLightBorder),
                        contentColor = OrbitLightContent,
                        actorAccentColor = actorAccent,
                        pipColor = pip,
                        haloColor = actorAccent.copy(alpha = 0.20f),
                        elevation = elevation,
                        shadowAmbientColor = Color.Black.copy(alpha = 0.22f),
                        shadowSpotColor = Color.Black.copy(alpha = 0.28f),
                        beakColor = OrbitLightSurfaceBottom,
                        ringTrackColor = OrbitLightContent.copy(alpha = 0.20f)
                    )
                }
            }
        }
    }
}

/**
 * Polished, compact capsule container for Actor Pills.
 * Implements restrained shadows, subtle highlights, ambient halos, and purposeful motion.
 */
@Composable
fun ActorPillCapsule(
    tokens: PillVisualTokens,
    modifier: Modifier = Modifier,
    isPulsing: Boolean = false,
    isCommitFlash: Boolean = false,
    isDisambiguation: Boolean = false,
    content: @Composable () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "PillAmbientTransition")

    // Slow, subtle ambient breathing halo during WaitingAmbient
    val haloAlpha by if (isPulsing) {
        infiniteTransition.animateFloat(
            initialValue = 0.12f,
            targetValue = 0.32f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 2200, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "haloAlpha"
        )
    } else {
        remember { mutableFloatStateOf(0f) }
    }

    val haloScale by if (isPulsing) {
        infiniteTransition.animateFloat(
            initialValue = 1.04f,
            targetValue = 1.18f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 2200, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "haloScale"
        )
    } else {
        remember { mutableFloatStateOf(1f) }
    }

    // Subtle gentle rocking wobble for Disambiguation
    val wobbleRotation by if (isDisambiguation) {
        infiniteTransition.animateFloat(
            initialValue = -3f,
            targetValue = 3f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 350, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "wobbleRotation"
        )
    } else {
        remember { mutableFloatStateOf(0f) }
    }

    // Momentary crisp snap feedback for CommitFlash
    val flashScale = if (isCommitFlash) 1.06f else 1.0f

    Box(
        modifier = modifier
            .rotate(wobbleRotation)
            .scale(flashScale),
        contentAlignment = Alignment.Center
    ) {
        // Soft ambient halo behind Ember cursor actor when waiting
        if (isPulsing && tokens.isEmber) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .scale(haloScale)
                    .alpha(haloAlpha)
                    .background(
                        color = tokens.haloColor,
                        shape = CircleShape
                    )
            )
        }

        // Visible capsule surface
        Box(
            modifier = Modifier
                .shadow(
                    elevation = tokens.elevation,
                    shape = CircleShape,
                    ambientColor = tokens.shadowAmbientColor,
                    spotColor = tokens.shadowSpotColor
                )
                .background(
                    brush = tokens.surfaceBrush,
                    shape = CircleShape
                )
                .border(
                    border = tokens.borderStroke,
                    shape = CircleShape
                )
                .padding(horizontal = 6.dp, vertical = 2.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                content()
            }
        }
    }
}

/**
 * Backward-compatible ActorPillBadge adapter.
 * Wraps the redesigned ActorPillCapsule with custom background colors.
 */
@Composable
fun ActorPillBadge(
    backgroundColor: Color,
    modifier: Modifier = Modifier,
    isPulsing: Boolean = false,
    content: @Composable () -> Unit
) {
    val isDark = backgroundColor.luminance() < 0.5f
    val tokens = PillVisualTokens(
        isEmber = false,
        surfaceBrush = Brush.verticalGradient(listOf(backgroundColor, backgroundColor)),
        borderStroke = BorderStroke(
            0.75.dp,
            if (isDark) Color.White.copy(alpha = 0.15f) else Color.Black.copy(alpha = 0.15f)
        ),
        contentColor = if (isDark) Color.White else Color.Black,
        actorAccentColor = backgroundColor,
        pipColor = backgroundColor,
        haloColor = backgroundColor.copy(alpha = 0.20f),
        elevation = 2.dp,
        shadowAmbientColor = Color.Black.copy(alpha = 0.25f),
        shadowSpotColor = Color.Black.copy(alpha = 0.25f),
        beakColor = backgroundColor,
        ringTrackColor = Color.White.copy(alpha = 0.25f)
    )

    ActorPillCapsule(
        tokens = tokens,
        isPulsing = isPulsing,
        modifier = modifier,
        content = content
    )
}
