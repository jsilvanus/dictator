package com.dictator.android.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.dictator.android.ui.navigation.DictatorNavHost
import com.dictator.android.ui.theme.DictatorTheme
import dagger.hilt.android.AndroidEntryPoint
import io.github.aakira.napier.Napier

/**
 * Main Activity for Dictator Android app.
 * Entry point for all Compose UI.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        Napier.d("MainActivity created")

        setContent {
            DictatorTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    DictatorApp()
                }
            }
        }
    }
}

/**
 * Root composable for Dictator App.
 */
@Composable
fun DictatorApp() {
    DictatorNavHost()
}
