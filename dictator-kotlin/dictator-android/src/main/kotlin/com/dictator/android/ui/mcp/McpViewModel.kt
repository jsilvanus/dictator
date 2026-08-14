/**
 * MCP Server Management ViewModel
 * Manages MCP server configuration and state
 */
package com.dictator.android.ui.mcp

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.dictator.core.data.mcp.McpServerConfig
import com.dictator.core.data.mcp.McpServerState
import com.dictator.core.service.McpService
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

data class McpUiState(
    val servers: List<McpServerState> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val selectedServer: McpServerState? = null,
    val showAddDialog: Boolean = false,
    val connectedCount: Int = 0,
    val totalCount: Int = 0
)

@HiltViewModel
class McpViewModel @Inject constructor(
    private val mcpService: McpService
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(McpUiState())
    val uiState: StateFlow<McpUiState> = _uiState.asStateFlow()

    init {
        loadServers()
    }

    /**
     * Load all MCP servers
     */
    private fun loadServers() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val servers = mcpService.getAllServers()
                val connectedCount = mcpService.getConnectedServersCount()
                
                _uiState.value = _uiState.value.copy(
                    servers = servers,
                    connectedCount = connectedCount,
                    totalCount = servers.size,
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to load servers",
                    isLoading = false
                )
            }
        }
    }

    /**
     * Add a new MCP server
     */
    fun addServer(config: McpServerConfig) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val result = mcpService.registerServer(config)
                if (result.isSuccess) {
                    loadServers()
                    _uiState.value = _uiState.value.copy(showAddDialog = false)
                } else {
                    _uiState.value = _uiState.value.copy(
                        error = result.exceptionOrNull()?.message ?: "Failed to add server",
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to add server",
                    isLoading = false
                )
            }
        }
    }

    /**
     * Remove an MCP server
     */
    fun removeServer(serverId: String) {
        viewModelScope.launch {
            try {
                val result = mcpService.unregisterServer(serverId)
                if (result.isSuccess) {
                    loadServers()
                } else {
                    _uiState.value = _uiState.value.copy(
                        error = result.exceptionOrNull()?.message ?: "Failed to remove server"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to remove server"
                )
            }
        }
    }

    /**
     * Reconnect to an MCP server
     */
    fun reconnectServer(serverId: String) {
        viewModelScope.launch {
            try {
                val result = mcpService.reconnectServer(serverId)
                if (result.isSuccess) {
                    loadServers()
                } else {
                    _uiState.value = _uiState.value.copy(
                        error = result.exceptionOrNull()?.message ?: "Failed to reconnect"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to reconnect"
                )
            }
        }
    }

    /**
     * Select a server to view details
     */
    fun selectServer(server: McpServerState) {
        _uiState.value = _uiState.value.copy(selectedServer = server)
    }

    /**
     * Deselect server
     */
    fun deselectServer() {
        _uiState.value = _uiState.value.copy(selectedServer = null)
    }

    /**
     * Show add dialog
     */
    fun showAddDialog() {
        _uiState.value = _uiState.value.copy(showAddDialog = true)
    }

    /**
     * Hide add dialog
     */
    fun hideAddDialog() {
        _uiState.value = _uiState.value.copy(showAddDialog = false)
    }

    /**
     * Dismiss error
     */
    fun dismissError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    /**
     * Refresh servers
     */
    fun refresh() {
        loadServers()
    }
}
