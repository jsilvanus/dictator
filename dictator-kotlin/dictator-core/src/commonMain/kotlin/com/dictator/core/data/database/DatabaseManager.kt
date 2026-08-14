package com.dictator.core.data.database

import com.dictator.core.database.DictatorDatabase
import app.cash.sqldelight.db.SqlDriver
import io.github.aakira.napier.Napier

/**
 * Database initialization and management for the Kotlin Core.
 */

object DatabaseManager {
    private var database: DictatorDatabase? = null
    
    fun initialize(driver: SqlDriver) {
        synchronized(this) {
            if (database == null) {
                database = DictatorDatabase(driver)
                Napier.i("Database initialized")
            }
        }
    }
    
    fun getInstance(): DictatorDatabase {
        return database ?: throw IllegalStateException("Database not initialized. Call initialize() first.")
    }
    
    fun close() {
        database = null
    }
    
    fun isInitialized(): Boolean = database != null
}

/**
 * Provides database driver based on platform.
 */
interface DatabaseDriverProvider {
    fun createDriver(): SqlDriver
}
