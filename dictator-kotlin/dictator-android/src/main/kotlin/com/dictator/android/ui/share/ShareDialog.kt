package com.dictator.android.ui.share

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dictator.android.R

@Composable
fun ShareDialog(
    documentId: String,
    viewModel: ShareViewModel = viewModel(),
    onDismiss: () -> Unit = {}
) {
    val state by viewModel.state.collectAsState()
    var expandedUserId by remember { mutableStateOf<String?>(null) }

    // Set document on first load
    remember { viewModel.setDocument(documentId) }

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.share_document)) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Public/Private toggle
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (state.isPublic)
                            stringResource(R.string.make_private)
                        else
                            stringResource(R.string.make_public),
                        style = MaterialTheme.typography.labelMedium
                    )
                    Checkbox(
                        checked = state.isPublic,
                        onCheckedChange = { viewModel.togglePublic() }
                    )
                }

                // Public link (if public)
                if (state.isPublic && state.publicLink.isNotEmpty()) {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = state.publicLink,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.weight(1f)
                            )
                            IconButton(onClick = { viewModel.copyPublicLink() }) {
                                Icon(
                                    Icons.Filled.ContentCopy,
                                    contentDescription = stringResource(R.string.copy_link)
                                )
                            }
                        }
                    }
                }

                Divider()

                // Add user section
                Text(
                    text = stringResource(R.string.shared_users),
                    style = MaterialTheme.typography.titleSmall
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = state.userInput,
                        onValueChange = viewModel::onUserInputChanged,
                        placeholder = { Text(stringResource(R.string.add_user)) },
                        modifier = Modifier.weight(1f)
                    )
                    Button(
                        onClick = { viewModel.addUser(state.userInput) },
                        enabled = state.userInput.isNotBlank()
                    ) {
                        Text(stringResource(R.string.create))
                    }
                }

                // Shared users list
                if (state.sharedUsers.isEmpty()) {
                    Text(
                        text = "No users shared",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(state.sharedUsers) { user ->
                            SharedUserRow(
                                user = user,
                                onPermissionChange = { permission ->
                                    viewModel.updatePermission(user.id, permission)
                                },
                                onRemove = { viewModel.removeUser(user.id) },
                                isExpanded = expandedUserId == user.id,
                                onExpandChange = {
                                    expandedUserId = if (expandedUserId == user.id) null else user.id
                                }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        },
        dismissButton = {}
    )
}

@Composable
fun SharedUserRow(
    user: SharedUser,
    onPermissionChange: (SharePermission) -> Unit = {},
    onRemove: () -> Unit = {},
    isExpanded: Boolean = false,
    onExpandChange: (Boolean) -> Unit = {}
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(user.email, style = MaterialTheme.typography.labelMedium)
                    Text(
                        getPermissionLabel(user.permission),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                IconButton(onClick = onRemove) {
                    Icon(Icons.Filled.Delete, contentDescription = stringResource(R.string.remove_share))
                }
            }

            // Permission dropdown (expanded)
            if (isExpanded) {
                Divider()
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        stringResource(R.string.permission),
                        style = MaterialTheme.typography.labelSmall
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        SharePermission.values().forEach { perm ->
                            OutlinedButton(
                                onClick = {
                                    onPermissionChange(perm)
                                    onExpandChange(false)
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(getPermissionLabel(perm), style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun getPermissionLabel(permission: SharePermission): String {
    return when (permission) {
        SharePermission.VIEW -> stringResource(R.string.view_only)
        SharePermission.EDIT -> stringResource(R.string.can_edit)
        SharePermission.COMMENT -> stringResource(R.string.can_comment)
    }
}
