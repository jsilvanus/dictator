package com.dictator.android.data.shadow

import com.dictator.core.service.SharedPreferences

/** Preference keys for shadow-mode intent logging. Both default to off. */
object ShadowSettings {
    const val ENABLED = "shadow_intent_enabled"
    const val STORE_TEXT = "shadow_intent_store_text"

    fun isEnabled(prefs: SharedPreferences) = prefs.getString(ENABLED, null) == "yes"
    fun storesText(prefs: SharedPreferences) = prefs.getString(STORE_TEXT, null) == "yes"
}
