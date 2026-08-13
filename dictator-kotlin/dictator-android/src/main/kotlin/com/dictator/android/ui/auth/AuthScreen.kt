package com.dictator.android.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dictator.android.R

@Composable
fun AuthScreen(viewModel: AuthViewModel = viewModel()) {
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
                    Text(
                        text = if (state.isSignUp) stringResource(R.string.signup) else stringResource(R.string.login),
                        style = MaterialTheme.typography.headlineSmall
                    )
                    Text(
                        text = if (state.isSignUp) "Create your account to start writing with Dictator." else "Sign in to continue your writing workflow.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    if (state.isSignUp) {
                        OutlinedTextField(
                            value = state.name,
                            onValueChange = viewModel::onNameChanged,
                            label = { Text(stringResource(R.string.name)) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    OutlinedTextField(
                        value = state.email,
                        onValueChange = viewModel::onEmailChanged,
                        label = { Text(stringResource(R.string.email)) },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = state.password,
                        onValueChange = viewModel::onPasswordChanged,
                        label = { Text(stringResource(R.string.password)) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (state.isSignUp) {
                        OutlinedTextField(
                            value = state.confirmPassword,
                            onValueChange = viewModel::onConfirmPasswordChanged,
                            label = { Text(stringResource(R.string.confirm_password)) },
                            visualTransformation = PasswordVisualTransformation(),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    state.errorMessage?.let { message ->
                        Text(text = message, color = MaterialTheme.colorScheme.error)
                    }

                    state.successMessage?.let { message ->
                        Text(text = message, color = MaterialTheme.colorScheme.primary)
                    }

                    Button(onClick = viewModel::submit, modifier = Modifier.fillMaxWidth()) {
                        Text(if (state.isSignUp) stringResource(R.string.signup) else stringResource(R.string.login))
                    }

                    OutlinedButton(onClick = viewModel::toggleMode, modifier = Modifier.fillMaxWidth()) {
                        Text(if (state.isSignUp) stringResource(R.string.already_have_account) else stringResource(R.string.dont_have_account))
                    }
                }
            }
        }
    }
}
