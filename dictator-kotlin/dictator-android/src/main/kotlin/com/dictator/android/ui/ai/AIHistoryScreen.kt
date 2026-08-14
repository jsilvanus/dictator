package com.dictator.android.ui.ai

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronDown
import androidx.compose.material.icons.filled.ChevronUp
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dictator.android.R
import com.dictator.core.data.ai.AiTurnWithProvenance
import com.dictator.core.data.privacy.AiContentSource
import com.dictator.core.data.privacy.AiRequestScope
import com.dictator.core.domain.entity.AiHistoryTurnResponse
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * AI History Screen
 * Displays a list of all AI turns for the current document with full provenance metadata
 */
@Composable
fun AIHistoryScreen(
    documentId: String,
    onNavigateBack: () -> Unit,
    viewModel: AIViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    var expandedTurnIndex by remember { mutableStateOf<Int?>(null) }
    val turns = remember { mutableStateOf<List<AiHistoryTurnResponse>>(emptyList()) }
    val loading = remember { mutableStateOf(true) }
    val error = remember { mutableStateOf<String?>(null) }

    // Fetch AI history when screen opens
    LaunchedEffect(documentId) {
        loading.value = true
        error.value = null
        try {
            // In real implementation: fetch from API endpoint
            // val response = viewModel.fetchAiHistory(documentId)
            // turns.value = response.turns
            // For now, simulating empty state
            turns.value = emptyList()
            loading.value = false
        } catch (e: Exception) {
            error.value = e.message ?: "Unknown error"
            loading.value = false
        }
    }

    Column(
        modifier = modifier.fillMaxSize()
    ) {
        // Header
        TopAppBar(
            title = { Text("AI History") },
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                }
            }
        )

        // Content
        when {
            loading.value -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            error.value != null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Error: ${error.value}",
                        color = MaterialTheme.colorScheme.error,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }

            turns.value.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No AI interactions yet",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(vertical = 8.dp)
                ) {
                    items(turns.value) { turn ->
                        AIHistoryTurnCard(
                            turn = turn,
                            isExpanded = expandedTurnIndex == turns.value.indexOf(turn),
                            onExpandChange = { isExpanded ->
                                expandedTurnIndex = if (isExpanded) turns.value.indexOf(turn) else null
                            }
                        )
                    }
                }
            }
        }
    }
}

/**
 * AI History Turn Card
 * Displays a single AI turn with collapsible metadata
 */
@Composable
fun AIHistoryTurnCard(
    turn: AiHistoryTurnResponse,
    isExpanded: Boolean,
    onExpandChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val prov = turn.provenance
    val sourceColor = getSourceBadgeColor(prov?.source)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp)
            .clickable { onExpandChange(!isExpanded) },
        colors = CardDefaults.cardColors(
            containerColor = if (isExpanded) MaterialTheme.colorScheme.surfaceVariant
            else MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.fillMaxWidth()
        ) {
            // Turn Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    // Source Badge
                    if (prov != null) {
                        Text(
                            text = getSourceLabel(prov.source),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier
                                .background(sourceColor, shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp),
                            color = Color.White
                        )
                        Box(modifier = Modifier.height(4.dp))
                    }

                    // User Message Preview
                    Text(
                        text = "Q: ${turn.userMessage.take(80)}${if (turn.userMessage.length > 80) "..." else ""}",
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    // Timestamp and Confidence
                    if (prov != null) {
                        Box(modifier = Modifier.height(4.dp))
                        Text(
                            text = formatTimestamp(Date(prov.createdAt)) +
                                    if (prov.confidence != null) " • ${(prov.confidence * 100).toInt()}% confidence"
                                    else "",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Expand/Collapse Icon
                Icon(
                    imageVector = if (isExpanded) Icons.Filled.ChevronUp else Icons.Filled.ChevronDown,
                    contentDescription = if (isExpanded) "Collapse" else "Expand",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Expanded Details
            if (isExpanded) {
                Divider(modifier = Modifier.fillMaxWidth())

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(12.dp)
                ) {
                    // Metadata Section
                    if (prov != null) {
                        Text(
                            text = "Metadata",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        MetadataRow("Scope:", getScopeLabel(prov.contentScope))
                        MetadataRow("Device:", prov.device)
                        if (prov.thinkingBudgetTokens != null) {
                            MetadataRow("Thinking:", "${prov.thinkingBudgetTokens} tokens")
                        }
                        if (prov.reviewedAt != null) {
                            MetadataRow("Reviewed:", formatTimestamp(Date(prov.reviewedAt)))
                        }

                        Box(modifier = Modifier.height(12.dp))
                    }

                    // Full Messages
                    Text(
                        text = "Your Message",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                    Surface(
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp),
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = turn.userMessage,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(8.dp),
                            maxLines = 5,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Text(
                        text = "AI Response",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                    Surface(
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp),
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = turn.assistantResponse,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(8.dp),
                            maxLines = 5,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    // Thinking Content
                    if (!prov?.thinkingContent.isNullOrEmpty()) {
                        Text(
                            text = "Thinking Process",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                        Surface(
                            color = MaterialTheme.colorScheme.surface,
                            modifier = Modifier.fillMaxWidth(),
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = prov.thinkingContent ?: "",
                                style = MaterialTheme.typography.labelSmall.copy(fontFamily = FontFamily.Monospace),
                                modifier = Modifier.padding(8.dp),
                                maxLines = 5,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Metadata Row Helper
 */
@Composable
private fun MetadataRow(label: String, value: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold
        )
    }
}

/**
 * Helper Functions
 */
private fun getSourceBadgeColor(source: String?): Color {
    return when (source) {
        "AI_GENERATED" -> Color(0xFF4CAF50) // Green
        "AI_MODIFIED" -> Color(0xFFFFC107)  // Yellow
        "HUMAN_WRITTEN" -> Color(0xFF2196F3) // Blue
        "HUMAN_DICTATED" -> Color(0xFF9C27B0) // Purple
        else -> Color(0xFF9E9E9E) // Gray
    }
}

private fun getSourceLabel(source: String): String {
    return when (source) {
        "AI_GENERATED" -> "AI Generated"
        "AI_MODIFIED" -> "AI Modified"
        "HUMAN_WRITTEN" -> "Human Written"
        "HUMAN_DICTATED" -> "Dictated"
        else -> "Unknown"
    }
}

private fun getScopeLabel(scope: String?): String {
    return when (scope) {
        "FULL_DOCUMENT" -> "Full Document"
        "SELECTED_TEXT" -> "Selection"
        "CONTEXT_SNIPPET" -> "Context"
        else -> "Unknown"
    }
}

private fun formatTimestamp(date: Date): String {
    val sdf = SimpleDateFormat("MMM d, h:mm a", Locale.getDefault())
    return sdf.format(date)
}
