'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataService } from '@/lib/sync/DataService';
import { DatabaseService } from '@/lib/database';
import type { UserPreferences, GymSettings } from '@/types';

export default function OnboardingPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');

  const loadPreferences = useCallback(async () => {
    const prefs = await DataService.getPreferences();
    if (prefs) {
      setPreferences(prefs);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPreferences();
  }, [loadPreferences]);

  const handleSavePreferences = async () => {
    if (!preferences) return;

    await DataService.savePreferences(preferences);

    setIsEditing(false);
    alert('Preferences saved successfully!');
  };

  const handleResetToDefaults = async () => {
    if (confirm('Are you sure you want to reset all preferences to defaults? This cannot be undone.')) {
      const defaults = await DataService.getDefaultPreferences();
      setPreferences(defaults);
      await DataService.savePreferences(defaults);
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
    } catch {
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImportData = async () => {
    try {
      await DatabaseService.importData(importData);
      setShowImportModal(false);
      setImportData('');
      alert('Data imported successfully! Please refresh the page.');
    } catch {
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

  // Common input styles
  const inputStyle = {
    background: 'var(--color-ivory)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-charcoal)'
  };

  const labelStyle = { color: 'var(--color-mist)' };

  if (!preferences) {
    return (
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div
            className="animate-spin rounded-full h-12 w-12 mx-auto"
            style={{ borderWidth: '2px', borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }}
          />
          <p className="mt-4 text-lg" style={{ color: 'var(--color-slate)' }}>Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1
              className="text-2xl mb-2"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--color-charcoal)' }}
            >
              Settings & Preferences
            </h1>
            <p style={{ color: 'var(--color-slate)' }}>
              Configure your app preferences, gym settings, and data management.
            </p>
          </div>
          <div className="flex space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(184, 151, 107, 0.3)'
                }}
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
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                  style={{ background: 'transparent', color: 'var(--color-stone)', border: '1px solid var(--color-border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-gym) 0%, #6B8F70 100%)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(139, 159, 130, 0.3)'
                  }}
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Basic Settings */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-charcoal)' }}>Basic Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="timezone" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
              Timezone
            </label>
            <input
              id="timezone"
              name="timezone"
              type="text"
              value={preferences.timezone}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, timezone: e.target.value } : null)}
              disabled={!isEditing}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="theme" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
              Theme
            </label>
            <select
              id="theme"
              name="theme"
              value={preferences.theme}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, theme: e.target.value as UserPreferences['theme'] } : null)}
              disabled={!isEditing}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
              style={inputStyle}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Default Sleep Schedule */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-charcoal)' }}>Default Sleep Schedule</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="defaultSleepStart" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
              Default Sleep Time
            </label>
            <input
              id="defaultSleepStart"
              name="defaultSleepStart"
              type="time"
              value={preferences.defaultSleepStart}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, defaultSleepStart: e.target.value } : null)}
              disabled={!isEditing}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="defaultSleepEnd" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
              Default Wake Time
            </label>
            <input
              id="defaultSleepEnd"
              name="defaultSleepEnd"
              type="time"
              value={preferences.defaultSleepEnd}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, defaultSleepEnd: e.target.value } : null)}
              disabled={!isEditing}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Planning Constraints */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-charcoal)' }}>Planning Constraints</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="defaultBuffers" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
              Default Buffer Between Blocks (minutes)
            </label>
            <input
              id="defaultBuffers"
              name="defaultBuffers"
              type="number"
              min="5"
              max="30"
              value={preferences.defaultBuffers}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, defaultBuffers: parseInt(e.target.value) } : null)}
              disabled={!isEditing}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="defaultDowntimeProtection" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
              Default Downtime Protection (minutes)
            </label>
            <input
              id="defaultDowntimeProtection"
              name="defaultDowntimeProtection"
              type="number"
              min="0"
              max="120"
              value={preferences.defaultDowntimeProtection}
              onChange={(e) => setPreferences(prev => prev ? { ...prev, defaultDowntimeProtection: parseInt(e.target.value) } : null)}
              disabled={!isEditing}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Gym Settings */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-charcoal)' }}>Gym Settings</h2>

        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="gym-enabled"
              name="gym-enabled"
              checked={preferences.gymSettings.enabled}
              onChange={(e) => setPreferences(prev => prev ? {
                ...prev,
                gymSettings: { ...prev.gymSettings, enabled: e.target.checked }
              } : null)}
              disabled={!isEditing}
              className="rounded disabled:opacity-50"
              style={{ accentColor: 'var(--color-gold)' }}
            />
            <label htmlFor="gym-enabled" className="text-sm font-medium" style={{ color: 'var(--color-stone)' }}>
              Enable gym scheduling
            </label>
          </div>

          {preferences.gymSettings.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="gym-frequency" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                    Frequency (times per week)
                  </label>
                  <input
                    id="gym-frequency"
                    name="gym-frequency"
                    type="number"
                    min="1"
                    max="7"
                    value={preferences.gymSettings.frequency}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, frequency: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="gym-default-duration" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                    Default Duration (minutes)
                  </label>
                  <input
                    id="gym-default-duration"
                    name="gym-default-duration"
                    type="number"
                    min="20"
                    max="120"
                    value={preferences.gymSettings.defaultDuration}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, defaultDuration: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="gym-preferred-window" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                    Preferred Window
                  </label>
                  <select
                    id="gym-preferred-window"
                    name="gym-preferred-window"
                    value={preferences.gymSettings.preferredWindow}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, preferredWindow: e.target.value as GymSettings['preferredWindow'] }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                    style={inputStyle}
                  >
                    <option value="after-work">After Work</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="gym-min-duration" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                    Minimum Duration (minutes)
                  </label>
                  <input
                    id="gym-min-duration"
                    name="gym-min-duration"
                    type="number"
                    min="10"
                    max="60"
                    value={preferences.gymSettings.minimumDuration}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, minimumDuration: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="gym-bedtime-buffer" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                    Bedtime Buffer (minutes)
                  </label>
                  <input
                    id="gym-bedtime-buffer"
                    name="gym-bedtime-buffer"
                    type="number"
                    min="30"
                    max="240"
                    value={preferences.gymSettings.bedtimeBuffer}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, bedtimeBuffer: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="gym-warmup-duration" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                    Warmup Duration (minutes)
                  </label>
                  <input
                    id="gym-warmup-duration"
                    name="gym-warmup-duration"
                    type="number"
                    min="0"
                    max="15"
                    value={preferences.gymSettings.warmupDuration}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, warmupDuration: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="gym-cooldown-duration" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                    Cooldown Duration (minutes)
                  </label>
                  <input
                    id="gym-cooldown-duration"
                    name="gym-cooldown-duration"
                    type="number"
                    min="0"
                    max="15"
                    value={preferences.gymSettings.cooldownDuration}
                    onChange={(e) => setPreferences(prev => prev ? {
                      ...prev,
                      gymSettings: { ...prev.gymSettings, cooldownDuration: parseInt(e.target.value) }
                    } : null)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                    style={inputStyle}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notification Settings */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-charcoal)' }}>Notification Settings</h2>

        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="notifications-enabled"
              name="notifications-enabled"
              checked={preferences.notifications.enabled}
              onChange={(e) => setPreferences(prev => prev ? {
                ...prev,
                notifications: { ...prev.notifications, enabled: e.target.checked }
              } : null)}
              disabled={!isEditing}
              className="rounded disabled:opacity-50"
              style={{ accentColor: 'var(--color-gold)' }}
            />
            <label htmlFor="notifications-enabled" className="text-sm font-medium" style={{ color: 'var(--color-stone)' }}>
              Enable notifications
            </label>
          </div>

          {preferences.notifications.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="notifications-reminder-minutes" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                  Reminder Minutes Before
                </label>
                <input
                  id="notifications-reminder-minutes"
                  name="notifications-reminder-minutes"
                  type="number"
                  min="5"
                  max="60"
                  value={preferences.notifications.reminderMinutes}
                  onChange={(e) => setPreferences(prev => prev ? {
                    ...prev,
                    notifications: { ...prev.notifications, reminderMinutes: parseInt(e.target.value) }
                  } : null)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="notifications-completion-check" className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                  Completion Check (minutes)
                </label>
                <input
                  id="notifications-completion-check"
                  name="notifications-completion-check"
                  type="number"
                  min="15"
                  max="120"
                  value={preferences.notifications.completionCheckMinutes}
                  onChange={(e) => setPreferences(prev => prev ? {
                    ...prev,
                    notifications: { ...prev.notifications, completionCheckMinutes: parseInt(e.target.value) }
                  } : null)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none disabled:opacity-60"
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Data Management */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-charcoal)' }}>Data Management</h2>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExportData}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, var(--color-work) 0%, #5A8A8B 100%)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(122, 158, 159, 0.3)'
              }}
            >
              Export All Data
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, var(--color-gym) 0%, #6B8F70 100%)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(139, 159, 130, 0.3)'
              }}
            >
              Import Data
            </button>

            <button
              onClick={handleResetToDefaults}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, var(--color-task) 0%, #A88F50 100%)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(196, 163, 90, 0.3)'
              }}
            >
              Reset to Defaults
            </button>

            <button
              onClick={handleClearAllData}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #c96464 0%, #A85050 100%)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(201, 100, 100, 0.3)'
              }}
            >
              Clear All Data
            </button>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{ background: 'rgba(196, 163, 90, 0.1)', border: '1px solid rgba(196, 163, 90, 0.2)' }}
          >
            <div className="flex items-start">
              <span style={{ color: 'var(--color-task)' }} className="mr-3">⚠️</span>
              <div>
                <h4 className="font-medium" style={{ color: 'var(--color-charcoal)' }}>Data Backup Recommended</h4>
                <p className="text-sm" style={{ color: 'var(--color-slate)' }}>
                  Always export your data before making major changes or clearing data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(44, 40, 37, 0.4)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-elevated)' }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2
                  className="text-xl"
                  style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--color-charcoal)' }}
                >
                  Import Data
                </h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--color-mist)' }}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                    Paste JSON Data
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none resize-none"
                    style={inputStyle}
                    placeholder="Paste your exported JSON data here..."
                  />
                </div>

                <div
                  className="p-4 rounded-lg"
                  style={{ background: 'rgba(201, 100, 100, 0.1)', border: '1px solid rgba(201, 100, 100, 0.2)' }}
                >
                  <div className="flex items-start">
                    <span style={{ color: '#c96464' }} className="mr-3">⚠️</span>
                    <div>
                      <h4 className="font-medium" style={{ color: 'var(--color-charcoal)' }}>Warning</h4>
                      <p className="text-sm" style={{ color: 'var(--color-slate)' }}>
                        Importing data will merge with existing data. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="flex justify-end space-x-3 mt-6 pt-6"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData('');
                  }}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                  style={{ background: 'transparent', color: 'var(--color-stone)', border: '1px solid var(--color-border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportData}
                  disabled={!importData.trim()}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                  style={{
                    background: importData.trim()
                      ? 'linear-gradient(135deg, var(--color-gym) 0%, #6B8F70 100%)'
                      : 'var(--color-ivory)',
                    color: importData.trim() ? 'white' : 'var(--color-mist)',
                    boxShadow: importData.trim() ? '0 2px 8px rgba(139, 159, 130, 0.3)' : 'none'
                  }}
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