package com.dictator.core.util.validation

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Unit tests for Validator helpers used by the Android auth flow and core services.
 */
class ValidatorsTest {

    @Test
    fun validatesEmailAddresses() {
        assertTrue(Validators.isValidEmail("user@example.com"))
        assertTrue(Validators.isValidEmail("first.last+tag@sub.domain.co"))
        assertFalse(Validators.isValidEmail("not-an-email"))
        assertFalse(Validators.isValidEmail("user@"))
    }

    @Test
    fun validatesUsernames() {
        assertTrue(Validators.isValidUsername("demo"))
        assertTrue(Validators.isValidUsername("longusername12345678901234567890"))
        assertFalse(Validators.isValidUsername("ab"))
        assertFalse(Validators.isValidUsername(""))
    }

    @Test
    fun validatesDocumentTitles() {
        assertTrue(Validators.isValidDocumentTitle("A title"))
        assertFalse(Validators.isValidDocumentTitle(""))
        assertFalse(Validators.isValidDocumentTitle("   "))
    }

    @Test
    fun validatesPermissionsAndModes() {
        assertTrue(Validators.isValidPermission("edit"))
        assertFalse(Validators.isValidPermission("owner"))
        assertTrue(Validators.isValidAiMode("inline"))
        assertFalse(Validators.isValidAiMode("voice"))
    }
}
