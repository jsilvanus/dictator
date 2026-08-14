/**
 * Cursor Indicator Compose Component for Android
 * Displays current cursor state, size, and selection information
 */

package com.dictator.android.ui.editor

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dictator.core.domain.entity.CursorSize
import com.dictator.core.domain.entity.CursorState

/**
 * Displays cursor indicator showing current cursor state
 */
@Composable
fun CursorIndicator(
    cursorState: CursorState,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(8.dp)
            )
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Header with icon
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.Info,
                contentDescription = "Cursor indicator",
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Text(
                text = "Cursor Status",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold
            )
        }

        // Cursor size display
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Size:",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
            
            // Visual indicator of cursor size
            Box(
                modifier = Modifier
                    .background(
                        color = getCursorSizeColor(cursorState.current.size),
                        shape = RoundedCornerShape(4.dp)
                    )
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = getCursorSizeLabel(cursorState.current.size),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Position information
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Position:",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
            
            Text(
                text = "${cursorState.current.startChar} - ${cursorState.current.endChar}",
                style = MaterialTheme.typography.bodySmall.copy(
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp
                )
            )
        }

        // Selection information
        if (cursorState.selection?.isActive == true) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Selection:",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.primary
                )
                
                val startPos = cursorState.selection.startPos.startChar
                val endPos = cursorState.selection.endPos.endChar
                val length = maxOf(0, endPos - startPos)
                
                Text(
                    text = "$length characters selected",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        // Mode indicator
        if (cursorState.selection?.isActive == true) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(4.dp)
                    )
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "📌 Selection Mode Active",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
    }
}

/**
 * Get color for cursor size indicator
 */
private fun getCursorSizeColor(size: CursorSize): Color {
    return when (size) {
        CursorSize.PARAGRAPH -> Color(0xFF2E7D32) // Green
        CursorSize.WORD -> Color(0xFF1976D2)      // Blue
        CursorSize.CHARACTER -> Color(0xFFF57C00) // Orange
    }
}

/**
 * Get label for cursor size
 */
private fun getCursorSizeLabel(size: CursorSize): String {
    return when (size) {
        CursorSize.PARAGRAPH -> "¶ Paragraph"
        CursorSize.WORD -> "W Word"
        CursorSize.CHARACTER -> "C Character"
    }
}

/**
 * Minimal cursor indicator for compact display
 */
@Composable
fun CompactCursorIndicator(
    cursorState: CursorState,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(4.dp)
            )
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Cursor size indicator
        Box(
            modifier = Modifier
                .size(12.dp)
                .background(
                    color = getCursorSizeColor(cursorState.current.size),
                    shape = RoundedCornerShape(2.dp)
                )
        )
        
        // Size label
        Text(
            text = getCursorSizeLabel(cursorState.current.size),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium
        )
        
        // Selection indicator if active
        if (cursorState.selection?.isActive == true) {
            Text(
                text = "| Selection",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}
