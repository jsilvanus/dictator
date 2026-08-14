/**
 * Cursor Size Button Component for Android Voice Panel
 * Allows users to switch between paragraph/word/character cursor sizes
 */

package com.dictator.android.ui.voice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dictator.core.domain.entity.CursorSize

/**
 * Cursor size button group for switching between paragraph/word/character
 */
@Composable
fun CursorSizeButtons(
    currentSize: CursorSize,
    onSizeChanged: (CursorSize) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Cursor:",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(end = 4.dp)
        )
        
        CursorSize.values().forEach { size ->
            CursorSizeButton(
                size = size,
                isSelected = currentSize == size,
                onClick = { onSizeChanged(size) },
                modifier = Modifier.weight(1f)
            )
        }
    }
}

/**
 * Individual cursor size button
 */
@Composable
fun CursorSizeButton(
    size: CursorSize,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = when {
        isSelected -> getCursorSizeColor(size)
        else -> Color.Transparent
    }
    
    val borderColor = getCursorSizeColor(size)
    val textColor = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
    
    Box(
        modifier = modifier
            .background(
                color = backgroundColor,
                shape = RoundedCornerShape(6.dp)
            )
            .border(
                width = 1.5.dp,
                color = borderColor,
                shape = RoundedCornerShape(6.dp)
            )
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp, horizontal = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = getCursorSizeSymbol(size),
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            ),
            color = textColor
        )
    }
}

/**
 * Get the symbol for each cursor size
 */
private fun getCursorSizeSymbol(size: CursorSize): String {
    return when (size) {
        CursorSize.PARAGRAPH -> "¶"
        CursorSize.WORD -> "W"
        CursorSize.CHARACTER -> "C"
    }
}

/**
 * Get color for cursor size
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
fun getCursorSizeLabel(size: CursorSize): String {
    return when (size) {
        CursorSize.PARAGRAPH -> "Paragraph"
        CursorSize.WORD -> "Word"
        CursorSize.CHARACTER -> "Character"
    }
}
