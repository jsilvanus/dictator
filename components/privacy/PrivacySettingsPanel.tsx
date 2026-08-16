/**
 * PrivacySettingsPanel Component
 *
 * Comprehensive privacy settings interface
 * Allows users to configure:
 * - Telemetry and data collection
 * - Backup policies
 * - Sensitive data detection
 * - AI provider preferences
 * - Encryption settings
 */

'use client';

import React, { useEffect, useState } from 'react';

import type { AiProviderPolicy, UserPrivacySettings } from '@/lib/privacy/types';

import { ProviderPolicyCard } from './ProviderPolicyCard';

interface PrivacySettingsPanelProps {
  userId: string;
  onSettingsUpdate?: (settings: UserPrivacySettings) => void;
  initialSettings?: Partial<UserPrivacySettings>;
}

const DEFAULT_SETTINGS: UserPrivacySettings = {
  userId: '',
  telemetryEnabled: false, // Privacy-first: disabled by default
  crashReportsEnabled: false,
  sensitiveDataDetectionEnabled: true,
  warnBeforeSendingToCloud: true,
  allowDataForTraining: false,
  backupEncryptionRequired: true,
  autoDeleteAiSessions: false,
  aiSessionRetentionDays: 30,
  preferLocalProcessing: true,
  encryptLocalStorage: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

interface ProviderWithPolicy {
  policy: AiProviderPolicy;
  rating: number;
}

export const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({
  userId,
  onSettingsUpdate,
  initialSettings = {},
}) => {
  const [settings, setSettings] = useState<UserPrivacySettings>({
    ...DEFAULT_SETTINGS,
    userId,
    ...initialSettings,
  });

  const [providers, setProviders] = useState<ProviderWithPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'storage' | 'providers'>('overview');

  // Load provider policies
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch('/api/ai/privacy/policies');
        if (response.ok) {
          const data = await response.json();
          setProviders(data.providers || []);
        }
      } catch (error) {
        console.error('Failed to load provider policies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  const handleSettingChange = async (key: keyof UserPrivacySettings, value: unknown) => {
    const updated = { ...settings, [key]: value, updatedAt: new Date() };
    setSettings(updated);
    setSaveStatus('saving');

    try {
      const response = await fetch('/api/user/privacy-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (response.ok) {
        setSaveStatus('saved');
        onSettingsUpdate?.(updated);
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 bg-gray-50 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Privacy & Data Settings</h1>
        <p className="mt-2 text-gray-600">
          Control how your data is collected, processed, and shared
        </p>
      </div>

      {/* Save Status Indicator */}
      {saveStatus !== 'idle' && (
        <div
          className={`rounded-lg p-4 ${
            saveStatus === 'saved'
              ? 'bg-green-50 text-green-800'
              : saveStatus === 'saving'
                ? 'bg-blue-50 text-blue-800'
                : 'bg-red-50 text-red-800'
          }`}
        >
          {saveStatus === 'saving' && '⏳ Saving...'}
          {saveStatus === 'saved' && '✅ Settings saved'}
          {saveStatus === 'error' && '❌ Failed to save settings'}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['overview', 'telemetry', 'storage', 'providers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <h2 className="text-lg font-bold text-green-900">✅ Privacy-First Defaults Active</h2>
            <p className="mt-2 text-sm text-green-800">
              Dictator is configured with privacy-first defaults. No data is collected without your
              explicit consent.
            </p>
            <ul className="mt-4 list-inside space-y-1 text-sm text-green-800">
              <li>✓ Telemetry disabled by default</li>
              <li>✓ Sensitive data detection enabled</li>
              <li>✓ Warnings before cloud transmission</li>
              <li>✓ No data used for model training (default)</li>
              <li>✓ Local-first processing preferred</li>
            </ul>
          </div>

          {/* Quick Toggle Options */}
          <div className="grid gap-4 md:grid-cols-2">
            <SettingCard
              title="Sensitive Data Detection"
              description="Warn before sending credit cards, passwords, API keys, etc."
              enabled={settings.sensitiveDataDetectionEnabled}
              onChange={(value) =>
                handleSettingChange('sensitiveDataDetectionEnabled', value)
              }
              icon="🔍"
            />
            <SettingCard
              title="Cloud Transmission Warnings"
              description="Show dialog before sending content to cloud AI providers"
              enabled={settings.warnBeforeSendingToCloud}
              onChange={(value) =>
                handleSettingChange('warnBeforeSendingToCloud', value)
              }
              icon="⚠️"
            />
            <SettingCard
              title="Prefer Local Processing"
              description="Suggest local models (Ollama) over cloud providers"
              enabled={settings.preferLocalProcessing}
              onChange={(value) =>
                handleSettingChange('preferLocalProcessing', value)
              }
              icon="🖥️"
            />
            <SettingCard
              title="Encrypt Local Storage"
              description="Encrypt all documents and settings on your device"
              enabled={settings.encryptLocalStorage}
              onChange={(value) =>
                handleSettingChange('encryptLocalStorage', value)
              }
              icon="🔐"
            />
          </div>
        </div>
      )}

      {/* Telemetry Tab */}
      {activeTab === 'telemetry' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Telemetry & Analytics</h2>

            <div className="mt-4 space-y-4">
              <SettingCard
                title="Telemetry Collection"
                description="Send usage analytics (operation types, latency, token counts only - never document content or prompts)"
                enabled={settings.telemetryEnabled}
                onChange={(value) => handleSettingChange('telemetryEnabled', value)}
                icon="📊"
              />

              <SettingCard
                title="Crash Report Submission"
                description="Send crash reports to help improve stability (no sensitive data included)"
                enabled={settings.crashReportsEnabled}
                onChange={(value) => handleSettingChange('crashReportsEnabled', value)}
                icon="🐛"
              />

              {/* Telemetry Details */}
              {(settings.telemetryEnabled || settings.crashReportsEnabled) && (
                <div className="mt-4 rounded-lg bg-blue-50 p-4 border border-blue-200 text-sm text-blue-900">
                  <p className="font-semibold mb-2">📝 What we collect:</p>
                  <ul className="list-inside space-y-1 text-xs">
                    <li>✓ App version and platform</li>
                    <li>✓ Operation types (e.g., &quot;document_edit&quot;, &quot;ai_request&quot;)</li>
                    <li>✓ AI model used (but not the prompt)</li>
                    <li>✓ Response latency in milliseconds</li>
                    <li>✓ Token counts (if applicable)</li>
                    <li>✓ Error categories (not full error messages)</li>
                  </ul>
                  <p className="font-semibold mt-3 mb-2">❌ What we never collect:</p>
                  <ul className="list-inside space-y-1 text-xs">
                    <li>Document content or document text</li>
                    <li>Prompts or AI responses</li>
                    <li>Your name, email, or user identifier</li>
                    <li>Transcripts or audio data</li>
                    <li>Full stack traces or error messages</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Storage Tab */}
      {activeTab === 'storage' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Local & Backup Storage</h2>

            <div className="mt-4 space-y-4">
              <SettingCard
                title="Encrypt Local Database"
                description="Use device encryption for all local documents and settings"
                enabled={settings.encryptLocalStorage}
                onChange={(value) => handleSettingChange('encryptLocalStorage', value)}
                icon="🔐"
              />

              <SettingCard
                title="Require Backup Encryption"
                description="Backup encryption must be configured before using cloud/device backup"
                enabled={settings.backupEncryptionRequired}
                onChange={(value) => handleSettingChange('backupEncryptionRequired', value)}
                icon="💾"
              />

              <div className="mt-4 rounded-lg bg-gray-100 p-4 border border-gray-300">
                <label className="flex items-center gap-3">
                  <span className="flex-1">
                    <span className="font-semibold text-gray-900">Auto-Delete AI Sessions</span>
                    <p className="text-sm text-gray-600">
                      Automatically delete AI conversation history after:
                    </p>
                  </span>
                </label>
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.aiSessionRetentionDays}
                    onChange={(e) =>
                      handleSettingChange('aiSessionRetentionDays', parseInt(e.target.value))
                    }
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-center"
                  />
                  <span className="py-1 text-gray-700">days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Providers Tab */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">AI Provider Policies</h2>
            <p className="mt-2 text-sm text-gray-600">
              Review privacy policies and data handling practices for each AI provider
            </p>

            {loading ? (
              <div className="mt-4 text-center text-gray-600">Loading provider information...</div>
            ) : providers.length > 0 ? (
              <div className="mt-4 space-y-4">
                {providers.map((item) => (
                  <ProviderPolicyCard
                    key={item.policy.provider}
                    policy={item.policy}
                    privacyRating={item.rating}
                    compact={false}
                    showLink={true}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 text-center text-gray-600">
                No provider information available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6 text-sm text-gray-600">
        <p>
          For detailed information about privacy practices, see{' '}
          <a href="/docs/privacy-architecture" className="font-medium text-blue-600 hover:text-blue-800">
            Privacy Architecture Documentation
          </a>
        </p>
      </div>
    </div>
  );
};

/**
 * Helper component for privacy setting toggles
 */
interface SettingCardProps {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  icon?: string;
}

const SettingCard: React.FC<SettingCardProps> = ({
  title,
  description,
  enabled,
  onChange,
  icon,
}) => (
  <div className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4">
    {icon && <span className="text-2xl flex-shrink-0">{icon}</span>}
    <div className="flex-1">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`ml-4 flex h-8 w-14 flex-shrink-0 items-center rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export default PrivacySettingsPanel;
