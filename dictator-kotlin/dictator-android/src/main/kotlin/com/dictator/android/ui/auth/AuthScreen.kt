package com.dictator.android.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dictator.android.R

@Composable
fun AuthScreen(
    viewModel: AuthViewModel = viewModel(),
    onAuthSuccess: (() -> Unit)? = null
) {
    val state by viewModel.state.collectAsState()

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Header
                    Text(
                        text = if (state.isSignUp) 
                            stringResource(R.string.signup) 
                        else 
                            stringResource(R.string.login),
                        style = MaterialTheme.typography.headlineSmall
                    )
                    Text(
                        text = if (state.isSignUp) 
                            stringResource(R.string.welcome_signup) 
                        else 
                            stringResource(R.string.welcome_login),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // Name field (signup only)
                    if (state.isSignUp) {
                        OutlinedTextField(
                            value = state.name,
                            onValueChange = viewModel::onNameChanged,
                            label = { Text(stringResource(R.string.name)) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Email field
                    OutlinedTextField(
                        value = state.email,
                        onValueChange = viewModel::onEmailChanged,
                        label = { Text(stringResource(R.string.email)) },
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Password field with visibility toggle
                    OutlinedTextField(
                        value = state.password,
                        onValueChange = viewModel::onPasswordChanged,
                        label = { Text(stringResource(R.string.password)) },
                        visualTransformation = if (state.showPassword) 
                            VisualTransformation.None 
                        else 
                            PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = viewModel::togglePasswordVisibility) {
                                Icon(
                                    imageVector = if (state.showPassword)
                                        Icons.Filled.Visibility
                                    else
                                        Icons.Filled.VisibilityOff,
                                    contentDescription = if (state.showPassword)
                                        stringResource(R.string.hide_password)
                                    else
                                        stringResource(R.string.show_password)
                                )
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Password strength indicator (signup only)
                    if (state.isSignUp && state.password.isNotEmpty()) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Password Strength:",
                                    style = MaterialTheme.typography.labelSmall
                                )
                                Text(
                                    text = getPasswordStrengthLabel(state.passwordStrength),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = getPasswordStrengthColor(state.passwordStrength)
                                )
                            }
                            LinearProgressIndicator(
                                progress = getPasswordStrengthProgress(state.passwordStrength),
                                modifier = Modifier.fillMaxWidth(),
                                color = getPasswordStrengthColor(state.passwordStrength)
                            )
                        }
                    }

                    // Confirm password field (signup only)
                    if (state.isSignUp) {
                        OutlinedTextField(
                            value = state.confirmPassword,
                            onValueChange = viewModel::onConfirmPasswordChanged,
                            label = { Text(stringResource(R.string.confirm_password)) },
                            visualTransformation = if (state.showPassword)
                                VisualTransformation.None
                            else
                                PasswordVisualTransformation(),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Terms acceptance (signup only)
                    if (state.isSignUp) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.Start,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = state.termsAccepted,
                                onCheckedChange = { viewModel.toggleTermsAcceptance() }
                            )
                            Text(
                                text = stringResource(R.string.terms_agree),
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(start = 8.dp)
                            )
                        }
                    }

                    // Error message
                    state.errorMessage?.let { message ->
                        Text(
                            text = message,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(8.dp)
                        )
                    }

                    // Success message
                    state.successMessage?.let { message ->
                        Text(
                            text = message,
                            color = MaterialTheme.colorScheme.primary,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(8.dp)
                        )
                    }

                    // Submit button
                    Button(
                        onClick = viewModel::submit,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !state.isLoading
                    ) {
                        if (state.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.padding(end = 8.dp),
                                strokeWidth = 2.dp,
                                color = Color.White
                            )
                        }
                        Text(if (state.isSignUp) stringResource(R.string.signup) else stringResource(R.string.login))
                    }

                    // Toggle mode button
                    OutlinedButton(
                        onClick = viewModel::toggleMode,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            if (state.isSignUp)
                                stringResource(R.string.already_have_account)
                            else
                                stringResource(R.string.dont_have_account)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun getPasswordStrengthLabel(strength: PasswordStrength): String {
    return when (strength) {
        PasswordStrength.WEAK -> stringResource(R.string.password_strength_weak)
        PasswordStrength.MEDIUM -> stringResource(R.string.password_strength_medium)
        PasswordStrength.STRONG -> stringResource(R.string.password_strength_strong)
        PasswordStrength.VERY_STRONG -> stringResource(R.string.password_strength_very_strong)
        PasswordStrength.NONE -> ""
    }
}

@Composable
private fun getPasswordStrengthColor(strength: PasswordStrength): Color {
    return when (strength) {
        PasswordStrength.WEAK -> MaterialTheme.colorScheme.error
        PasswordStrength.MEDIUM -> Color(0xFFFFA500) // Orange
        PasswordStrength.STRONG -> Color(0xFF4CAF50) // Green
        PasswordStrength.VERY_STRONG -> Color(0xFF2E7D32) // Dark green
        PasswordStrength.NONE -> Color.Transparent
    }
}

private fun getPasswordStrengthProgress(strength: PasswordStrength): Float {
    return when (strength) {
        PasswordStrength.WEAK -> 0.25f
        PasswordStrength.MEDIUM -> 0.5f
        PasswordStrength.STRONG -> 0.75f
        PasswordStrength.VERY_STRONG -> 1f
        PasswordStrength.NONE -> 0f
    }
}
