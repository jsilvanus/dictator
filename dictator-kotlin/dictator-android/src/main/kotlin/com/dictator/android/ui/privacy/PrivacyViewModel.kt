/**
 * Privacy Settings ViewModel
 */
package com.dictator.android.ui.privacy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.dictator.core.data.privacy.UserPrivacySettings
import com.dictator.core.service.PrivacyService
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

data class PrivacyUiState(
    val settings: UserPrivacySettings? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val privacyScores: Map<String, Float> = emptyMap(),
    val gdprConsentProvided: Boolean = false,
    val piiDetectionEnabled: Boolean = true,
    val shareAnalytics: Boolean = false
)

@HiltViewModel
class PrivacyViewModel @Inject constructor(
    private val privacyService: PrivacyService
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(PrivacyUiState())
    val uiState: StateFlow<PrivacyUiState> = _uiState.asStateFlow()

    init {
        loadPrivacySettings()
    }

    private fun loadPrivacySettings() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val policies = privacyService.getAllProviderPolicies()
                val scores = policies.associate { 
                    it.provider to privacyService.getPrivacyScore(it.provider)
                }
                
                _uiState.value = _uiState.value.copy(
                    privacyScores = scores,
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to load privacy settings",
                    isLoading = false
                )
            }
        }
    }

    fun toggleGdprConsent() {
        _uiState.value = _uiState.value.copy(
            gdprConsentProvided = !_uiState.value.gdprConsentProvided
        )
    }

    fun togglePiiDetection() {
        _uiState.value = _uiState.value.copy(
            piiDetectionEnabled = !_uiState.value.piiDetectionEnabled
        )
    }

    fun toggleAnalytics() {
        _uiState.value = _uiState.value.copy(
            shareAnalytics = !_uiState.value.shareAnalytics
        )
    }

    fun dismissError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
