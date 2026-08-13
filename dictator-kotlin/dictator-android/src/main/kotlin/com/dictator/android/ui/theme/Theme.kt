package com.dictator.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF3D7AFF),
    secondary = Color(0xFF4F6EF8),
    tertiary = Color(0xFF6C5FB7),
    background = Color(0xFF0F1419),
    surface = Color(0xFF1A1F26),
    error = Color(0xFFFF6B6B),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFF0F1F5),
    onSurface = Color(0xFFF0F1F5),
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF3D7AFF),
    secondary = Color(0xFF4F6EF8),
    tertiary = Color(0xFF6C5FB7),
    background = Color(0xFFFBFBFB),
    surface = Color(0xFFFFFFFF),
    error = Color(0xFFBA1A1A),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFF1B1B1B),
    onSurface = Color(0xFF1B1B1B),
)

/**
 * Dictator app theme using Material 3 design.
 * Supports both light and dark modes.
 */
@Composable
fun DictatorTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = DictatorTypography,
        content = content
    )
}
