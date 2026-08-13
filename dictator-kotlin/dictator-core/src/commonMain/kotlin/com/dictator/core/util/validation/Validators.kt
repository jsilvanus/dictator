package com.dictator.core.util.validation

/**
 * Validation utilities for common domain entities.
 */
object Validators {
    
    /**
     * Validates an email address format.
     */
    fun isValidEmail(email: String): Boolean {
        return email.matches(Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"))
    }
    
    /**
     * Validates a username (non-empty, 3-50 characters).
     */
    fun isValidUsername(username: String): Boolean {
        return username.length in 3..50
    }
    
    /**
     * Validates a document title (non-empty, 1-200 characters).
     */
    fun isValidDocumentTitle(title: String): Boolean {
        return title.isNotBlank() && title.length in 1..200
    }
    
    /**
     * Validates a folder name (non-empty, 1-100 characters).
     */
    fun isValidFolderName(name: String): Boolean {
        return name.isNotBlank() && name.length in 1..100
    }
    
    /**
     * Validates a permission string.
     */
    fun isValidPermission(permission: String): Boolean {
        return permission in setOf("view", "edit", "admin")
    }
    
    /**
     * Validates an AI mode.
     */
    fun isValidAiMode(mode: String): Boolean {
        return mode in setOf("inline", "panel")
    }
    
    /**
     * Validates a device source.
     */
    fun isValidDeviceSource(source: String): Boolean {
        return source in setOf("kotlin", "web", "android")
    }
    
    /**
     * Validates a sync status.
     */
    fun isValidSyncStatus(status: String): Boolean {
        return status in setOf("pending", "failed", "synced")
    }
    
    /**
     * Validates a conflict status.
     */
    fun isValidConflictStatus(status: String): Boolean {
        return status in setOf("unresolved", "resolved")
    }
}
