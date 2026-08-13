package com.dictator.android.data

import android.content.Context
import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.android.AndroidSqliteDriver
import com.dictator.core.data.database.DatabaseDriverProvider
import com.dictator.core.database.DictatorDatabase

/**
 * Android implementation of the SQLDelight database driver provider.
 */
class AndroidDatabaseDriverProvider(
    private val context: Context,
    private val databaseName: String = "dictator.db"
) : DatabaseDriverProvider {
    override fun createDriver(): SqlDriver {
        return AndroidSqliteDriver(
            schema = DictatorDatabase.Schema,
            context = context,
            name = databaseName
        )
    }
}
