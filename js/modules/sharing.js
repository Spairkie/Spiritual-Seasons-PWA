/**
 * Spiritual Seasons PWA - Sharing Module
 * Share verses, create quote images, export progress
 */

const Sharing = (() => {
  // ============================================
  // Native Share API
  // ============================================

  /**
   * Check if Web Share API is supported
   * @returns {boolean}
   */
  function isShareSupported() {
    return navigator.share !== undefined;
  }

  /**
   * Share text using native share
   * @param {Object} data - Share data
   * @returns {Promise<void>}
   */
  async function share(data) {
    if (!isShareSupported()) {
      // Fallback to clipboard
      await copyToClipboard(data.text || data.url);
      return;
    }

    try {
      await navigator.share({
        title: data.title || 'Spiritual Seasons',
        text: data.text,
        url: data.url
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw error;
      }
    }
  }

  /**
   * Share a scripture verse
   * @param {string} reference - Scripture reference
   * @param {string} text - Scripture text
   * @param {string} season - Current season
   */
  async function shareVerse(reference, text, season) {
    const shareText = `"${text}"\n\n— ${reference}\n\nFrom Spiritual Seasons Daily Devotional`;
    
    await share({
      title: reference,
      text: shareText
    });
  }

  /**
   * Share progress milestone
   * @param {number} daysCompleted
   * @param {number} totalDays
   * @param {string} currentSeason
   */
  async function shareProgress(daysCompleted, totalDays, currentSeason) {
    const percentage = Math.round((daysCompleted / totalDays) * 100);
    const seasonName = currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1);
    
    const shareText = `🌱 I've completed ${daysCompleted} of ${totalDays} days (${percentage}%) in my Spiritual Seasons devotional journey!\n\nCurrently in: ${seasonName} Season\n\n#SpiritualSeasons #DailyDevotional`;
    
    await share({
      title: 'My Spiritual Seasons Progress',
      text: shareText
    });
  }

  // ============================================
  // Clipboard
  // ============================================

  /**
   * Copy text to clipboard
   * @param {string} text
   * @returns {Promise<void>}
   */
  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  /**
   * Copy verse to clipboard
   * @param {string} reference
   * @param {string} text
   */
  async function copyVerse(reference, text) {
    const copyText = `"${text}" — ${reference}`;
    await copyToClipboard(copyText);
    return copyText;
  }

  // ============================================
  // Quote Image Generation
  // ============================================

  // Season color schemes
  const SEASON_COLORS = {
    winter: {
      bg: '#EAF1F4',
      primary: '#4C7688',
      text: '#2B4E5C',
      accent: '#8BA6B2'
    },
    spring: {
      bg: '#EFF3E7',
      primary: '#6D8E4E',
      text: '#43602F',
      accent: '#A0B68C'
    },
    summer: {
      bg: '#FAF2E1',
      primary: '#B5822B',
      text: '#835A16',
      accent: '#CFAE75'
    },
    autumn: {
      bg: '#F8EBE6',
      primary: '#A9503A',
      text: '#7A3524',
      accent: '#C78D7F'
    }
  };

  /**
   * Generate a quote image
   * @param {Object} options
   * @returns {Promise<Blob>}
   */
  async function generateQuoteImage(options) {
    const {
      reference,
      text,
      season = 'winter',
      width = 1080,
      height = 1080,
      format = 'png'
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const colors = SEASON_COLORS[season] || SEASON_COLORS.winter;
    const padding = width * 0.1;

    // Background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // Decorative corner accents
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.3;
    
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width * 0.3, 0);
    ctx.lineTo(0, height * 0.3);
    ctx.closePath();
    ctx.fill();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(width * 0.7, height);
    ctx.lineTo(width, height * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;

    // Quote mark
    ctx.font = `bold ${width * 0.15}px Georgia, serif`;
    ctx.fillStyle = colors.primary;
    ctx.globalAlpha = 0.2;
    ctx.fillText('"', padding, padding + width * 0.12);
    ctx.globalAlpha = 1;

    // Scripture text
    ctx.font = `italic ${width * 0.045}px Georgia, serif`;
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    
    const maxWidth = width - (padding * 2);
    const lineHeight = width * 0.065;
    const lines = wrapText(ctx, text, maxWidth);
    
    const textStartY = (height - (lines.length * lineHeight)) / 2;
    
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, textStartY + (i * lineHeight));
    });

    // Reference
    ctx.font = `bold ${width * 0.035}px sans-serif`;
    ctx.fillStyle = colors.primary;
    ctx.fillText(`— ${reference}`, width / 2, textStartY + (lines.length * lineHeight) + (padding * 0.5));

    // Branding
    ctx.font = `${width * 0.025}px sans-serif`;
    ctx.fillStyle = colors.text;
    ctx.globalAlpha = 0.6;
    ctx.fillText('Spiritual Seasons Daily Devotional', width / 2, height - padding * 0.5);
    ctx.globalAlpha = 1;

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, `image/${format}`, 0.9);
    });
  }

  /**
   * Wrap text to fit within maxWidth
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text
   * @param {number} maxWidth
   * @returns {string[]}
   */
  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Download quote image
   * @param {Object} options
   */
  async function downloadQuoteImage(options) {
    const blob = await generateQuoteImage(options);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `spiritual-seasons-${options.reference.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Share quote image (if supported)
   * @param {Object} options
   */
  async function shareQuoteImage(options) {
    const blob = await generateQuoteImage(options);
    const file = new File([blob], 'verse.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: options.reference,
          text: `"${options.text}" — ${options.reference}`,
          files: [file]
        });
        return true;
      } catch (error) {
        if (error.name !== 'AbortError') {
          // Fallback to download
          await downloadQuoteImage(options);
        }
        return false;
      }
    } else {
      // Fallback to download
      await downloadQuoteImage(options);
      return false;
    }
  }

  // ============================================
  // Journal Export
  // ============================================

  /**
   * Export journal entries as formatted text
   * @param {Array} entries - Journal entries
   * @param {Object} options
   * @returns {string}
   */
  function formatJournalExport(entries, options = {}) {
    const { format = 'markdown', includeScripture = true } = options;
    
    let output = '';
    
    if (format === 'markdown') {
      output = '# Spiritual Seasons Journal\n\n';
      output += `*Exported on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
      
      entries.forEach(entry => {
        const dayData = typeof Devotional !== 'undefined' ? Devotional.getDay(entry.day) : null;
        
        output += `## Day ${entry.day}`;
        if (entry.season) {
          output += ` (${entry.season.charAt(0).toUpperCase() + entry.season.slice(1)})`;
        }
        output += '\n\n';
        
        if (includeScripture && dayData) {
          output += `**${dayData.scriptureRef}**\n`;
          output += `> "${dayData.scriptureText}"\n\n`;
          output += `*Reflection Prompt: ${dayData.prompt}*\n\n`;
        }
        
        output += `### My Reflection\n\n${entry.content || '*No entry*'}\n\n`;
        
        if (entry.updatedAt) {
          output += `*Last updated: ${new Date(entry.updatedAt).toLocaleDateString()}*\n\n`;
        }
        
        output += '---\n\n';
      });
    } else if (format === 'text') {
      output = 'SPIRITUAL SEASONS JOURNAL\n';
      output += `Exported on ${new Date().toLocaleDateString()}\n`;
      output += '='.repeat(50) + '\n\n';
      
      entries.forEach(entry => {
        const dayData = typeof Devotional !== 'undefined' ? Devotional.getDay(entry.day) : null;
        
        output += `DAY ${entry.day}`;
        if (entry.season) {
          output += ` - ${entry.season.toUpperCase()}`;
        }
        output += '\n' + '-'.repeat(30) + '\n';
        
        if (includeScripture && dayData) {
          output += `Scripture: ${dayData.scriptureRef}\n`;
          output += `"${dayData.scriptureText}"\n\n`;
        }
        
        output += `My Reflection:\n${entry.content || '(No entry)'}\n\n`;
        output += '\n';
      });
    }
    
    return output;
  }

  /**
   * Export journal to file
   * @param {Array} entries
   * @param {Object} options
   */
  async function exportJournal(entries, options = {}) {
    const { format = 'markdown', filename = 'spiritual-seasons-journal' } = options;
    
    const content = formatJournalExport(entries, { format });
    const extension = format === 'markdown' ? 'md' : 'txt';
    const mimeType = format === 'markdown' ? 'text/markdown' : 'text/plain';
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================
  // Progress Report
  // ============================================

  /**
   * Generate a progress report
   * @param {Object} data
   * @returns {string}
   */
  function generateProgressReport(data) {
    const {
      completedDays,
      totalDays,
      currentSeason,
      currentStreak,
      longestStreak,
      journalCount,
      favoritesCount,
      audioCount
    } = data;

    const percentage = Math.round((completedDays / totalDays) * 100);
    const seasonProgress = {};
    
    ['winter', 'spring', 'summer', 'autumn'].forEach(season => {
      const start = Utils.SEASON_STARTS[season];
      const end = Utils.SEASON_ENDS[season];
      const completed = completedDays.filter ? 
        completedDays.filter(d => d >= start && d <= end).length :
        0;
      seasonProgress[season] = completed;
    });

    return `
╔══════════════════════════════════════════╗
║     SPIRITUAL SEASONS PROGRESS REPORT    ║
╠══════════════════════════════════════════╣
║                                          ║
║  📅 Overall Progress                     ║
║     ${completedDays}/${totalDays} days completed (${percentage}%)            
║                                          ║
║  🌸 Season Progress                      ║
║     Winter:  ${String(seasonProgress.winter).padStart(2)}/30 days              
║     Spring:  ${String(seasonProgress.spring).padStart(2)}/30 days              
║     Summer:  ${String(seasonProgress.summer).padStart(2)}/30 days              
║     Autumn:  ${String(seasonProgress.autumn).padStart(2)}/30 days              
║                                          ║
║  🔥 Current Streak: ${currentStreak} days               
║  🏆 Longest Streak: ${longestStreak} days               
║                                          ║
║  📝 Journal Entries: ${journalCount}                   
║  🎤 Audio Notes: ${audioCount}                      
║  ❤️ Favorites: ${favoritesCount}                        
║                                          ║
║  Current Season: ${currentSeason ? currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1) : 'Not set'}               
║                                          ║
╚══════════════════════════════════════════╝

Generated on ${new Date().toLocaleDateString()}
Spiritual Seasons Daily Devotional
`.trim();
  }

  /**
   * Export all data as JSON
   */
  async function exportAllData() {
    try {
      const data = await Store.exportAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
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
   * Share progress report (NEW - ACTIVATED)
   */
  async function shareProgressReport() {
    try {
      // Get progress stats
      const stats = await Progress.getProgressStats();
      
      const reportData = {
        completedDays: stats.completedDays,
        totalDays: stats.totalDays,
        currentSeason: await Store.getCurrentSeason(),
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        journalCount: stats.journalEntries,
        favoritesCount: stats.favorites,
        audioCount: stats.audioNotes
      };

      const report = generateProgressReport(reportData);

      // Try native share first
      if (isShareSupported()) {
        await share({
          title: 'My Spiritual Seasons Progress',
          text: report
        });
      } else {
        // Fallback to copy to clipboard
        await copyToClipboard(report);
        Toast.success('Progress report copied to clipboard ✓');
      }

      return true;
    } catch (error) {
      Utils.debug.error('Share progress error:', error);
      Toast.error('Failed to share progress');
      return false;
    }
  }

  /**
   * Export progress as text file
   */
  async function exportProgressReport() {
    try {
      const stats = await Progress.getProgressStats();
      
      const reportData = {
        completedDays: stats.completedDays,
        totalDays: stats.totalDays,
        currentSeason: await Store.getCurrentSeason(),
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        journalCount: stats.journalEntries,
        favoritesCount: stats.favorites,
        audioCount: stats.audioNotes
      };

      const report = generateProgressReport(reportData);
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `spiritual-seasons-progress-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      
      URL.revokeObjectURL(url);
      Toast.success('Progress report exported');
      return true;
    } catch (error) {
      Utils.debug.error('Export progress error:', error);
      Toast.error('Failed to export progress');
      return false;
    }
  }

  /**
   * Render share button UI (for progress page)
   */
  function renderShareButton(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="share-actions">
        <button class="btn btn-primary" id="share-progress-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span>Share Progress</span>
        </button>
        
        <button class="btn btn-secondary" id="export-data-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Export Data</span>
        </button>
      </div>
    `;

    // Attach event listeners
    document.getElementById('share-progress-btn')?.addEventListener('click', shareProgressReport);
    document.getElementById('export-data-btn')?.addEventListener('click', () => {
      Modal.create({
        title: 'Export Options',
        content: `
          <div class="export-options">
            <p>Choose what to export:</p>
            <button class="btn btn-primary btn-block export-option-btn" id="export-all-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span>All Data (JSON)</span>
            </button>
            <button class="btn btn-secondary btn-block export-option-btn" id="export-progress-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>Progress Report (TXT)</span>
            </button>
            <button class="btn btn-secondary btn-block export-option-btn" id="export-journal-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>Journal Entries (TXT)</span>
            </button>
          </div>
        `,
        size: 'small',
        buttons: [
          {
            text: 'Cancel',
            className: 'btn-secondary',
            onClick: () => true
          }
        ]
      });

      // Add event listeners for export options
      setTimeout(() => {
        document.getElementById('export-all-btn')?.addEventListener('click', () => {
          exportAllData();
          Modal.close();
        });
        document.getElementById('export-progress-btn')?.addEventListener('click', () => {
          exportProgressReport();
          Modal.close();
        });
        document.getElementById('export-journal-btn')?.addEventListener('click', () => {
          exportJournal();
          Modal.close();
        });
      }, 100);
    });
  }

  // Public API
  return {
    // Native Share
    isShareSupported,
    share,
    shareVerse,
    shareProgress,

    // Clipboard
    copyToClipboard,
    copyVerse,

    // Quote Images
    generateQuoteImage,
    downloadQuoteImage,
    shareQuoteImage,

    // Journal Export
    formatJournalExport,
    exportJournal,

    // Progress Report & Export (ACTIVATED)
    generateProgressReport,
    shareProgressReport,
    exportProgressReport,
    exportAllData,
    renderShareButton
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Sharing;
}
