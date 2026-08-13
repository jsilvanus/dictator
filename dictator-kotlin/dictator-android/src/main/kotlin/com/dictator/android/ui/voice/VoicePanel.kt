package com.dictator.android.ui.voice

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicNone
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.layout.width
import androidx.compose.ui.unit.dp
import com.dictator.android.R

@Composable
fun VoicePanel(
    viewModel: VoiceViewModel = viewModel(),
    onTextInserted: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.state.collectAsState()

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = stringResource(R.string.voice_input),
                style = MaterialTheme.typography.titleMedium
            )

            when (state.state) {
                VoiceState.IDLE -> IdleState(viewModel)
                VoiceState.LISTENING -> ListeningState(viewModel, state)
                VoiceState.PROCESSING -> ProcessingState()
                VoiceState.ERROR -> ErrorState(state, viewModel)
                VoiceState.SUCCESS -> SuccessState(state, viewModel, onTextInserted)
            }
        }
    }
}

@Composable
private fun IdleState(viewModel: VoiceViewModel) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .background(MaterialTheme.colorScheme.primaryContainer, CircleShape)
                .clickable { viewModel.startListening() },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Filled.MicNone,
                contentDescription = stringResource(R.string.start_listening),
                modifier = Modifier.size(36.dp),
                tint = MaterialTheme.colorScheme.primary
            )
        }
        Text(
            text = stringResource(R.string.start_listening),
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun ListeningState(viewModel: VoiceViewModel, state: VoiceUiState) {
    val infiniteTransition = rememberInfiniteTransition(label = "waveform")
    val pulse by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.5f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing)
        ),
        label = "pulse"
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .background(
                    MaterialTheme.colorScheme.errorContainer,
                    CircleShape
                )
                .clickable { viewModel.stopListening() },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Filled.Mic,
                contentDescription = stringResource(R.string.stop_listening),
                modifier = Modifier.size(36.dp),
                tint = MaterialTheme.colorScheme.error
            )
        }
        Text(
            text = stringResource(R.string.recording),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.error
        )

        // IMPROVEMENT: Recording duration feedback
        val durationSeconds = (state.recordingDuration / 1000).toInt()
        val maxSeconds = 30
        Text(
            text = "$durationSeconds / $maxSeconds seconds",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        LinearProgressIndicator(
            progress = (state.recordingDuration / 30000f).coerceIn(0f, 1f),
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
        )

        // IMPROVEMENT: Silence detection feedback
        if (state.silenceDuration > 0L) {
            Text(
                text = "Silence detected (${(state.silenceDuration / 1000)}s)",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.warning
            )
        }

        // Waveform animation
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(32.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            repeat(5) {
                Box(
                    modifier = Modifier
                        .width(4.dp)
                        .height((8 + it * 4 * pulse).dp)
                        .background(MaterialTheme.colorScheme.primary)
                        .padding(horizontal = 2.dp)
                )
            }
        }
    }
}

@Composable
private fun ProcessingState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        CircularProgressIndicator(modifier = Modifier.size(48.dp))
        Text(
            text = "Processing...",
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun ErrorState(state: VoiceUiState, viewModel: VoiceViewModel) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = state.errorMessage ?: "An error occurred",
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.labelSmall,
            textAlign = TextAlign.Center
        )
        OutlinedButton(onClick = viewModel::retry) {
            Text(stringResource(R.string.voice_retry))
        }
    }
}

@Composable
private fun SuccessState(
    state: VoiceUiState,
    viewModel: VoiceViewModel,
    onTextInserted: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = state.transcribedText,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.shapes.small)
                .padding(12.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.voice_confidence, (state.confidence * 100).toInt()),
                style = MaterialTheme.typography.labelSmall
            )
            LinearProgressIndicator(
                progress = state.confidence,
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 8.dp)
                    .height(4.dp)
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = viewModel::clearTranscription,
                modifier = Modifier.weight(1f)
            ) {
                Text(stringResource(R.string.voice_clear))
            }
            Button(
                onClick = { onTextInserted(state.transcribedText) },
                modifier = Modifier.weight(1f)
            ) {
                Text("Insert")
            }
        }
    }
}
// Helper for width composable - removed due to Compose import conflict
