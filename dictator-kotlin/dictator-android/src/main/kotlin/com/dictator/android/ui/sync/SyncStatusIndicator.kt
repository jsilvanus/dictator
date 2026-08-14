package com.dictator.android.ui.sync

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dictator.android.R

@Composable
fun SyncStatusIndicator(
    viewModel: SyncViewModel = viewModel(),
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {}
) {
    val state by viewModel.state.collectAsState()

    Row(
        modifier = modifier
            .clickable(onClick = onClick)
            .padding(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = getSyncIcon(state.syncState),
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = getSyncColor(state.syncState)
        )

        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = getSyncText(state.syncState),
                style = MaterialTheme.typography.labelSmall
            )
            Text(
                text = stringResource(R.string.last_sync, viewModel.getLastSyncText()),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun SyncStatusDialog(
    viewModel: SyncViewModel = viewModel(),
    onDismiss: () -> Unit = {}
) {
    val state by viewModel.state.collectAsState()

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.sync_status)) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Current sync state
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stringResource(R.string.sync_status))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(
                            imageVector = getSyncIcon(state.syncState),
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            tint = getSyncColor(state.syncState)
                        )
                        Text(getSyncText(state.syncState))
                    }
                }

                if (state.syncState == SyncState.SYNCING) {
                    CircularProgressIndicator(modifier = Modifier.padding(8.dp))
                }

                Divider()

                // Pending changes
                Text(
                    text = stringResource(R.string.pending_changes),
                    style = MaterialTheme.typography.titleSmall
                )

                if (state.pendingChanges.isEmpty()) {
                    Text(
                        text = "No pending changes",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(state.pendingChanges) { change ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = "Document: ${change.documentId}",
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                    Text(
                                        text = "Change: ${change.type}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }

                // Error message
                state.errorMessage?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center
                    )
                }
            }
        },
        confirmButton = {
            if (state.syncState == SyncState.ERROR) {
                Button(onClick = { viewModel.retry() }) {
                    Text(stringResource(R.string.sync_retry))
                }
            } else if (state.syncState != SyncState.SYNCING) {
                Button(onClick = { viewModel.sync() }) {
                    Text(stringResource(R.string.sync))
                }
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}

@Composable
fun ConflictResolutionDialog(
    documentId: String,
    localVersion: String,
    remoteVersion: String,
    onDismiss: () -> Unit = {},
    onResolve: (String) -> Unit = {}
) {
    var selectedVersion by remember { mutableStateOf(localVersion) }

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.resolve_conflicts)) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Conflicting document: $documentId",
                    style = MaterialTheme.typography.bodySmall
                )

                Divider()

                // Local version
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { selectedVersion = localVersion }
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = stringResource(R.string.keep_local),
                                style = MaterialTheme.typography.titleSmall
                            )
                            androidx.compose.material3.RadioButton(
                                selected = selectedVersion == localVersion,
                                onClick = { selectedVersion = localVersion }
                            )
                        }
                        Text(
                            text = localVersion.take(100),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Remote version
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { selectedVersion = remoteVersion }
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = stringResource(R.string.keep_remote),
                                style = MaterialTheme.typography.titleSmall
                            )
                            androidx.compose.material3.RadioButton(
                                selected = selectedVersion == remoteVersion,
                                onClick = { selectedVersion = remoteVersion }
                            )
                        }
                        Text(
                            text = remoteVersion.take(100),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = { onResolve(selectedVersion) }) {
                Text(stringResource(R.string.sync_retry))
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}

private fun getSyncIcon(state: SyncState): ImageVector {
    return when (state) {
        SyncState.SYNCED -> Icons.Filled.CloudDone
        SyncState.SYNCING -> Icons.Filled.Cloud
        SyncState.ERROR -> Icons.Filled.Warning
        SyncState.OFFLINE -> Icons.Filled.CloudOff
    }
}

private fun getSyncColor(state: SyncState) = when (state) {
    SyncState.SYNCED -> MaterialTheme.colorScheme.primary
    SyncState.SYNCING -> MaterialTheme.colorScheme.secondary
    SyncState.ERROR -> MaterialTheme.colorScheme.error
    SyncState.OFFLINE -> MaterialTheme.colorScheme.onSurfaceVariant
}

@Composable
private fun getSyncText(state: SyncState): String = when (state) {
    SyncState.SYNCED -> stringResource(R.string.sync_complete)
    SyncState.SYNCING -> stringResource(R.string.syncing)
    SyncState.ERROR -> stringResource(R.string.sync_error)
    SyncState.OFFLINE -> "Offline"
}
