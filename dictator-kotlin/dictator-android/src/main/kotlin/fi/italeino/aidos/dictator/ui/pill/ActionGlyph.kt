package fi.italeino.aidos.dictator.ui.pill

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCut
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.SelectAll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.dictator.core.actor.GlyphType

/**
 * Renders the vector icon glyph for an Actor Pill.
 */
@Composable
fun ActionGlyph(
    glyphType: GlyphType,
    tint: Color,
    modifier: Modifier = Modifier
) {
    val imageVector = when (glyphType) {
        GlyphType.MIC -> Icons.Default.Mic
        GlyphType.TEXT_CARET -> Icons.Default.Edit
        GlyphType.SPARK -> Icons.Default.AutoAwesome
        GlyphType.DELETE -> Icons.Default.Delete
        GlyphType.SCISSORS -> Icons.Default.ContentCut
        GlyphType.SELECTION -> Icons.Default.SelectAll
        GlyphType.CHECK -> Icons.Default.Check
        GlyphType.CLOCK -> Icons.Default.Schedule
        GlyphType.QUESTION -> Icons.Default.HelpOutline
    }

    Icon(
        imageVector = imageVector,
        contentDescription = glyphType.name,
        tint = tint,
        modifier = modifier
    )
}
