'use client';

import { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database';
import { UserPreferences } from '@/types';

export default function OnboardingPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const prefs = await DatabaseService.getPreferences();
    if (prefs) {
      setPreferences(prefs);
    }
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;

    await DatabaseService.savePreferences(preferences);
    setIsEditing(false);
    alert('Preferences saved successfully!');
  };

  const handleResetToDefaults = async () => {
    if (confirm('Are you sure you want to reset all preferences to defaults? This cannot be undone.')) {
      const defaults = await DatabaseService.getDefaultPreferences();
      setPreferences(defaults);
      await DatabaseService.savePreferences(defaults);
      alert('Preferences reset to defaults.');
    }
  };

  const handleExportData = async () => {
    try {
      const data = await DatabaseService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-organization-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImportData = async () => {
    try {
      await DatabaseService.importData(importData);
      setShowImportModal(false);
      setImportData('');
      alert('Data imported successfully! Please refresh the page.');
    } catch (error) {
      alert('Failed to import data. Please check the format and try again.');
    }
  };

  const handleClearAllData = async () => {
    if (confirm('Are you sure you want to clear ALL data? This will delete all habits, tasks, and history. This cannot be undone!')) {
      if (confirm('This action will permanently delete all your data. Type "DELETE" to confirm.')) {
        const confirmation = prompt('Type "DELETE" to confirm:');
        if (confirmation === 'DELETE') {
          await DatabaseService.clearAllData();
          alert('All data cleared. Please refresh the page.');
          window.location.reload();
        }
      }
    }
  };

  if (!preferences) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings & Preferences</h1>
            <p className="text-gray-600">
              Configure your app preferences, gym settings, and data management.
            </p>
          </div>
          <div className="flex space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit Settings
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    loadPreferences(); // Reset to saved preferences
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Basic Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <input
              type="text"
              value={preferences.timezone}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, timezone: e.target.value } : null)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select
              value={preferences.theme}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, theme: e.target.value as UserPreferences['theme'] } : null)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Default Sleep Schedule */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Sleep Schedule</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Sleep Time
            </label>
            <input
              type="time"
              value={preferences.defaultSleepStart}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, defaultSleepStart: e.target.value } : null)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Wake Time
            </label>
            <input
              type="time"
              value={preferences.defaultSleepEnd}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, defaultSleepEnd: e.target.value } : null)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Planning Constraints */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Planning Constraints</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Buffer Between Blocks (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="30"
              value={preferences.defaultBuffers}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, defaultBuffers: parseInt(e.target.value) } : null)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Downtime Protection (minutes)
            </label>
            <input
              type="number"
              min="0"
              max="120"
              value={preferences.defaultDowntimeProtection}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, defaultDowntimeProtection: parseInt(e.target.value) } : null)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Gym Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Gym Settings</h2>
        
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="gym-enabled"
              checked={preferences.gymSettings.enabled}
              onChange={(e) => setPreferences(prev => prev ? {
                ...prev,
                gymSettings: { ...prev.gymSettings, enabled: e.target.checked }
              } : null)}
              disabled={!isEditing}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <label htmlFor="gym-enabled" className="text-sm font-medium text-gray-700">
              Enable gym scheduling
            </label>
          </div>

          {preferences.gymSettings.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency (times per week)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={preferences.gymSettings.frequency}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, frequency: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="120"
                    value={preferences.gymSettings.defaultDuration}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, defaultDuration: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Window
                  </label>
                  <select
                    value={preferences.gymSettings.preferredWindow}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, preferredWindow: e.target.value as any }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="after-work">After Work</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="60"
                    value={preferences.gymSettings.minimumDuration}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, minimumDuration: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedtime Buffer (minutes)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="240"
                    value={preferences.gymSettings.bedtimeBuffer}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, bedtimeBuffer: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warmup Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={preferences.gymSettings.warmupDuration}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, warmupDuration: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cooldown Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={preferences.gymSettings.cooldownDuration}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, cooldownDuration: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h2>
        
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="notifications-enabled"
              checked={preferences.notifications.enabled}
              onChange={(e) => setPreferences(prev => prev ? {
                ...prev,
                notifications: { ...prev.notifications, enabled: e.target.checked }
              } : null)}
              disabled={!isEditing}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <label htmlFor="notifications-enabled" className="text-sm font-medium text-gray-700">
              Enable notifications
            </label>
          </div>

          {preferences.notifications.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Minutes Before
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={preferences.notifications.reminderMinutes}
                  onChange={(e) => setPreferences(prev => prev ? {
                    ...prev,
                    notifications: { ...prev.notifications, reminderMinutes: parseInt(e.target.value) }
                  } : null)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Check (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="120"
                  value={preferences.notifications.completionCheckMinutes}
                  onChange={(e) => setPreferences(prev => prev ? {
                    ...prev,
                    notifications: { ...prev.notifications, completionCheckMinutes: parseInt(e.target.value) }
                  } : null)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h2>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Export All Data
            </button>
            
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Import Data
            </button>
            
            <button
              onClick={handleResetToDefaults}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Reset to Defaults
            </button>
            
            <button
              onClick={handleClearAllData}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Clear All Data
            </button>
          </div>
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <span className="text-yellow-600 mr-3">⚠️</span>
              <div>
                <h4 className="font-medium text-yellow-900">Data Backup Recommended</h4>
                <p className="text-sm text-yellow-700">
                  Always export your data before making major changes or clearing data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Import Data</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste JSON Data
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Paste your exported JSON data here..."
                  />
                </div>
                
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <span className="text-red-600 mr-3">⚠️</span>
                    <div>
                      <h4 className="font-medium text-red-900">Warning</h4>
                      <p className="text-sm text-red-700">
                        Importing data will merge with existing data. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportData}
                  disabled={!importData.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300"
                >
                  Import Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}