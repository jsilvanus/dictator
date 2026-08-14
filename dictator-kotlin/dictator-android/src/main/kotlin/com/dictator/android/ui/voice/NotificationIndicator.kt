package com.dictator.android.ui.voice

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

enum class VoiceIndicatorState {
    IDLE, LISTENING, COMMAND_RECOGNIZED, AI_RECOGNIZED, ERROR
}

data class VoiceIndicatorSettings(
    val enabled: Boolean = true,
    val listeningColor: Color = Color(0xFF0066FF), // Blue
    val commandRecognizedColor: Color = Color(0xFF00CC00), // Green
    val aiRecognizedColor: Color = Color(0xFFFFAA00), // Orange
    val errorColor: Color = Color(0xFFFF0000), // Red
    val animationIntensity: AnimationIntensity = AnimationIntensity.MEDIUM
)

enum class AnimationIntensity {
    LOW, MEDIUM, HIGH
}

@Composable
fun NotificationIndicator(
    state: VoiceIndicatorState,
    settings: VoiceIndicatorSettings = VoiceIndicatorSettings(),
    modifier: Modifier = Modifier,
    size: IndicatorSize = IndicatorSize.MEDIUM
) {
    if (!settings.enabled || state == VoiceIndicatorState.IDLE) {
        return
    }

    val infiniteTransition = rememberInfiniteTransition(label = "notification_light")
    
    val animationDurationMs = when (settings.animationIntensity) {
        AnimationIntensity.LOW -> 3000
        AnimationIntensity.MEDIUM -> 2000
        AnimationIntensity.HIGH -> 1000
    }

    val opacity by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = when (settings.animationIntensity) {
            AnimationIntensity.LOW -> 0.5f
            AnimationIntensity.MEDIUM -> 0.7f
            AnimationIntensity.HIGH -> 0.4f
        },
        animationSpec = infiniteRepeatable(
            animation = tween(animationDurationMs, easing = LinearEasing)
        ),
        label = "notification_light_opacity"
    )

    val color = when (state) {
        VoiceIndicatorState.LISTENING -> settings.listeningColor
        VoiceIndicatorState.COMMAND_RECOGNIZED -> settings.commandRecognizedColor
        VoiceIndicatorState.AI_RECOGNIZED -> settings.aiRecognizedColor
        VoiceIndicatorState.ERROR -> settings.errorColor
        VoiceIndicatorState.IDLE -> return
    }

    val sizeValue = when (size) {
        IndicatorSize.SMALL -> 12.dp
        IndicatorSize.MEDIUM -> 16.dp
        IndicatorSize.LARGE -> 24.dp
    }

    Box(
        modifier = modifier
            .size(sizeValue)
            .background(
                color = color.copy(alpha = opacity),
                shape = CircleShape
            )
    )
}

enum class IndicatorSize {
    SMALL, MEDIUM, LARGE
}
