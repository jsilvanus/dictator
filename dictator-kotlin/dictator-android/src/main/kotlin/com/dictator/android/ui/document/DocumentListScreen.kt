package com.dictator.android.ui.document

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dictator.android.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentListScreen(
    viewModel: DocumentViewModel = viewModel(),
    onDocumentSelect: (String) -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val state by viewModel.state.collectAsState()
    val pullToRefreshState = rememberPullToRefreshState()
    var showNewDocumentDialog by remember { mutableStateOf(false) }
    var newDocTitle by remember { mutableStateOf("") }

    if (pullToRefreshState.isRefreshing) {
        viewModel.onRefresh()
        pullToRefreshState.endRefresh()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.documents)) },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Filled.Logout, contentDescription = stringResource(R.string.logout))
                    }
                    IconButton(onClick = {}) {
                        Icon(Icons.Filled.Settings, contentDescription = stringResource(R.string.settings))
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showNewDocumentDialog = true }) {
                Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.new_document))
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .nestedScroll(pullToRefreshState.nestedScrollConnection)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Search bar
                OutlinedTextField(
                    value = state.searchQuery,
                    onValueChange = viewModel::onSearchQueryChanged,
                    label = { Text(stringResource(R.string.search_documents)) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp)
                )

                // Document list states (IMPROVEMENT: Explicit state handling)
                when {
                    state.isLoading -> {
                        // Loading state
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                androidx.compose.material3.CircularProgressIndicator()
                                Text(
                                    stringResource(R.string.loading_documents),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                    state.errorMessage != null -> {
                        // Error state
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.CloudOff,
                                    contentDescription = stringResource(R.string.error),
                                    tint = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.padding(16.dp)
                                )
                                Text(
                                    state.errorMessage!!,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.error,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }
                        }
                    }
                    else -> {
                        // Content state
                        val filteredDocs = viewModel.getFilteredDocuments()
                        if (filteredDocs.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    stringResource(R.string.no_documents),
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                // IMPROVEMENT: Stable keys for performance
                                items(
                                    items = filteredDocs,
                                    key = { doc -> doc.id }
                                ) { doc ->
                                    DocumentCard(
                                        document = doc,
                                        onSelect = { onDocumentSelect(doc.id) },
                                        onLongPress = { viewModel.selectDocument(doc) }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            PullToRefreshContainer(
                modifier = Modifier.align(Alignment.TopCenter),
                state = pullToRefreshState
            )
        }
    }

    // Show detailed dialog
    if (state.showDetailDialog && state.selectedDocument != null) {
        DocumentDetailDialog(
            document = state.selectedDocument!!,
            onDismiss = { viewModel.dismissDetailDialog() },
            onDelete = { viewModel.deleteDocument(state.selectedDocument!!.id) },
            onArchive = { viewModel.archiveDocument(state.selectedDocument!!.id) }
        )
    }

    // New document dialog
    if (showNewDocumentDialog) {
        NewDocumentDialog(
            onDismiss = { showNewDocumentDialog = false },
            onCreateDocument = { title ->
                val docId = viewModel.createNewDocument(title)
                showNewDocumentDialog = false
                onDocumentSelect(docId)
            }
        )
    }
}

@Composable
fun DocumentCard(
    document: Document,
    onSelect: () -> Unit = {},
    onLongPress: () -> Unit = {}
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = document.title,
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = document.folder,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Icon(
                    imageVector = getSyncIcon(document.isSynced),
                    contentDescription = if (document.isSynced)
                        stringResource(R.string.synced)
                    else
                        stringResource(R.string.syncing_status),
                    tint = if (document.isSynced)
                        MaterialTheme.colorScheme.primary
                    else
                        MaterialTheme.colorScheme.secondary
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = stringResource(R.string.word_count, document.wordCount),
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = stringResource(R.string.last_modified, formatTime(document.lastModified)),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun getSyncIcon(isSynced: Boolean): ImageVector {
    return if (isSynced) Icons.Filled.CloudDone else Icons.Filled.Cloud
}

private fun formatTime(timestamp: Long): String {
    val diff = System.currentTimeMillis() - timestamp
    return when {
        diff < 60000 -> "Just now"
        diff < 3600000 -> "${diff / 60000} min ago"
        diff < 86400000 -> "${diff / 3600000} hours ago"
        else -> "${diff / 86400000} days ago"
    }
}

@Composable
fun DocumentDetailDialog(
    document: Document,
    onDismiss: () -> Unit = {},
    onDelete: () -> Unit = {},
    onArchive: () -> Unit = {}
) {
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.document_metadata)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("${stringResource(R.string.document_title)}: ${document.title}")
                Text("${stringResource(R.string.created_date)}: ${formatTime(document.lastModified)}")
                Text("${stringResource(R.string.word_count, document.wordCount)}")
            }
        },
        confirmButton = {
            androidx.compose.material3.Button(onClick = onDelete) {
                Text(stringResource(R.string.delete))
            }
        },
        dismissButton = {
            androidx.compose.material3.OutlinedButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}

@Composable
fun NewDocumentDialog(
    onDismiss: () -> Unit = {},
    onCreateDocument: (String) -> Unit = {}
) {
    var title by remember { mutableStateOf("") }

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.new_document)) },
        text = {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text(stringResource(R.string.document_title)) },
                modifier = Modifier.fillMaxWidth()
            )
        },
        confirmButton = {
            androidx.compose.material3.Button(
                onClick = { onCreateDocument(if (title.isBlank()) "Untitled Document" else title) },
                enabled = title.isNotBlank()
            ) {
                Text(stringResource(R.string.create))
            }
        },
        dismissButton = {
            androidx.compose.material3.OutlinedButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}
