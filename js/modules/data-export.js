/**
 * Data Export Module
 * Export all user data before reset or for backup
 */

const DataExport = (() => {
  /**
   * Collect all user data
   */
  async function collectAllData() {
    const data = {
      exportDate: new Date().toISOString(),
      appVersion: CONFIG.APP_VERSION,
      data: {
        // Progress data
        completedDays: await Store.getCompletedDays(),
        currentDay: await Store.getCurrentDay(),
        currentSeason: await Store.getCurrentSeason(),
        
        // Quiz results
        quizResults: await Store.getQuizResults(),
        
        // Journal entries
        journalEntries: {},
        
        // Reflections
        reflections: {},
        
        // Favorites
        favorites: await Store.getAllFavorites(),
        
        // Settings
        settings: {},
        
        // Audio notes (metadata only, not the actual audio)
        audioNotes: {}
      }
    };

    // Collect journal entries
    for (let day = 1; day <= 120; day++) {
      const entry = await Store.getJournalEntry(day);
      if (entry && entry.content) {
        data.data.journalEntries[day] = entry;
      }
    }

    // Collect weekly reflections
    for (let week = 1; week <= 17; week++) {
      const reflection = await Store.getWeeklyReflection(week);
      if (reflection && reflection.content) {
        data.data.reflections[week] = reflection;
      }
    }

    // Collect all settings
    const settingKeys = [
      'theme',
      'textSize',
      'lineHeight',
      'fontFamily',
      'ttsVoice',
      'ttsRate',
      'ttsPitch',
      'ambientSound',
      'ambientVolume',
      'keyboardShortcuts',
      'meditationTimer',
      'onboardingCompleted'
    ];

    for (const key of settingKeys) {
      const value = await Store.getSetting(key);
      if (value !== null && value !== undefined) {
        data.data.settings[key] = value;
      }
    }

    // Collect audio note metadata
    for (let day = 1; day <= 120; day++) {
      const hasAudio = await Store.hasAudioNote(day);
      if (hasAudio) {
        data.data.audioNotes[day] = {
          exists: true,
          note: 'Audio files cannot be exported - please save separately if needed'
        };
      }
    }

    return data;
  }

  /**
   * Export data as JSON file
   */
  async function exportAsJSON() {
    try {
      const data = await collectAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const filename = `spiritual-seasons-backup-${new Date().toISOString().split('T')[0]}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      Utils.debug.error('Export error:', error);
      return false;
    }
  }

  /**
   * Export data as readable text file
   */
  async function exportAsText() {
    try {
      const data = await collectAllData();
      let text = `SPIRITUAL SEASONS - DATA EXPORT
Export Date: ${new Date(data.exportDate).toLocaleString()}
App Version: ${data.appVersion}

═══════════════════════════════════════════════════════

PROGRESS SUMMARY
═══════════════════════════════════════════════════════

Completed Days: ${data.data.completedDays.length} / 120
Current Day: ${data.data.currentDay}
Current Season: ${data.data.currentSeason || 'Not started'}

Completion Rate: ${Math.round((data.data.completedDays.length / 120) * 100)}%

═══════════════════════════════════════════════════════

JOURNAL ENTRIES (${Object.keys(data.data.journalEntries).length})
═══════════════════════════════════════════════════════

`;

      // Add journal entries
      const journalDays = Object.keys(data.data.journalEntries).sort((a, b) => parseInt(a) - parseInt(b));
      for (const day of journalDays) {
        const entry = data.data.journalEntries[day];
        const dayData = Devotional.getDay(parseInt(day));
        text += `
DAY ${day}: ${dayData ? dayData.scriptureRef : 'Unknown'}
Date: ${new Date(entry.timestamp).toLocaleString()}
───────────────────────────────────────────────────────
${entry.content}

`;
      }

      // Add weekly reflections
      if (Object.keys(data.data.reflections).length > 0) {
        text += `
═══════════════════════════════════════════════════════

WEEKLY REFLECTIONS (${Object.keys(data.data.reflections).length})
═══════════════════════════════════════════════════════

`;
        const reflectionWeeks = Object.keys(data.data.reflections).sort((a, b) => parseInt(a) - parseInt(b));
        for (const week of reflectionWeeks) {
          const reflection = data.data.reflections[week];
          text += `
WEEK ${week}
Date: ${new Date(reflection.timestamp).toLocaleString()}
───────────────────────────────────────────────────────
${reflection.content}

`;
        }
      }

      // Add favorites
      if (data.data.favorites.length > 0) {
        text += `
═══════════════════════════════════════════════════════

FAVORITE DEVOTIONALS (${data.data.favorites.length})
═══════════════════════════════════════════════════════

`;
        for (const fav of data.data.favorites) {
          const dayData = Devotional.getDay(fav.day);
          text += `Day ${fav.day}: ${dayData ? dayData.scriptureRef : 'Unknown'}\n`;
        }
      }

      // Add quiz results
      if (data.data.quizResults) {
        text += `

═══════════════════════════════════════════════════════

QUIZ RESULTS
═══════════════════════════════════════════════════════

Spiritual Season: ${data.data.quizResults.season}
Completed: ${new Date(data.data.quizResults.completedAt).toLocaleString()}
`;
      }

      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const filename = `spiritual-seasons-backup-${new Date().toISOString().split('T')[0]}.txt`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      Utils.debug.error('Export error:', error);
      return false;
    }
  }

  /**
   * Show export dialog
   */
  async function showExportDialog(beforeReset = false) {
    const data = await collectAllData();
    const stats = {
      journalEntries: Object.keys(data.data.journalEntries).length,
      reflections: Object.keys(data.data.reflections).length,
      completedDays: data.data.completedDays.length,
      favorites: data.data.favorites.length,
      audioNotes: Object.keys(data.data.audioNotes).length
    };

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div style="margin-bottom: var(--space-6);">
        ${beforeReset ? `
          <div class="card" style="background: var(--autumn-light); border-color: var(--autumn-primary); margin-bottom: var(--space-4); padding: var(--space-4);">
            <div style="display: flex; gap: var(--space-3); align-items: flex-start;">
              <div style="font-size: 24px;">⚠️</div>
              <div>
                <h4 style="color: var(--autumn-dark); margin-bottom: var(--space-2); font-weight: 600;">
                  Before You Reset
                </h4>
                <p style="color: var(--text-secondary); font-size: var(--text-sm); margin: 0;">
                  We recommend exporting your data before resetting. This cannot be undone!
                </p>
              </div>
            </div>
          </div>
        ` : ''}
        
        <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
          Export your spiritual journey including journal entries, reflections, and progress.
        </p>
        
        <div class="card" style="background: var(--bg-secondary); padding: var(--space-4);">
          <h4 style="margin-bottom: var(--space-3); font-weight: 600;">📊 Your Data Summary</h4>
          <div style="display: grid; gap: var(--space-2); color: var(--text-secondary);">
            <div style="display: flex; justify-content: space-between;">
              <span>Completed Days</span>
              <strong style="color: var(--text-primary);">${stats.completedDays}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Journal Entries</span>
              <strong style="color: var(--text-primary);">${stats.journalEntries}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Weekly Reflections</span>
              <strong style="color: var(--text-primary);">${stats.reflections}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Favorite Devotionals</span>
              <strong style="color: var(--text-primary);">${stats.favorites}</strong>
            </div>
            ${stats.audioNotes > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span>Audio Notes</span>
                <strong style="color: var(--text-primary);">${stats.audioNotes}</strong>
              </div>
            ` : ''}
          </div>
        </div>
        
        ${stats.audioNotes > 0 ? `
          <div class="card" style="background: var(--bg-secondary); margin-top: var(--space-4); padding: var(--space-3);">
            <p style="font-size: var(--text-sm); color: var(--text-secondary); margin: 0;">
              📝 <strong>Note:</strong> Audio recordings cannot be included in the export. 
              Please save them separately if needed.
            </p>
          </div>
        ` : ''}
      </div>
    `;

    const buttons = [
      {
        text: 'Export as Text File',
        className: 'btn-secondary',
        onClick: async () => {
          const success = await exportAsText();
          if (success) {
            Toast.success('Data exported as text file');
          } else {
            Toast.error('Failed to export data');
          }
          return false; // Keep modal open
        }
      },
      {
        text: 'Export as JSON',
        className: 'btn-secondary',
        onClick: async () => {
          const success = await exportAsJSON();
          if (success) {
            Toast.success('Data exported as JSON');
          } else {
            Toast.error('Failed to export data');
          }
          return false; // Keep modal open
        }
      }
    ];

    if (beforeReset) {
      buttons.push({
        text: 'Continue Without Export',
        className: 'btn-danger',
        onClick: () => {
          return true; // Close modal and continue with reset
        }
      });
    } else {
      // Add "Close" button for normal export
      buttons.push({
        text: 'Close',
        className: 'btn-ghost',
        onClick: () => true
      });
    }

    return new Promise((resolve) => {
      Modal.create({
        title: beforeReset ? '⚠️ Export Your Data' : 'Export Your Data',
        content: modalContent,
        size: 'medium',
        buttons,
        closeOnOverlay: !beforeReset,
        showCloseButton: !beforeReset,
        onClose: () => resolve(beforeReset)
      });
    });
  }

  /**
   * Import data from JSON file
   */
  async function importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Validate data structure
          if (!data.data || !data.exportDate) {
            throw new Error('Invalid backup file format');
          }

          // Import settings
          if (data.data.settings) {
            for (const [key, value] of Object.entries(data.data.settings)) {
              await Store.saveSetting(key, value);
            }
          }

          // Import journal entries
          if (data.data.journalEntries) {
            for (const [day, entry] of Object.entries(data.data.journalEntries)) {
              await Store.saveJournalEntry(parseInt(day), entry.content);
            }
          }

          // Import reflections
          if (data.data.reflections) {
            for (const [week, reflection] of Object.entries(data.data.reflections)) {
              await Store.saveWeeklyReflection(parseInt(week), reflection.content);
            }
          }

          // Import favorites
          if (data.data.favorites && Array.isArray(data.data.favorites)) {
            for (const fav of data.data.favorites) {
              await Store.toggleFavorite(fav.day);
            }
          }

          // Import progress
          if (data.data.completedDays && Array.isArray(data.data.completedDays)) {
            for (const day of data.data.completedDays) {
              await Store.markDayComplete(day);
            }
          }

          if (data.data.currentDay) {
            await Store.setCurrentDay(data.data.currentDay);
          }

          resolve(true);
        } catch (error) {
          Utils.debug.error('Import error:', error);
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  return {
    collectAllData,
    exportAsJSON,
    exportAsText,
    showExportDialog,
    importFromJSON
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataExport;
}
