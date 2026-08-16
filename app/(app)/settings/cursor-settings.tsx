/**
 * Cursor Navigation Settings Page
 * Allows users to customize cursor commands and aliases
 */

'use client';

import { useMemo,useState } from 'react';

import { getCursorCommandsForLanguage } from '@/lib/data/cursor-command-defaults';
import { type UserSettings } from '@/lib/data/default-settings';
import { parseCursorCommandsFromText } from '@/lib/voice/cursor-parser';

interface CursorSettingsPageProps {
  settings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

export function CursorSettingsPage({ settings, onUpdateSettings }: CursorSettingsPageProps) {
  const language = settings.language || 'en';
  const defaultCommandSet = getCursorCommandsForLanguage(language);

  // Custom aliases state
  const [customAliases, setCustomAliases] = useState<Record<string, string>>(
    (settings as any).customCommandAliases || {},
  );
  const [newAlias, setNewAlias] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [cursorSize, setCursorSize] = useState<'paragraph' | 'word' | 'character'>(
    ((settings as any).cursorDefaultSize as any) || 'paragraph',
  );
  const [testText, setTestText] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Get all available commands
  const allCommands = useMemo(() => {
    const cmds = new Set<string>();

    // Add default navigation commands
    defaultCommandSet.navigation.next.voicePhrases.forEach((p) => cmds.add(p));
    defaultCommandSet.navigation.previous.voicePhrases.forEach((p) => cmds.add(p));

    // Add default selection commands
    defaultCommandSet.selection.select.voicePhrases.forEach((p) => cmds.add(p));
    defaultCommandSet.selection.selectAll.voicePhrases.forEach((p) => cmds.add(p));
    defaultCommandSet.selection.selectStart.voicePhrases.forEach((p) => cmds.add(p));
    defaultCommandSet.selection.selectEnd.voicePhrases.forEach((p) => cmds.add(p));

    // Add cursor size commands
    defaultCommandSet.cursorSize.big.voicePhrases.forEach((p) => cmds.add(p));
    defaultCommandSet.cursorSize.medium.voicePhrases.forEach((p) => cmds.add(p));
    defaultCommandSet.cursorSize.small.voicePhrases.forEach((p) => cmds.add(p));

    return Array.from(cmds);
  }, [defaultCommandSet]);

  const handleAddAlias = async () => {
    if (!newAlias.trim() || !newCommand.trim()) {
      return;
    }

    const updated = {
      ...customAliases,
      [newAlias.toLowerCase()]: newCommand,
    };

    setCustomAliases(updated);
    setNewAlias('');
    setNewCommand('');

    try {
      setIsSaving(true);
      await onUpdateSettings({
        ...settings,
        customCommandAliases: updated,
      } as any);
    } catch (error) {
      console.error('Failed to save aliases:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAlias = async (alias: string) => {
    const updated = { ...customAliases };
    delete updated[alias];
    setCustomAliases(updated);

    try {
      setIsSaving(true);
      await onUpdateSettings({
        ...settings,
        customCommandAliases: updated,
      } as any);
    } catch (error) {
      console.error('Failed to save aliases:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAliases = () => {
    if (!testText.trim()) {
      return;
    }

    const results = parseCursorCommandsFromText(testText, language, customAliases);
    setTestResults(results);
  };

  const handleChangeCursorSize = async (newSize: 'paragraph' | 'word' | 'character') => {
    setCursorSize(newSize);

    try {
      setIsSaving(true);
      await onUpdateSettings({
        ...settings,
        cursorDefaultSize: newSize,
      } as any);
    } catch (error) {
      console.error('Failed to save cursor size:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Cursor Navigation</h2>
        <p className="text-gray-600 mt-1">Customize voice commands for text selection and navigation</p>
      </div>

      {/* Default Cursor Size */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Cursor Size</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose the default cursor size for navigation. Say &quot;big&quot;, &quot;medium&quot;, or &quot;small&quot; to change it
          during use.
        </p>
        <div className="flex gap-3">
          {(['paragraph', 'word', 'character'] as const).map((size) => (
            <button
              key={size}
              onClick={() => handleChangeCursorSize(size)}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                cursorSize === size
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              aria-label={`Set default cursor size to ${size}`}
            >
              {size === 'paragraph' && 'Big (Paragraph)'}
              {size === 'word' && 'Medium (Word)'}
              {size === 'character' && 'Small (Character)'}
            </button>
          ))}
        </div>
      </div>

      {/* Default Commands Reference */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Commands</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Navigation</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm">
                <p className="text-gray-600">Next:</p>
                <p className="text-blue-600">{defaultCommandSet.navigation.next.voicePhrases.join(', ')}</p>
              </div>
              <div className="text-sm">
                <p className="text-gray-600">Previous:</p>
                <p className="text-blue-600">
                  {defaultCommandSet.navigation.previous.voicePhrases.join(', ')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Selection</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm">
                <p className="text-gray-600">Select:</p>
                <p className="text-blue-600">{defaultCommandSet.selection.select.voicePhrases.join(', ')}</p>
              </div>
              <div className="text-sm">
                <p className="text-gray-600">Select All:</p>
                <p className="text-blue-600">
                  {defaultCommandSet.selection.selectAll.voicePhrases.join(', ')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Cursor Size</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm">
                <p className="text-gray-600">Big:</p>
                <p className="text-blue-600">{defaultCommandSet.cursorSize.big.voicePhrases.join(', ')}</p>
              </div>
              <div className="text-sm">
                <p className="text-gray-600">Medium:</p>
                <p className="text-blue-600">
                  {defaultCommandSet.cursorSize.medium.voicePhrases.join(', ')}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-gray-600">Small:</p>
                <p className="text-blue-600">
                  {defaultCommandSet.cursorSize.small.voicePhrases.join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Aliases */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Aliases</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add your own voice keywords as shortcuts for commands. For example, alias &quot;go&quot; to &quot;next&quot;.
        </p>

        {/* Add Alias Form */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Voice Word</label>
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder="e.g., 'go', 'advance'"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Standard Command</label>
              <select
                value={newCommand}
                onChange={(e) => setNewCommand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={isSaving}
              >
                <option value="">Select a command...</option>
                {allCommands.map((cmd) => (
                  <option key={cmd} value={cmd}>
                    {cmd}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleAddAlias}
            disabled={isSaving || !newAlias.trim() || !newCommand.trim()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Add Alias
          </button>
        </div>

        {/* List of Custom Aliases */}
        {Object.keys(customAliases).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(customAliases).map(([alias, command]) => (
              <div
                key={alias}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">&quot;{alias}&quot;</p>
                  <p className="text-xs text-gray-600">→ {command}</p>
                </div>
                <button
                  onClick={() => handleRemoveAlias(alias)}
                  disabled={isSaving}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No custom aliases yet</p>
        )}
      </div>

      {/* Test Aliases */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Your Commands</h3>
        <p className="text-sm text-gray-600 mb-4">
          Type a voice command to see how it would be interpreted
        </p>

        <div className="space-y-4">
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="e.g., 'select big go forward'"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            rows={3}
          />
          <button
            onClick={handleTestAliases}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
          >
            Test Commands
          </button>

          {testResults.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-900 mb-2">Recognized Commands:</p>
              <div className="space-y-1">
                {testResults.map((cmd, i) => (
                  <p key={i} className="text-sm text-green-700 font-mono">
                    → {cmd}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Commands are case-insensitive</li>
          <li>• Chain commands together: &quot;select big next next next&quot;</li>
          <li>• Aliases override default commands when they match</li>
          <li>• You can always use default commands even with custom aliases</li>
        </ul>
      </div>
    </div>
  );
}
