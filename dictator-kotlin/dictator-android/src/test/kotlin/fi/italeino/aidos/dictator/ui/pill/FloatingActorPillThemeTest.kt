package fi.italeino.aidos.dictator.ui.pill

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.unit.dp
import com.dictator.core.actor.ActorPillConfig
import com.dictator.core.actor.ActorPillStatus
import com.dictator.core.actor.ActorRole
import com.dictator.core.actor.GlyphType
import com.dictator.core.actor.TextRangeBounds
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FloatingActorPillThemeTest {

    @Test
    fun `ember cursor retains warm coral identity across light and dark themes`() {
        val orchestratorConfig = ActorPillConfig.createDefaultOrchestrator()

        // 1. Light Theme
        val lightTokens = PillVisualTokens.resolve(
            config = orchestratorConfig,
            status = ActorPillStatus.WaitingAmbient,
            isDarkTheme = false
        )
        assertTrue(lightTokens.isEmber)
        assertEquals(PillVisualTokens.EmberCoral, lightTokens.actorAccentColor)
        assertEquals(PillVisualTokens.EmberPip, lightTokens.pipColor)
        assertEquals(Color(0xFFFFF7F5), lightTokens.contentColor)
        assertEquals(2.dp, lightTokens.elevation)
        assertEquals(PillVisualTokens.EmberLightBorder, (lightTokens.borderStroke.brush as SolidColor).value)

        // 2. Dark Theme
        val darkTokens = PillVisualTokens.resolve(
            config = orchestratorConfig,
            status = ActorPillStatus.WaitingAmbient,
            isDarkTheme = true
        )
        assertTrue(darkTokens.isEmber)
        assertEquals(PillVisualTokens.EmberCoral, darkTokens.actorAccentColor)
        assertEquals(PillVisualTokens.EmberPip, darkTokens.pipColor)
        assertEquals(Color(0xFFFFF7F5), darkTokens.contentColor)
        assertEquals(2.dp, darkTokens.elevation)
        assertEquals(PillVisualTokens.EmberDarkBorder, (darkTokens.borderStroke.brush as SolidColor).value)
    }

    @Test
    fun `orbit worker adapts surface contrast between light and dark themes`() {
        val editorConfig = ActorPillConfig.createDefaultEditor()
        val aiConfig = ActorPillConfig.createDefaultAi()

        // Light Theme: Surface is dark charcoal with light content glyphs/text
        val lightEditorTokens = PillVisualTokens.resolve(
            config = editorConfig,
            status = ActorPillStatus.WaitingAmbient,
            isDarkTheme = false
        )
        assertFalse(lightEditorTokens.isEmber)
        assertEquals(PillVisualTokens.OrbitLightContent, lightEditorTokens.contentColor)
        assertEquals(Color(editorConfig.colorArgb), lightEditorTokens.actorAccentColor)
        assertEquals(Color(editorConfig.colorArgb), lightEditorTokens.pipColor)
        assertEquals(PillVisualTokens.OrbitLightBorder, (lightEditorTokens.borderStroke.brush as SolidColor).value)

        // Dark Theme: Surface is light neutral with dark content glyphs/text
        val darkEditorTokens = PillVisualTokens.resolve(
            config = editorConfig,
            status = ActorPillStatus.WaitingAmbient,
            isDarkTheme = true
        )
        assertFalse(darkEditorTokens.isEmber)
        assertEquals(PillVisualTokens.OrbitDarkContent, darkEditorTokens.contentColor)
        assertEquals(Color(editorConfig.colorArgb), darkEditorTokens.actorAccentColor)
        assertEquals(Color(editorConfig.colorArgb), darkEditorTokens.pipColor)
        assertEquals(PillVisualTokens.OrbitDarkBorder, (darkEditorTokens.borderStroke.brush as SolidColor).value)

        // Verify Orbit is not permanently dark: surface content flips between light and dark
        assertTrue(lightEditorTokens.contentColor != darkEditorTokens.contentColor)

        // AI Worker in Light Theme
        val lightAiTokens = PillVisualTokens.resolve(
            config = aiConfig,
            status = ActorPillStatus.WaitingAmbient,
            isDarkTheme = false
        )
        assertEquals(Color(aiConfig.colorArgb), lightAiTokens.actorAccentColor)
        assertEquals(Color(aiConfig.colorArgb), lightAiTokens.pipColor)
    }

    @Test
    fun `paused status switches pip to amber across roles`() {
        val editorConfig = ActorPillConfig.createDefaultEditor()
        val pausedStatus = ActorPillStatus.CadenceStaging(
            targetRange = TextRangeBounds(0, 10),
            durationMs = 900L,
            remainingMs = 450L,
            progress = 0.5f,
            actionDescription = "Poista kappale",
            glyph = GlyphType.DELETE,
            isPaused = true
        )

        val tokens = PillVisualTokens.resolve(
            config = editorConfig,
            status = pausedStatus,
            isDarkTheme = true
        )

        assertEquals(PillVisualTokens.PausedAmber, tokens.pipColor)

        val unpausedStatus = pausedStatus.copy(isPaused = false)
        val unpausedTokens = PillVisualTokens.resolve(
            config = editorConfig,
            status = unpausedStatus,
            isDarkTheme = true
        )

        assertEquals(Color(editorConfig.colorArgb), unpausedTokens.pipColor)
    }

    @Test
    fun `dragging state increases elevation for responsive tactile feedback`() {
        val orchestratorConfig = ActorPillConfig.createDefaultOrchestrator()

        val restingTokens = PillVisualTokens.resolve(
            config = orchestratorConfig,
            status = ActorPillStatus.WaitingAmbient,
            isDarkTheme = true,
            isDragging = false
        )
        assertEquals(2.dp, restingTokens.elevation)

        val draggingTokens = PillVisualTokens.resolve(
            config = orchestratorConfig,
            status = ActorPillStatus.WaitingAmbient,
            isDarkTheme = true,
            isDragging = true
        )
        assertEquals(6.dp, draggingTokens.elevation)
    }

    @Test
    fun `custom actor colors are preserved for accents and status indicators`() {
        val customPurpleArgb = 0xFF8B5CF6L
        val customConfig = ActorPillConfig(
            id = "actor_custom",
            role = ActorRole.CUSTOM,
            displayName = "Custom Agent",
            colorArgb = customPurpleArgb,
            defaultGlyph = GlyphType.SPARK
        )

        val tokens = PillVisualTokens.resolve(
            config = customConfig,
            status = ActorPillStatus.WaitingAmbient,
            isDarkTheme = false
        )

        assertEquals(Color(customPurpleArgb), tokens.actorAccentColor)
        assertEquals(Color(customPurpleArgb), tokens.pipColor)
    }
}
