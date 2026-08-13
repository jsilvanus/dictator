package com.dictator.android.ui.editor

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Redo
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dictator.android.R

@Composable
fun EditorScreen(
    documentId: String = "",
    viewModel: EditorViewModel = viewModel(),
    onBack: () -> Unit = {}
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(documentId) {
        if (documentId.isNotEmpty()) {
            viewModel.loadDocument(documentId)
        }
    }

    Scaffold(
        topBar = {
            Column {
                // Top app bar
                TopAppBar(
                    title = { Text(stringResource(R.string.edit_document)) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    actions = {
                        IconButton(onClick = {}) {
                            Icon(Icons.Filled.Share, contentDescription = stringResource(R.string.share))
                        }
                        IconButton(onClick = {}) {
                            Icon(Icons.Filled.MoreVert, contentDescription = "More")
                        }
                    }
                )

                // Editor toolbar
                EditorToolbar(viewModel = viewModel, state = state)
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
        ) {
            // Title field
            OutlinedTextField(
                value = state.title,
                onValueChange = viewModel::onTitleChanged,
                placeholder = { Text(stringResource(R.string.document_title)) },
                textStyle = MaterialTheme.typography.headlineSmall.copy(fontSize = 28.sp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                singleLine = true
            )

            // Metadata row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = when (state.syncStatus) {
                        SyncStatus.SYNCED -> Icons.Filled.CloudDone
                        SyncStatus.SYNCING -> Icons.Filled.Cloud
                        else -> Icons.Filled.CloudDone
                    },
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = if (state.syncStatus == SyncStatus.SYNCED)
                        MaterialTheme.colorScheme.primary
                    else
                        MaterialTheme.colorScheme.tertiary
                )
                Text(
                    text = viewModel.getSyncStatusText(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = stringResource(R.string.word_count, state.wordCount),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Divider(modifier = Modifier.padding(vertical = 8.dp))

            // Content editor
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(16.dp)
                    .background(Color.Transparent)
            ) {
                OutlinedTextField(
                    value = state.content,
                    onValueChange = viewModel::onContentChanged,
                    modifier = Modifier.fillMaxSize(),
                    textStyle = MaterialTheme.typography.bodyMedium.copy(fontSize = 16.sp),
                    placeholder = { Text("Start typing...") }
                )
            }
        }
    }
}

@Composable
fun EditorToolbar(viewModel: EditorViewModel, state: EditorUiState) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        Divider()
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Undo button
            IconButton(
                onClick = viewModel::undo,
                modifier = Modifier.size(40.dp),
                enabled = state.canUndo
            ) {
                Icon(Icons.Filled.Undo, contentDescription = stringResource(R.string.undo))
            }

            // Redo button
            IconButton(
                onClick = viewModel::redo,
                modifier = Modifier.size(40.dp),
                enabled = state.canRedo
            ) {
                Icon(Icons.Filled.Redo, contentDescription = stringResource(R.string.redo))
            }

            // Bold button
            ToolbarButton(
                label = stringResource(R.string.bold),
                onClick = { /* Handle bold */ }
            )

            // Italic button
            ToolbarButton(
                label = stringResource(R.string.italic),
                onClick = { /* Handle italic */ }
            )

            // Underline button
            ToolbarButton(
                label = stringResource(R.string.underline),
                onClick = { /* Handle underline */ }
            )

            // Heading buttons
            ToolbarButton(
                label = stringResource(R.string.heading_1),
                onClick = { /* Handle H1 */ }
            )

            ToolbarButton(
                label = stringResource(R.string.heading_2),
                onClick = { /* Handle H2 */ }
            )

            // Lists button
            ToolbarButton(
                label = stringResource(R.string.bullet_list),
                onClick = { /* Handle list */ }
            )

            // Code button
            ToolbarButton(
                label = stringResource(R.string.code_block),
                onClick = { /* Handle code */ }
            )
        }
    }
}

@Composable
fun ToolbarButton(label: String, onClick: () -> Unit = {}) {
    androidx.compose.material3.Button(
        onClick = onClick,
        modifier = Modifier
            .padding(2.dp)
            .size(height = 36.dp, width = 60.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontSize = 12.sp
        )
    }
}
