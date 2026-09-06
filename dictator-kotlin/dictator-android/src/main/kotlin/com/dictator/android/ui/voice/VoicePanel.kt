package com.dictator.android.ui.voice

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicNone
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.dictator.android.R

@Composable
fun VoicePanel(
    viewModel: VoiceViewModel = viewModel(),
    onTextInserted: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        viewModel.setPermissionGranted(granted)
        if (granted) viewModel.startListening()
    }

    LaunchedEffect(Unit) {
        viewModel.setPermissionGranted(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED
        )
    }

    val indicatorState = when (state.state) {
        VoiceState.IDLE -> VoiceIndicatorState.IDLE
        VoiceState.LISTENING -> VoiceIndicatorState.LISTENING
        VoiceState.PROCESSING -> VoiceIndicatorState.COMMAND_RECOGNIZED
        VoiceState.ERROR -> VoiceIndicatorState.ERROR
        VoiceState.SUCCESS -> VoiceIndicatorState.IDLE
    }

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
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                NotificationIndicator(
                    state = indicatorState,
                    settings = VoiceIndicatorSettings(),
                    size = IndicatorSize.SMALL,
                    modifier = Modifier.padding(end = 8.dp)
                )
                Text(
                    text = stringResource(R.string.voice_input),
                    style = MaterialTheme.typography.titleMedium
                )
            }

            when (state.state) {
                VoiceState.IDLE -> IdleState(
                    viewModel = viewModel,
                    onRequestPermission = {
                        permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    }
                )
                VoiceState.LISTENING -> ListeningState(viewModel, state)
                VoiceState.PROCESSING -> ProcessingState()
                VoiceState.ERROR -> ErrorState(state, viewModel)
                VoiceState.SUCCESS -> SuccessState(state, viewModel, onTextInserted)
            }
        }
    }
}

@Composable
private fun IdleState(
    viewModel: VoiceViewModel,
    onRequestPermission: () -> Unit
) {
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
                .clickable {
                    if (viewModel.state.value.isPermissionGranted) {
                        viewModel.startListening()
                    } else {
                        onRequestPermission()
                    }
                },
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
            text = if (viewModel.state.value.isPermissionGranted) {
                stringResource(R.string.start_listening)
            } else {
                "Allow microphone access"
            },
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
                .background(MaterialTheme.colorScheme.errorContainer, CircleShape)
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

        Text(
            text = "${(state.recordingDuration / 1000).toInt()} / 30 seconds",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        LinearProgressIndicator(
            progress = (state.recordingDuration / 30000f).coerceIn(0f, 1f),
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(32.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val samples = state.waveformAmplitudes.takeLast(5)
            repeat(5) { index ->
                val amplitude = samples.getOrNull(index) ?: 0.15f
                Box(
                    modifier = Modifier
                        .padding(horizontal = 2.dp)
                        .width(4.dp)
                        .height((8 + amplitude * 24 * pulse).dp)
                        .background(MaterialTheme.colorScheme.primary)
                )
            }
        }

        if (state.transcribedText.isNotBlank()) {
            Text(
                text = state.transcribedText,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center
            )
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
        Text("Processing...", style = MaterialTheme.typography.labelMedium)
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

        if (state.confidence > 0f) {
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
