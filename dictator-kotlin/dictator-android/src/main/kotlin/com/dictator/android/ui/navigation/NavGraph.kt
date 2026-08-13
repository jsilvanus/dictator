package com.dictator.android.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.dictator.android.ui.auth.AuthScreen
import com.dictator.android.ui.document.DocumentListScreen
import com.dictator.android.ui.editor.EditorScreen

sealed class Screen(val route: String) {
    data object Auth : Screen("auth")
    data object DocumentList : Screen("documents")
    data object Editor : Screen("editor/{documentId}") {
        fun createRoute(documentId: String) = "editor/$documentId"
    }
}

@Composable
fun DictatorNavHost(
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.Auth.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Auth.route) {
            AuthScreen(onAuthSuccess = {
                navController.navigate(Screen.DocumentList.route) {
                    popUpTo(Screen.Auth.route) { inclusive = true }
                }
            })
        }

        composable(Screen.DocumentList.route) {
            DocumentListScreen(
                onDocumentSelect = { documentId ->
                    navController.navigate(Screen.Editor.createRoute(documentId))
                },
                onLogout = {
                    navController.navigate(Screen.Auth.route) {
                        popUpTo(Screen.DocumentList.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Editor.route) { backStackEntry ->
            val documentId = backStackEntry.arguments?.getString("documentId") ?: ""
            EditorScreen(
                documentId = documentId,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
