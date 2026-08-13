package com.dictator.core.data.database

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import app.cash.sqldelight.db.SqlDriver
import com.dictator.core.database.DictatorDatabase
import java.io.File

/**
 * JVM-specific database driver provider using SQLite.
 */

class JvmDatabaseDriverProvider(
    private val dbPath: String = "dictator.db"
) : DatabaseDriverProvider {
    
    override fun createDriver(): SqlDriver {
        // Create database file if it doesn't exist
        val dbFile = File(dbPath)
        val isNewDb = !dbFile.exists()
        
        val driver = JdbcSqliteDriver(
            url = "jdbc:sqlite:$dbPath",
            properties = mapOf(
                "journal_mode" to "WAL",  // Write-Ahead Logging for better concurrency
                "foreign_keys" to "ON"    // Enable foreign key constraints
            )
        )
        
        // Run migrations on first creation
        if (isNewDb) {
            DictatorDatabase.Schema.create(driver)
        }
        
        return driver
    }
}
