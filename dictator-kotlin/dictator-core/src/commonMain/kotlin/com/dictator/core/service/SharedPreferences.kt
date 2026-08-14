package com.dictator.core.service

/**
 * Platform-agnostic shared preferences interface.
 * Platform-specific implementations should be provided by the platform layer.
 */
interface SharedPreferences {
    /**
     * Retrieves a string value from preferences.
     * Returns the default value if key not found.
     */
    fun getString(key: String, defaultValue: String? = null): String?
    
    /**
     * Stores a string value in preferences.
     */
    fun setString(key: String, value: String)
    
    /**
     * Removes a specific key from preferences.
     */
    fun remove(key: String)
    
    /**
     * Clears all preferences.
     */
    fun clear()
}

/**
 * In-memory implementation of SharedPreferences for testing and offline-first scenarios.
 * Not suitable for production persistence - platform layers should provide implementations
 * backed by actual persistent storage (UserDefaults on iOS, SharedPreferences on Android, etc.)
 */
class InMemorySharedPreferences : SharedPreferences {
    private val storage = mutableMapOf<String, String>()
    
    override fun getString(key: String, defaultValue: String?): String? {
        return storage[key] ?: defaultValue
    }
    
    override fun setString(key: String, value: String) {
        storage[key] = value
    }
    
    override fun remove(key: String) {
        storage.remove(key)
    }
    
    override fun clear() {
        storage.clear()
    }
}
