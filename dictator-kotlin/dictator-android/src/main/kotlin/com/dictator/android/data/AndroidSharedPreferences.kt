package com.dictator.android.data

import android.content.Context
import android.content.SharedPreferences
import com.dictator.core.service.SharedPreferences as CoreSharedPreferences

/**
 * Android implementation of SharedPreferences using Android Context.
 * Provides persistent storage for application settings and preferences.
 */
class AndroidSharedPreferences(context: Context) : CoreSharedPreferences {
    private val preferences: SharedPreferences = context.getSharedPreferences(
        "dictator_preferences",
        Context.MODE_PRIVATE
    )

    override fun getString(key: String, defaultValue: String?): String? {
        return preferences.getString(key, defaultValue)
    }

    override fun setString(key: String, value: String) {
        preferences.edit().putString(key, value).apply()
    }

    override fun remove(key: String) {
        preferences.edit().remove(key).apply()
    }

    override fun clear() {
        preferences.edit().clear().apply()
    }
}
