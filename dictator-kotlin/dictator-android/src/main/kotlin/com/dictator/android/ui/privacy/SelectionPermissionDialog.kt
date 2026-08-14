/**
 * Selection Permission Dialog for Android
 * Displays PII warnings and permission requests before sending selected text
 */

package com.dictator.android.ui.privacy

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dictator.core.util.privacy.DetectedSensitiveData
import com.dictator.core.util.privacy.SensitiveDataDetector
import com.dictator.core.util.privacy.SensitiveDataType

/**
 * Dialog for showing PII warnings and permission requests
 */
@Composable
fun SelectionPermissionDialog(
    selectedText: String,
    detectedPiiTypes: List<DetectedSensitiveData>,
    riskLevel: String,
    onAllow: (String) -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier
) {
    AlertDialog(
        onDismissRequest = onCancel,
        modifier = modifier,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Warning,
                    contentDescription = "Warning",
                    tint = getRiskLevelColor(riskLevel),
                    modifier = Modifier.size(24.dp)
                )
                Text(
                    text = "Sensitive Data Detected",
                    fontWeight = FontWeight.Bold
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Risk level indicator
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = getRiskLevelColor(riskLevel).copy(alpha = 0.1f),
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(12.dp)
                ) {
                    Text(
                        text = "Risk Level: ${riskLevel.uppercase()}",
                        style = MaterialTheme.typography.labelSmall,
                        color = getRiskLevelColor(riskLevel),
                        fontWeight = FontWeight.Bold
                    )
                }

                // Description
                Text(
                    text = "The selected text contains sensitive information that should not be sent to AI services without your explicit permission.",
                    style = MaterialTheme.typography.bodySmall
                )

                // Detected PII types
                if (detectedPiiTypes.isNotEmpty()) {
                    Text(
                        text = "Detected Information:",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold
                    )

                    detectedPiiTypes.forEach { pii ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    color = MaterialTheme.colorScheme.errorContainer,
                                    shape = RoundedCornerShape(6.dp)
                                )
                                .padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "•",
                                color = MaterialTheme.colorScheme.error,
                                fontWeight = FontWeight.Bold
                            )
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Text(
                                    text = SensitiveDataDetector.getTypeDescription(pii.type),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                                Text(
                                    text = "Confidence: ${SensitiveDataDetector.getConfidenceDescription(pii.confidence)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                            }
                        }
                    }
                }

                // Selected text preview
                Text(
                    text = "Selected Text:",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = selectedText,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.secondary
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(4.dp)
                        )
                        .padding(8.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onAllow("once") }
            ) {
                Text("Send This Time")
            }
        },
        dismissButton = {
            OutlinedButton(
                onClick = onCancel
            ) {
                Text("Cancel")
            }
        }
    )
}

/**
 * Get color for risk level
 */
private fun getRiskLevelColor(riskLevel: String): Color {
    return when (riskLevel) {
        "high" -> Color(0xFFD32F2F)   // Red
        "medium" -> Color(0xFFF57C00) // Orange
        else -> Color(0xFF388E3C)     // Green
    }
}

/**
 * Compact PII indicator for inline display
 */
@Composable
fun PiiIndicator(
    detectedCount: Int,
    riskLevel: String,
    modifier: Modifier = Modifier
) {
    if (detectedCount > 0) {
        Box(
            modifier = modifier
                .background(
                    color = getRiskLevelColor(riskLevel).copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp)
                )
                .padding(horizontal = 8.dp, vertical = 4.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Warning,
                    contentDescription = "PII detected",
                    modifier = Modifier.size(14.dp),
                    tint = getRiskLevelColor(riskLevel)
                )
                Text(
                    text = "PII: $detectedCount detected",
                    style = MaterialTheme.typography.labelSmall,
                    color = getRiskLevelColor(riskLevel),
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
