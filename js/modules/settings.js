/**
 * Spiritual Seasons PWA - Settings Module
 * Handles app settings and preferences with audio features
 */

const Settings = (() => {
  let listenerManager = null;

  async function applySettings() {
    const settings = await Store.getSettings();
    applyDarkMode(settings.darkMode);
    applyFontSize(settings.fontSize);
    applyLineSpacing(settings.lineSpacing);

    if (settings.seasonTheme !== 'auto') {
      document.documentElement.setAttribute('data-season', settings.seasonTheme);
    }
  }

  function applyDarkMode(mode) {
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
    }
  }

  function applyFontSize(size) {
    const sizes = { small: '14px', medium: '16px', large: '18px', 'extra-large': '20px' };
    document.documentElement.style.fontSize = sizes[size] || '16px';
  }

  function applyLineSpacing(spacing) {
    const spacings = { compact: '1.4', normal: '1.625', relaxed: '1.8', loose: '2' };
    document.documentElement.style.setProperty('--leading-relaxed', spacings[spacing] || '1.625');
  }

  async function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Cleanup previous listeners
    if (listenerManager) {
      listenerManager.removeAll();
    }
    listenerManager = Utils.createListenerManager();

    Utils.showLoading(container, 'Loading settings...');

    const settings = await Store.getSettings();
    const currentSeason = await Store.getCurrentSeason();
    const AudioSupported = true;

    Utils.clearElement(container);

    const pageHeader = Utils.createElement('div', { className: 'page-header' },
      Utils.createElement('h1', { className: 'page-title' }, 'Settings'),
      Utils.createElement('p', { className: 'page-subtitle' }, 'Customize your devotional experience')
    );

    const pageContent = Utils.createElement('div', { className: 'page-content' });

    pageContent.innerHTML = `
      <!-- Display Settings -->
      <div class="settings-group">
        <h3 class="settings-group-title">Display</h3>
        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Dark Mode</div>
              <div class="settings-item-description">Easier on your eyes at night</div>
            </div>
            <div class="select-wrapper">
              <select class="select" id="setting-dark-mode">
                <option value="system" ${settings.darkMode === 'system' ? 'selected' : ''}>System</option>
                <option value="light" ${settings.darkMode === 'light' ? 'selected' : ''}>Light</option>
                <option value="dark" ${settings.darkMode === 'dark' ? 'selected' : ''}>Dark</option>
              </select>
            </div>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Font Size</div>
              <div class="settings-item-description">Adjust text size for readability</div>
            </div>
            <div class="select-wrapper">
              <select class="select" id="setting-font-size">
                <option value="small" ${settings.fontSize === 'small' ? 'selected' : ''}>Small</option>
                <option value="medium" ${settings.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="large" ${settings.fontSize === 'large' ? 'selected' : ''}>Large</option>
                <option value="extra-large" ${settings.fontSize === 'extra-large' ? 'selected' : ''}>Extra Large</option>
              </select>
            </div>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Line Spacing</div>
              <div class="settings-item-description">Space between lines of text</div>
            </div>
            <div class="select-wrapper">
              <select class="select" id="setting-line-spacing">
                <option value="compact" ${settings.lineSpacing === 'compact' ? 'selected' : ''}>Compact</option>
                <option value="normal" ${settings.lineSpacing === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="relaxed" ${settings.lineSpacing === 'relaxed' ? 'selected' : ''}>Relaxed</option>
                <option value="loose" ${settings.lineSpacing === 'loose' ? 'selected' : ''}>Loose</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Audio Settings -->
      ${AudioSupported ? `
      <div class="settings-group">
        <h3 class="settings-group-title">Audio</h3>
        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Reading Speed</div>
              <div class="settings-item-description">Speed of text-to-speech</div>
            </div>
            <div class="select-wrapper">
              <select class="select" id="setting-tts-rate">
                <option value="0.7" ${settings.ttsRate === 0.7 ? 'selected' : ''}>Slow</option>
                <option value="0.9" ${settings.ttsRate === 0.9 ? 'selected' : ''}>Normal</option>
                <option value="1.0" ${settings.ttsRate === 1.0 ? 'selected' : ''}>Fast</option>
                <option value="1.2" ${settings.ttsRate === 1.2 ? 'selected' : ''}>Very Fast</option>
              </select>
            </div>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Ambient Sound</div>
              <div class="settings-item-description">Background soundscape for meditation</div>
            </div>
            <div class="select-wrapper">
              <select class="select" id="setting-ambient-sound">
                <option value="silence" ${settings.ambientSound === 'silence' ? 'selected' : ''}>None</option>
                <option value="auto" ${settings.ambientSound === 'auto' ? 'selected' : ''}>Auto (Season-based)</option>
                <option value="winter" ${settings.ambientSound === 'winter' ? 'selected' : ''}>Winter Breeze</option>
                <option value="spring" ${settings.ambientSound === 'spring' ? 'selected' : ''}>Spring Garden</option>
                <option value="summer" ${settings.ambientSound === 'summer' ? 'selected' : ''}>Summer Warmth</option>
                <option value="autumn" ${settings.ambientSound === 'autumn' ? 'selected' : ''}>Autumn Rustling</option>
                <option value="rain" ${settings.ambientSound === 'rain' ? 'selected' : ''}>Gentle Rain</option>
                <option value="ocean" ${settings.ambientSound === 'ocean' ? 'selected' : ''}>Ocean Waves</option>
                <option value="forest" ${settings.ambientSound === 'forest' ? 'selected' : ''}>Deep Forest</option>
                <option value="night" ${settings.ambientSound === 'night' ? 'selected' : ''}>Peaceful Night</option>
                <option value="whitenoise" ${settings.ambientSound === 'whitenoise' ? 'selected' : ''}>White Noise</option>
              </select>
            </div>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Test Audio</div>
              <div class="settings-item-description">Make sure audio is working</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="test-tts">Test Voice</button>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Bible Settings -->
      <div class="settings-group">
        <h3 class="settings-group-title">Bible</h3>
        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Bible Translation</div>
              <div class="settings-item-description">Preferred version for scripture</div>
            </div>
            <div class="select-wrapper">
              <select class="select" id="setting-bible-translation">
                <option value="NLT" ${settings.bibleTranslation === 'NLT' ? 'selected' : ''}>NLT</option>
                <option value="NIV" ${settings.bibleTranslation === 'NIV' ? 'selected' : ''}>NIV</option>
                <option value="KJV" ${settings.bibleTranslation === 'KJV' ? 'selected' : ''}>KJV</option>
                <option value="NKJV" ${settings.bibleTranslation === 'NKJV' ? 'selected' : ''}>NKJV</option>
                <option value="ESV" ${settings.bibleTranslation === 'ESV' ? 'selected' : ''}>ESV</option>
                <option value="NASB" ${settings.bibleTranslation === 'NASB' ? 'selected' : ''}>NASB</option>
                <option value="MSG" ${settings.bibleTranslation === 'MSG' ? 'selected' : ''}>MSG</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-group">
        <h3 class="settings-group-title">Reminders</h3>
        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Daily Reminders</div>
              <div class="settings-item-description">Get notified for your devotional</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="setting-notifications" ${settings.notificationsEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="settings-item" id="reminder-time-setting" style="display: ${settings.notificationsEnabled ? 'flex' : 'none'}">
            <div class="settings-item-info">
              <div class="settings-item-label">Reminder Time</div>
              <div class="settings-item-description">When to receive your daily reminder</div>
            </div>
            <input type="time" class="select" id="setting-reminder-time" value="${settings.reminderTime}">
          </div>
        </div>
      </div>

      <!-- Journal Settings -->
      <div class="settings-group">
        <h3 class="settings-group-title">Journal</h3>
        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Auto-Save</div>
              <div class="settings-item-description">Automatically save journal entries</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="setting-auto-save" ${settings.autoSave ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Keyboard Shortcuts -->
      <div class="settings-group">
        <h3 class="settings-group-title">Keyboard Shortcuts</h3>
        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Enable Shortcuts</div>
              <div class="settings-item-description">Navigate faster with keyboard</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="setting-keyboard-shortcuts" ${settings.keyboardShortcuts !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">View Shortcuts</div>
              <div class="settings-item-description">See all available keyboard commands</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="show-shortcuts">
              View All
            </button>
          </div>
        </div>
      </div>

      <!-- Tools & Practices -->
      <div class="settings-group">
        <h3 class="settings-group-title">Tools & Practices</h3>
        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Meditation Timer</div>
              <div class="settings-item-description">Silent timer with optional chime</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="open-meditation">
              ${Utils.getIcon('clock', 16)}
              Start
            </button>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Guided Breathing</div>
              <div class="settings-item-description">Breathing exercises with visual guide</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="open-breathing">
              ${Utils.getIcon('activity', 16)}
              Start
            </button>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Export to Calendar</div>
              <div class="settings-item-description">Add all 120 days to your calendar</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="export-calendar">
              ${Utils.getIcon('calendar', 16)}
              Export
            </button>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">App Tour</div>
              <div class="settings-item-description">Learn about app features</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="restart-tour">
              ${Utils.getIcon('help', 16)}
              Start Tour
            </button>
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div class="settings-group">
        <h3 class="settings-group-title">Your Data</h3>
        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Export Data</div>
              <div class="settings-item-description">Download a backup of all your data</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="export-data">
              ${Utils.getIcon('download', 16)}
              Export
            </button>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Import Data</div>
              <div class="settings-item-description">Restore from a previous backup</div>
            </div>
            <label class="btn btn-secondary btn-sm" style="cursor: pointer;">
              Import
              <input type="file" id="import-data" accept=".json" style="display: none;">
            </label>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Export Journal</div>
              <div class="settings-item-description">Download your journal as text</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="export-journal">
              ${Utils.getIcon('download', 16)}
              Export
            </button>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Export as PDF</div>
              <div class="settings-item-description">Generate a formatted PDF of your journal</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="export-pdf">
              ${Utils.getIcon('download', 16)}
              Export PDF
            </button>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Retake Quiz</div>
              <div class="settings-item-description">Discover your season again</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="retake-quiz">Retake</button>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">Reset All Data</div>
              <div class="settings-item-description" style="color: var(--autumn-primary);">
                Permanently delete all your data
              </div>
            </div>
            <button class="btn btn-danger btn-sm" id="reset-data">Reset</button>
          </div>
        </div>
      </div>

      <!-- About -->
      <div class="settings-group">
        <h3 class="settings-group-title">About</h3>
        <div class="settings-list">
          <button class="settings-item" data-route="intro" data-page="author" style="width: 100%; text-align: left; border: none; background: transparent;">
            <div class="settings-item-info">
              <div class="settings-item-label">Spiritual Seasons</div>
              <div class="settings-item-description">
                Daily Devotional Workbook by Dr. Jacqueline Ghee<br>
                Version 1.0.0
              </div>
            </div>
            <div class="settings-item-control">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </button>
        </div>
      </div>
    `;

    container.appendChild(pageHeader);
    container.appendChild(pageContent);

    attachListeners(container, settings);
  }

  function attachListeners(container, currentSettings) {
    // Dark mode
    const darkMode = container.querySelector('#setting-dark-mode');
    if (darkMode) {
      listenerManager.add(darkMode, 'change', async (e) => {
        await Store.saveSetting('darkMode', e.target.value);
        applyDarkMode(e.target.value);
      });
    }

    // Font size
    const fontSize = container.querySelector('#setting-font-size');
    if (fontSize) {
      listenerManager.add(fontSize, 'change', async (e) => {
        await Store.saveSetting('fontSize', e.target.value);
        applyFontSize(e.target.value);
      });
    }

    // Line spacing
    const lineSpacing = container.querySelector('#setting-line-spacing');
    if (lineSpacing) {
      listenerManager.add(lineSpacing, 'change', async (e) => {
        await Store.saveSetting('lineSpacing', e.target.value);
        applyLineSpacing(e.target.value);
      });
    }

    // Season theme
    const seasonTheme = container.querySelector('#setting-season-theme');
    if (seasonTheme) {
      listenerManager.add(seasonTheme, 'change', async (e) => {
        await Store.saveSetting('seasonTheme', e.target.value);
        if (e.target.value === 'auto') {
          const currentSeason = await Store.getCurrentSeason() || 'winter';
          document.documentElement.setAttribute('data-season', currentSeason);
        } else {
          document.documentElement.setAttribute('data-season', e.target.value);
        }
      });
    }

    // TTS Rate
    const ttsRate = container.querySelector('#setting-tts-rate');
    if (ttsRate) {
      listenerManager.add(ttsRate, 'change', async (e) => {
        await Store.saveSetting('ttsRate', parseFloat(e.target.value));
      });
    }

    // Ambient sound
    const ambientSound = container.querySelector('#setting-ambient-sound');
    if (ambientSound) {
      listenerManager.add(ambientSound, 'change', async (e) => {
        await Store.saveSetting('ambientSound', e.target.value);
        if (typeof AmbientSound !== 'undefined') {
          await AmbientSound.changeSound(e.target.value);
        }
      });
    }

    // Test TTS
    const testTts = container.querySelector('#test-tts');
    if (testTts) {
      listenerManager.add(testTts, 'click', async () => {
        try {
          if (typeof TTS !== 'undefined') {
            TTS.read('Be still and know that I am God. Psalm 46:10');
            Toast.success('Audio test playing');
          }
        } catch (error) {
          Toast.error('Audio test failed');
        }
      });
    }

    // Bible translation
    const bibleTranslation = container.querySelector('#setting-bible-translation');
    if (bibleTranslation) {
      listenerManager.add(bibleTranslation, 'change', async (e) => {
        await Store.saveSetting('bibleTranslation', e.target.value);
      });
    }

    // Notifications toggle
    const notifications = container.querySelector('#setting-notifications');
    const reminderTimeSetting = container.querySelector('#reminder-time-setting');
    if (notifications) {
      listenerManager.add(notifications, 'change', async (e) => {
        await Store.saveSetting('notificationsEnabled', e.target.checked);
        if (reminderTimeSetting) {
          reminderTimeSetting.style.display = e.target.checked ? 'flex' : 'none';
        }
        
        if (e.target.checked && 'Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            Toast.show('Notification permission denied', 'warning');
            e.target.checked = false;
            await Store.saveSetting('notificationsEnabled', false);
            if (reminderTimeSetting) {
              reminderTimeSetting.style.display = 'none';
            }
          }
        }
      });
    }

    // Reminder time
    const reminderTime = container.querySelector('#setting-reminder-time');
    if (reminderTime) {
      listenerManager.add(reminderTime, 'change', async (e) => {
        await Store.saveSetting('reminderTime', e.target.value);
        Toast.show('Reminder time updated', 'success');
      });
    }

    // Auto-save
    const autoSave = container.querySelector('#setting-auto-save');
    if (autoSave) {
      listenerManager.add(autoSave, 'change', async (e) => {
        await Store.saveSetting('autoSave', e.target.checked);
      });
    }

    // Keyboard shortcuts toggle
    const keyboardShortcuts = container.querySelector('#setting-keyboard-shortcuts');
    if (keyboardShortcuts) {
      listenerManager.add(keyboardShortcuts, 'change', async (e) => {
        await Store.saveSetting('keyboardShortcuts', e.target.checked);
        if (typeof KeyboardShortcuts !== 'undefined') {
          KeyboardShortcuts.toggle(e.target.checked);
        }
        Toast.success(e.target.checked ? 'Keyboard shortcuts enabled' : 'Keyboard shortcuts disabled');
      });
    }

    // Show shortcuts button
    const showShortcuts = container.querySelector('#show-shortcuts');
    if (showShortcuts) {
      listenerManager.add(showShortcuts, 'click', () => {
        if (typeof KeyboardShortcuts !== 'undefined') {
          KeyboardShortcuts.showHelp();
        }
      });
    }

    // Meditation Timer
    const meditationBtn = container.querySelector('#open-meditation');
    if (meditationBtn) {
      listenerManager.add(meditationBtn, 'click', () => {
        if (typeof MeditationTimer !== 'undefined') {
          MeditationTimer.showTimer();
        } else {
          Toast.error('Meditation timer not available');
        }
      });
    }

    // Guided Breathing
    const breathingBtn = container.querySelector('#open-breathing');
    if (breathingBtn) {
      listenerManager.add(breathingBtn, 'click', () => {
        if (typeof GuidedBreathing !== 'undefined') {
          GuidedBreathing.showBreathing();
        } else {
          Toast.error('Guided breathing not available');
        }
      });
    }

    // Export to Calendar
    const calendarBtn = container.querySelector('#export-calendar');
    if (calendarBtn) {
      listenerManager.add(calendarBtn, 'click', () => {
        if (typeof CalendarIntegration !== 'undefined') {
          CalendarIntegration.showExportDialog();
        } else {
          Toast.error('Calendar export not available');
        }
      });
    }

    // Restart Tour
    const tourBtn = container.querySelector('#restart-tour');
    if (tourBtn) {
      listenerManager.add(tourBtn, 'click', () => {
        if (typeof OnboardingTour !== 'undefined') {
          OnboardingTour.restartTour();
        } else {
          Toast.error('Tour not available');
        }
      });
    }

    // Export data
    const exportBtn = container.querySelector('#export-data');
    if (exportBtn) {
      listenerManager.add(exportBtn, 'click', async () => {
        if (typeof DataExport !== 'undefined') {
          await DataExport.showExportDialog(false);
        } else {
          // Fallback to old export method
          try {
            const data = await Store.exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `spiritual-seasons-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Toast.show('Data exported successfully', 'success');
          } catch (err) {
            Toast.show('Failed to export data', 'error');
          }
        }
      });
    }

    // Import data 
    const importInput = container.querySelector('#import-data');
    if (importInput) {
      listenerManager.add(importInput, 'change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          let data;
          
          try {
            data = JSON.parse(text);
          } catch {
            Toast.show('Invalid JSON file', 'error');
            e.target.value = '';
            return;
          }

          // Validate before showing confirm dialog
          const validation = Store.validateImportData(data);
          if (!validation.valid) {
            Toast.show('Invalid backup file: ' + validation.errors[0], 'error');
            e.target.value = '';
            return;
          }

          if (confirm('This will replace all your current data. Are you sure you want to continue?')) {
            const result = await Store.importData(data);
            
            if (result.success) {
              Toast.show(result.message, 'success');
              await applySettings();
              await render(container.parentElement?.id || 'settings-content');
            } else {
              Toast.show(result.message, 'error');
            }
          }
        } catch (err) {
          console.error('Import error:', err);
          Toast.show('Failed to import data', 'error');
        }
        
        e.target.value = '';
      });
    }

    // Export journal
    const exportJournalBtn = container.querySelector('#export-journal');
    if (exportJournalBtn && typeof Sharing !== 'undefined') {
      listenerManager.add(exportJournalBtn, 'click', async () => {
        try {
          const entries = await Store.getAllJournalEntries();
          if (entries.length === 0) {
            Toast.show('No journal entries to export', 'warning');
            return;
          }
          await Sharing.exportJournal(entries, { format: 'markdown' });
          Toast.show('Journal exported successfully', 'success');
        } catch (err) {
          Toast.show('Failed to export journal', 'error');
        }
      });
    }

    // Export PDF
    const exportPdfBtn = container.querySelector('#export-pdf');
    if (exportPdfBtn && typeof PDFExport !== 'undefined') {
      listenerManager.add(exportPdfBtn, 'click', async () => {
        try {
          await PDFExport.exportJournalToPDF();
        } catch (err) {
          console.error('PDF export error:', err);
          Toast.error('Failed to export PDF');
        }
      });
    }

    // Retake quiz
    const retakeBtn = container.querySelector('#retake-quiz');
    if (retakeBtn) {
      listenerManager.add(retakeBtn, 'click', () => {
        if (typeof Quiz !== 'undefined' && Quiz.reset) {
          Quiz.reset();
        }
        Router.navigate('quiz');
      });
    }

    // Reset data
    const resetBtn = container.querySelector('#reset-data');
    if (resetBtn) {
      listenerManager.add(resetBtn, 'click', async () => {
        // Offer to export data first if DataExport module is available
        let shouldProceed = true;
        if (typeof DataExport !== 'undefined') {
          shouldProceed = await DataExport.showExportDialog(true);
        }
        
        // If user cancelled from export dialog, don't proceed
        if (!shouldProceed) {
          return;
        }
        
        const confirmed = await Modal.confirm({
          title: '⚠️ Reset All Data',
          message: `
            <div style="margin-bottom: var(--space-4);">
              <p style="margin-bottom: var(--space-3); font-weight: 500; color: var(--autumn-primary);">
                This will permanently delete ALL your data:
              </p>
              <ul style="color: var(--text-secondary); margin-left: var(--space-4); margin-bottom: var(--space-3);">
                <li>All journal entries and reflections</li>
                <li>Progress tracking and completion records</li>
                <li>Favorites and bookmarks</li>
                <li>Audio notes and weekly reflections</li>
                <li>All settings and preferences</li>
              </ul>
              <p style="font-weight: 600; color: var(--autumn-dark);">
                This action cannot be undone.
              </p>
            </div>
          `,
          confirmText: 'Delete Everything',
          confirmClass: 'btn-danger',
          cancelText: 'Cancel',
          size: 'medium'
        });

        if (confirmed) {
          // Show loading state
          resetBtn.disabled = true;
          resetBtn.textContent = 'Resetting...';
          
          try {
            await Store.resetAllData();
            Toast.show('All data has been reset', 'success');
            
            // Redirect to quiz after a brief delay
            setTimeout(() => {
              Router.navigate('quiz');
            }, 500);
          } catch (error) {
            console.error('Failed to reset data:', error);
            Toast.error('Failed to reset data. Please try again.');
            resetBtn.disabled = false;
            resetBtn.textContent = 'Reset';
          }
        }
      });
    }
  }

  function initSystemThemeListener() {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
        const settings = await Store.getSettings();
        if (settings.darkMode === 'system') {
          applyDarkMode('system');
        }
      });
    }
  }

  return {
    render,
    applySettings,
    applyDarkMode,
    applyFontSize,
    applyLineSpacing,
    initSystemThemeListener
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Settings;
}
