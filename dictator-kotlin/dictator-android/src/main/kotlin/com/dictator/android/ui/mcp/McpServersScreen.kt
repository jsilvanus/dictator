/**
 * MCP Server Management Screen
 * Displays and manages MCP server configurations
 */
package com.dictator.android.ui.mcp

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.dictator.android.R
import com.dictator.core.data.mcp.McpServerConfig

/**
 * MCP Server Management Screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun McpServersScreen(
    viewModel: McpViewModel = hiltViewModel(),
    onBack: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("MCP Servers") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.showAddDialog() }
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Server")
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            } else if (uiState.servers.isEmpty()) {
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.secondary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "No MCP servers configured",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Add a server to get started with MCP",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize()
                ) {
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(
                                        "Connected Servers",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        "${uiState.connectedCount} / ${uiState.totalCount}",
                                        style = MaterialTheme.typography.headlineSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                CircularProgressIndicator(
                                    progress = if (uiState.totalCount > 0) {
                                        uiState.connectedCount.toFloat() / uiState.totalCount
                                    } else {
                                        0f
                                    },
                                    modifier = Modifier.size(60.dp)
                                )
                            }
                        }
                    }

                    items(uiState.servers) { server ->
                        McpServerCard(
                            server = server,
                            onSelect = { viewModel.selectServer(server) },
                            onRemove = { viewModel.removeServer(server.config.id) },
                            onReconnect = { viewModel.reconnectServer(server.config.id) }
                        )
                    }
                }
            }

            // Error message
            uiState.error?.let { error ->
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.dismissError() }) {
                            Text("Dismiss")
                        }
                    }
                ) {
                    Text(error)
                }
            }
        }
    }

    // Add Dialog
    if (uiState.showAddDialog) {
        AddMcpServerDialog(
            onAdd = { config ->
                viewModel.addServer(config)
            },
            onDismiss = { viewModel.hideAddDialog() }
        )
    }

    // Details Dialog
    uiState.selectedServer?.let { server ->
        McpServerDetailsDialog(
            server = server,
            onDismiss = { viewModel.deselectServer() }
        )
    }
}

/**
 * MCP Server Card
 */
@Composable
private fun McpServerCard(
    server: com.dictator.core.data.mcp.McpServerState,
    onSelect: () -> Unit,
    onRemove: () -> Unit,
    onReconnect: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp)
            .clickable { onSelect() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        server.config.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        server.config.transportType,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Box(
                    modifier = Modifier
                        .background(
                            color = if (server.connected) {
                                Color.Green.copy(alpha = 0.2f)
                            } else {
                                Color.Red.copy(alpha = 0.2f)
                            },
                            shape = MaterialTheme.shapes.small
                        )
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        if (server.connected) "Connected" else "Disconnected",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (server.connected) Color.Green else Color.Red,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                "Tools: ${server.tools.size}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            server.lastError?.let { error ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Error: $error",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Red
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onReconnect,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Reconnect")
                }

                OutlinedButton(
                    onClick = onRemove,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Remove")
                }
            }
        }
    }
}

/**
 * Add MCP Server Dialog
 */
@Composable
private fun AddMcpServerDialog(
    onAdd: (McpServerConfig) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var transportType by remember { mutableStateOf("stdio") }
    var serverCommand by remember { mutableStateOf("") }
    var serverUrl by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add MCP Server") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Server Name") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = transportType,
                    onValueChange = { transportType = it },
                    label = { Text("Transport Type (stdio/http/sse)") },
                    modifier = Modifier.fillMaxWidth()
                )

                if (transportType == "stdio") {
                    OutlinedTextField(
                        value = serverCommand,
                        onValueChange = { serverCommand = it },
                        label = { Text("Server Command") },
                        modifier = Modifier.fillMaxWidth()
                    )
                } else {
                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = { serverUrl = it },
                        label = { Text("Server URL") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        val config = McpServerConfig(
                            id = java.util.UUID.randomUUID().toString(),
                            userId = "", // Will be set by service
                            name = name,
                            transportType = transportType,
                            serverCommand = serverCommand.takeIf { it.isNotBlank() },
                            serverUrl = serverUrl.takeIf { it.isNotBlank() }
                        )
                        onAdd(config)
                    }
                }
            ) {
                Text("Add")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

/**
 * MCP Server Details Dialog
 */
@Composable
private fun McpServerDetailsDialog(
    server: com.dictator.core.data.mcp.McpServerState,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(server.config.name) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Status: ${if (server.connected) "Connected" else "Disconnected"}")
                Text("Type: ${server.config.transportType}")
                Text("Tools: ${server.tools.size}")

                server.lastError?.let {
                    Text("Error: $it", color = Color.Red)
                }

                if (server.tools.isNotEmpty()) {
                    Text("Available Tools:", fontWeight = FontWeight.Bold)
                    server.tools.forEach { (toolName, _) ->
                        Text("  • $toolName", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}
