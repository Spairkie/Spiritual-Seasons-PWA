/**
 * Privacy & Data Management Module
 * Handle data privacy, clear data, and user trust features
 */

const Privacy = (() => {
  let privacyListenerManager = null;

  /**
   * Initialize privacy module
   */
  async function init() {
    Utils.debug.log('✓ Privacy module initialized');
    return true;
  }

  /**
   * Get privacy summary
   */
  async function getPrivacySummary() {
    const journalEntries = await Store.getAllJournalEntries();
    const audioNotes = await Store.getAllAudioNotes();
    const reflections = await Store.getAllWeeklyReflections();
    const progress = await Store.getAllProgress();
    const favorites = await Store.getAllFavorites();
    const settings = await Store.getSettings();

    return {
      journalEntries: journalEntries.length,
      audioNotes: audioNotes.length,
      reflections: reflections.length,
      progressDays: progress.length,
      favorites: favorites.length,
      settingsConfigured: Object.keys(settings || {}).length > 0
    };
  }

  /**
   * Calculate storage usage
   */
  async function getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentUsed: estimate.quota > 0 
            ? Math.round((estimate.usage / estimate.quota) * 100) 
            : 0
        };
      } catch (error) {
        Utils.debug.error('Error getting storage estimate:', error);
      }
    }

    return { usage: 0, quota: 0, percentUsed: 0 };
  }

  /**
   * Format bytes to human readable
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Clear all user data
   */
  async function clearAllData() {
    const confirmed = await Modal.confirm({
      title: '⚠️ Clear All Data',
      message: 'This will permanently delete all your journal entries, audio notes, reflections, progress, and settings. This action cannot be undone. Are you absolutely sure?',
      confirmText: 'Yes, Delete Everything',
      cancelText: 'Cancel',
      confirmDanger: true
    });

    if (!confirmed) return false;

    // Double confirm
    const doubleConfirmed = await Modal.confirm({
      title: 'Final Confirmation',
      message: 'This is your last chance to cancel. All your spiritual journey data will be permanently lost.',
      confirmText: 'Delete All Data',
      cancelText: 'Keep My Data',
      confirmDanger: true
    });

    if (!doubleConfirmed) return false;

    try {
      Toast.info('Clearing all data...');

      // Clear all stores
      await Store.resetAllData();

      // Clear any cached data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear local storage
      localStorage.clear();

      Toast.success('All data cleared successfully');

      // Reload the app
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);

      return true;
    } catch (error) {
      Utils.debug.error('Error clearing data:', error);
      Toast.error('Failed to clear all data');
      return false;
    }
  }

  /**
   * Clear specific data type
   */
  async function clearDataType(type) {
    const typeNames = {
      journal: 'Journal Entries',
      audio: 'Audio Notes',
      reflections: 'Weekly Reflections',
      progress: 'Progress Data',
      favorites: 'Favorites',
      settings: 'Settings'
    };

    const confirmed = await Modal.confirm({
      title: `Clear ${typeNames[type]}`,
      message: `This will permanently delete all your ${typeNames[type].toLowerCase()}. This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmDanger: true
    });

    if (!confirmed) return false;

    try {
      switch (type) {
        case 'journal':
          // Clear all journal entries
          await Store.clear(Store.STORES.JOURNAL);
          break;

        case 'audio':
          // Clear all audio notes
          const audioNotes = await Store.getAllAudioNotes();
          for (const note of audioNotes) {
            await Store.deleteAudioNote(note.day);
          }
          break;

        case 'reflections':
          // Clear all reflections
          const reflections = await Store.getAllWeeklyReflections();
          for (const reflection of reflections) {
            await Store.deleteWeeklyReflection(reflection.week);
          }
          break;

        case 'progress':
          // Clear progress data
          await Store.clear(Store.STORES.PROGRESS);
          break;

        case 'favorites':
          // Clear favorites
          await Store.clear(Store.STORES.FAVORITES);
          break;

        case 'settings':
          // Clear settings
          await Store.resetSettings();
          break;
      }

      Toast.success(`${typeNames[type]} cleared successfully`);
      return true;
    } catch (error) {
      Utils.debug.error(`Error clearing ${type}:`, error);
      Toast.error(`Failed to clear ${typeNames[type].toLowerCase()}`);
      return false;
    }
  }

  /**
   * Export all data (backup)
   */
  async function exportAllData() {
    try {
      const data = await Store.exportAllData();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `spiritual-seasons-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      Toast.success('Data exported successfully');
      return true;
    } catch (error) {
      Utils.debug.error('Export error:', error);
      Toast.error('Failed to export data');
      return false;
    }
  }

  /**
   * Validate import data structure
   * @param {any} data - The data to validate
   * @returns {Object} - Validation result with {valid: boolean, error: string}
   */
  function validateImportData(data) {
    // Check if data exists and is an object
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid data format: not an object' };
    }

    // Check required top-level keys
    const requiredKeys = ['journal', 'progress', 'settings', 'favorites'];
    for (const key of requiredKeys) {
      if (!(key in data)) {
        return { valid: false, error: `Missing required section: ${key}` };
      }
    }

    // Validate journal entries structure
    if (data.journal && Array.isArray(data.journal)) {
      for (let i = 0; i < data.journal.length; i++) {
        const entry = data.journal[i];
        if (!entry.day || typeof entry.day !== 'number' || entry.day < 1 || entry.day > 120) {
          return { valid: false, error: `Invalid journal entry at index ${i}: missing or invalid day` };
        }
        if (typeof entry.content !== 'string') {
          return { valid: false, error: `Invalid journal entry at index ${i}: content must be string` };
        }
      }
    } else if (data.journal && typeof data.journal === 'object') {
      // Handle object format (legacy)
      const keys = Object.keys(data.journal);
      for (const key of keys) {
        const entry = data.journal[key];
        if (!entry.day || typeof entry.day !== 'number') {
          return { valid: false, error: `Invalid journal entry for key ${key}` };
        }
      }
    }

    // Validate progress structure
    if (data.progress && Array.isArray(data.progress)) {
      for (let i = 0; i < data.progress.length; i++) {
        const prog = data.progress[i];
        if (!prog.day || typeof prog.day !== 'number' || prog.day < 1 || prog.day > 120) {
          return { valid: false, error: `Invalid progress entry at index ${i}: missing or invalid day` };
        }
        if (typeof prog.completed !== 'boolean') {
          return { valid: false, error: `Invalid progress entry at index ${i}: completed must be boolean` };
        }
      }
    }

    // Validate favorites structure
    if (data.favorites && Array.isArray(data.favorites)) {
      for (let i = 0; i < data.favorites.length; i++) {
        const fav = data.favorites[i];
        if (!fav.day || typeof fav.day !== 'number' || fav.day < 1 || fav.day > 120) {
          return { valid: false, error: `Invalid favorites entry at index ${i}: missing or invalid day` };
        }
      }
    }

    // Validate settings structure
    if (data.settings && typeof data.settings !== 'object') {
      return { valid: false, error: 'Invalid settings format: must be an object' };
    }

    return { valid: true };
  }

  /**
   * Import data (restore from backup) with validation
   */
  async function importData() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(false);
          return;
        }

        try {
          const text = await file.text();
          const data = JSON.parse(text);

          // Comprehensive validation
          const validation = validateImportData(data);
          if (!validation.valid) {
            Toast.error(`Import failed: ${validation.error}`);
            Utils.debug.error('Import validation error:', validation.error);
            resolve(false);
            return;
          }

          const confirmed = await Modal.confirm({
            title: 'Import Data',
            message: 'This will replace your current data with the imported data. Your current data will be lost. Continue?',
            confirmText: 'Import',
            cancelText: 'Cancel',
            confirmDanger: true
          });

          if (!confirmed) {
            resolve(false);
            return;
          }

          const result = await Store.importData(data);
          
          if (result.success) {
            Toast.success(result.message || 'Data imported successfully');
            
            // Reload the app
            setTimeout(() => {
              window.location.reload();
            }, 1000);

            resolve(true);
          } else {
            Toast.error(result.message || 'Failed to import data');
            resolve(false);
          }
        } catch (error) {
          Utils.debug.error('Import error:', error);
          if (error instanceof SyntaxError) {
            Toast.error('Invalid JSON file. Please check the file format.');
          } else {
            Toast.error('Failed to import data. Please check the file format.');
          }
          resolve(false);
        }
      });

      input.click();
    });
  }

  /**
   * Render privacy dashboard
   */
  async function renderPrivacyDashboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Cleanup previous listeners
    if (privacyListenerManager) {
      privacyListenerManager.removeAll();
    }
    privacyListenerManager = Utils.createListenerManager();

    const summary = await getPrivacySummary();
    const storage = await getStorageUsage();

    container.innerHTML = `
      <div class="privacy-dashboard">
        <div class="page-header">
          <h1 class="page-title">Privacy & Data</h1>
          <p class="page-subtitle">Manage your data and privacy settings</p>
        </div>

        <!-- Data Summary -->
        <div class="privacy-section">
          <h3 class="privacy-section-title">Your Data</h3>
          <div class="data-summary-grid">
            <div class="data-summary-card">
              <div class="data-summary-icon">📝</div>
              <div class="data-summary-value">${summary.journalEntries}</div>
              <div class="data-summary-label">Journal Entries</div>
            </div>
            <div class="data-summary-card">
              <div class="data-summary-icon">🎤</div>
              <div class="data-summary-value">${summary.audioNotes}</div>
              <div class="data-summary-label">Audio Notes</div>
            </div>
            <div class="data-summary-card">
              <div class="data-summary-icon">💭</div>
              <div class="data-summary-value">${summary.reflections}</div>
              <div class="data-summary-label">Weekly Reflections</div>
            </div>
            <div class="data-summary-card">
              <div class="data-summary-icon">✓</div>
              <div class="data-summary-value">${summary.progressDays}</div>
              <div class="data-summary-label">Days Completed</div>
            </div>
          </div>
        </div>

        <!-- Storage Usage -->
        <div class="privacy-section">
          <h3 class="privacy-section-title">Storage Usage</h3>
          <div class="storage-usage">
            <div class="storage-bar">
              <div class="storage-bar-fill" style="width: ${storage.percentUsed}%"></div>
            </div>
            <div class="storage-info">
              <span>${formatBytes(storage.usage)} used</span>
              <span>${storage.percentUsed}%</span>
              <span>${formatBytes(storage.quota)} total</span>
            </div>
          </div>
        </div>

        <!-- Data Management -->
        <div class="privacy-section">
          <h3 class="privacy-section-title">Data Management</h3>
          
          <div class="privacy-actions">
            <button class="btn btn-primary" id="export-all-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Export All Data</span>
            </button>

            <button class="btn btn-secondary" id="import-data-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>Import Data</span>
            </button>
          </div>
        </div>

        <!-- Clear Data Options -->
        <div class="privacy-section">
          <h3 class="privacy-section-title">Clear Data</h3>
          <p class="privacy-section-description">Selectively clear specific types of data or everything</p>
          
          <div class="clear-data-options">
            <button class="btn btn-ghost btn-sm" id="clear-journal-btn">Clear Journal Entries</button>
            <button class="btn btn-ghost btn-sm" id="clear-audio-btn">Clear Audio Notes</button>
            <button class="btn btn-ghost btn-sm" id="clear-reflections-btn">Clear Reflections</button>
            <button class="btn btn-ghost btn-sm" id="clear-progress-btn">Clear Progress</button>
            <button class="btn btn-ghost btn-sm" id="clear-favorites-btn">Clear Favorites</button>
            <button class="btn btn-ghost btn-sm" id="clear-settings-btn">Clear Settings</button>
          </div>

          <div class="danger-zone">
            <h4 class="danger-zone-title">⚠️ Danger Zone</h4>
            <p class="danger-zone-description">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
            <button class="btn btn-danger" id="clear-all-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span>Delete All Data</span>
            </button>
          </div>
        </div>

        <!-- Privacy Information -->
        <div class="privacy-section">
          <h3 class="privacy-section-title">Privacy Information</h3>
          <div class="privacy-info">
            <p>✓ All your data is stored <strong>locally on your device</strong></p>
            <p>✓ No data is sent to external servers</p>
            <p>✓ Your journal entries and reflections are <strong>completely private</strong></p>
            <p>✓ Audio notes are stored as encrypted blobs in your browser</p>
            <p>✓ You have full control to export or delete your data anytime</p>
          </div>
        </div>
      </div>
    `;

    attachPrivacyListeners();
  }

  /**
   * Attach event listeners using listener manager
   */
  function attachPrivacyListeners() {
    const exportBtn = document.getElementById('export-all-btn');
    const importBtn = document.getElementById('import-data-btn');
    const clearJournalBtn = document.getElementById('clear-journal-btn');
    const clearAudioBtn = document.getElementById('clear-audio-btn');
    const clearReflectionsBtn = document.getElementById('clear-reflections-btn');
    const clearProgressBtn = document.getElementById('clear-progress-btn');
    const clearFavoritesBtn = document.getElementById('clear-favorites-btn');
    const clearSettingsBtn = document.getElementById('clear-settings-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');

    if (exportBtn) privacyListenerManager.add(exportBtn, 'click', exportAllData);
    if (importBtn) privacyListenerManager.add(importBtn, 'click', importData);
    if (clearJournalBtn) privacyListenerManager.add(clearJournalBtn, 'click', () => clearDataType('journal'));
    if (clearAudioBtn) privacyListenerManager.add(clearAudioBtn, 'click', () => clearDataType('audio'));
    if (clearReflectionsBtn) privacyListenerManager.add(clearReflectionsBtn, 'click', () => clearDataType('reflections'));
    if (clearProgressBtn) privacyListenerManager.add(clearProgressBtn, 'click', () => clearDataType('progress'));
    if (clearFavoritesBtn) privacyListenerManager.add(clearFavoritesBtn, 'click', () => clearDataType('favorites'));
    if (clearSettingsBtn) privacyListenerManager.add(clearSettingsBtn, 'click', () => clearDataType('settings'));
    if (clearAllBtn) privacyListenerManager.add(clearAllBtn, 'click', clearAllData);
  }

  return {
    init,
    getPrivacySummary,
    getStorageUsage,
    clearAllData,
    clearDataType,
    exportAllData,
    importData,
    renderPrivacyDashboard,
    formatBytes
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Privacy;
}
