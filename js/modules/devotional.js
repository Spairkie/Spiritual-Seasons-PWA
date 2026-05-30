/**
 * Spiritual Seasons PWA - Devotional Module
 * Handles devotional content, journal entries, TTS, and sharing
 */

const Devotional = (() => {
  let bookData = null;
  let saveTimeout = null;
  let listenerManager = null;
  
  // Improved async save queue to prevent race conditions
  let activeSavePromise = null;
  let pendingSaveData = null;

  /**
   * Queue a journal save operation with proper race condition handling
   * @param {number} day - Day number
   * @param {string} content - Journal content
   * @param {string} seasonId - Season ID
   * @returns {Promise<void>}
   */
  async function queueJournalSave(day, content, seasonId) {
    // Validate content length
    if (content.length > CONFIG.LIMITS.MAX_JOURNAL_LENGTH) {
      Toast.error(`Journal entry too long (max ${CONFIG.LIMITS.MAX_JOURNAL_LENGTH.toLocaleString()} characters)`);
      return;
    }
    
    // Store the latest data
    pendingSaveData = { day, content, seasonId };
    
    // If there's already a save in progress, it will pick up the latest data
    if (activeSavePromise) {
      return activeSavePromise;
    }
    
    // Start new save operation
    activeSavePromise = (async () => {
      while (pendingSaveData) {
        const dataToSave = pendingSaveData;
        pendingSaveData = null;
        
        try {
          await Store.saveJournalEntry(dataToSave.day, dataToSave.content, dataToSave.seasonId);
          
          // Update UI indicators
          const saveIndicator = document.getElementById('save-indicator');
          const lastSaved = document.getElementById('last-saved');
          
          if (saveIndicator) {
            saveIndicator.classList.remove('saving');
            saveIndicator.classList.add('saved');
            
            if (lastSaved) {
              lastSaved.textContent = `Last saved ${formatTimeAgo(new Date())}`;
            }
            
            setTimeout(() => {
              if (saveIndicator) {
                saveIndicator.classList.remove('saved');
              }
            }, 3000);
          }
          
          // Update progress if content exists
          if (dataToSave.content && dataToSave.content.trim().length > 0) {
            await Progress.updateStreaks();
          }
          
          // Rebuild search index after saving
          if (typeof Search !== 'undefined' && Search.rebuildIndex) {
            Search.rebuildIndex().catch(err => 
              Utils.debug.error('Failed to rebuild search index:', err)
            );
          }
          
        } catch (error) {
          Utils.debug.error('Failed to save journal entry:', error);
          Toast.error('Failed to save entry');
          
          const saveIndicator = document.getElementById('save-indicator');
          if (saveIndicator) {
            saveIndicator.classList.remove('saving', 'saved');
          }
        }
      }
      
      activeSavePromise = null;
    })();
    
    return activeSavePromise;
  }
  
  /**
   * Format time ago helper
   * @param {Date} date
   * @returns {string}
   */
  function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return 'a while ago';
  }

  /**
   * Create a link to Bible Gateway for a scripture reference
   * @param {string} reference - Scripture reference (e.g., "John 3:16")
   * @param {string} version - Bible version (default: NLT)
   * @returns {string} URL to Bible Gateway
   */
  function createBibleGatewayLink(reference, version = 'NLT') {
    const encoded = encodeURIComponent(reference);
    return `https://www.biblegateway.com/passage/?search=${encoded}&version=${version}`;
  }

  function init(data) {
    bookData = data;
  }

  function getSeasons() {
    return bookData?.seasons || [];
  }

  function getSeason(seasonId) {
    return bookData?.seasons?.find(s => s.id === seasonId) || null;
  }

  function getSeasonForDay(day) {
    const validDay = Utils.validateDay(day);
    if (!validDay) return null;
    
    if (validDay >= 1 && validDay <= 30) return getSeason('winter');
    if (validDay >= 31 && validDay <= 60) return getSeason('spring');
    if (validDay >= 61 && validDay <= 90) return getSeason('summer');
    if (validDay >= 91 && validDay <= 120) return getSeason('autumn');
    return null;
  }

  function getDay(day) {
    const season = getSeasonForDay(day);
    if (!season) return null;
    return season.days?.find(d => d.day === day) || null;
  }

  function getTotalDays() {
    return 120;
  }

  function getDaysInSeason(seasonId) {
    const season = getSeason(seasonId);
    return season?.days || [];
  }

  function dayExists(day) {
    return Utils.validateDay(day) !== null;
  }

  function getNextDay(currentDay) {
    const valid = Utils.validateDay(currentDay);
    if (valid && valid < 120) return valid + 1;
    return null;
  }

  function getPrevDay(currentDay) {
    const valid = Utils.validateDay(currentDay);
    if (valid && valid > 1) return valid - 1;
    return null;
  }

  function getFrontMatter() {
    return bookData?.frontMatter || { 
      introduction: { text: '', scripture: '' }, 
      howToUse: { steps: [] } 
    };
  }

  function getMetadata() {
    return {
      title: bookData?.title || 'Spiritual Seasons',
      author: bookData?.author || '',
      description: bookData?.description || ''
    };
  }

  async function render(containerId, day) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Cleanup previous listeners
    if (listenerManager) {
      listenerManager.removeAll();
    }
    listenerManager = Utils.createListenerManager();

    // Validate day
    const validDay = Utils.validateDay(day);
    if (!validDay) {
      renderError(container, 'Invalid day number');
      return;
    }

    Utils.showLoading(container, 'Loading devotional...');

    const dayData = getDay(validDay);
    if (!dayData) {
      renderError(container, 'Day not found');
      return;
    }

    const season = getSeasonForDay(validDay);
    const [journalEntry, progress, isFavorite] = await Promise.all([
      Store.getJournalEntry(validDay),
      Store.getDayProgress(validDay),
      Store.isFavorite(validDay)
    ]);

    // Update theme
    document.documentElement.setAttribute('data-season', season.id);

    const dayInSeason = Utils.getDayInSeason(validDay);

    Utils.clearElement(container);

    const devotionalContent = document.createElement('div');

    devotionalContent.innerHTML = `
      <div class="devotional-header">
        <div class="devotional-day-badge">
          ${Utils.escapeHtml(season.title.split(' — ')[0])} • Day ${dayInSeason} of 30
        </div>
        
        <h2 class="devotional-scripture-ref">${Utils.escapeHtml(dayData.scriptureRef)}</h2>
        <p class="devotional-scripture-text">"${Utils.escapeHtml(dayData.scriptureText)}"</p>
        
        <div class="devotional-actions" style="margin-top: var(--space-4); display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: center;">
          <!-- TTS Button -->
          <button class="btn btn-ghost btn-sm" id="tts-btn" aria-label="Listen to scripture">
            ${Utils.getIcon('volume', 18)}
            <span id="tts-label">Listen</span>
          </button>
          
          <!-- Bible Gateway Link -->
          <a 
            href="${createBibleGatewayLink(dayData.scriptureRef)}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="btn btn-ghost btn-sm"
            aria-label="Read full chapter on Bible Gateway">
            ${Utils.getIcon('externalLink', 18)}
            <span>Read Full Chapter</span>
          </a>
        </div>
      </div>

      <div class="devotional-prompt">
        <div class="devotional-prompt-label">Today's Reflection</div>
        <p class="devotional-prompt-text">${Utils.escapeHtml(dayData.prompt)}</p>
      </div>

      <div class="journal-section">
        <div class="journal-header">
          <span class="journal-label-text">Your Journal Entry</span>
          <div class="journal-meta">
            <span class="journal-count" id="word-count">0 words</span>
            <span class="journal-save-indicator" id="save-indicator">
              <span class="save-status saving">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinner">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Saving...
              </span>
              <span class="save-status saved">
                ${Utils.getIcon('check', 14)}
                Saved
              </span>
            </span>
          </div>
        </div>
        <textarea 
          class="journal-textarea" 
          id="journal-entry"
          maxlength="50000"
          placeholder="Write your reflections here... Your entries are automatically saved as you type."
          aria-label="Journal entry"
        >${Utils.escapeHtml(journalEntry?.content || '')}</textarea>
        <div class="journal-footer">
          <span class="journal-char-count" id="char-count">0 characters</span>
          <span class="journal-last-saved" id="last-saved"></span>
        </div>
        
        <!-- Audio recording container -->
        <div id="audio-container" style="margin-top: var(--space-4);"></div>
      </div>

      <!-- Sharing section -->
      <div style="padding: 0 var(--space-4) var(--space-4);">
        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
          <button class="btn btn-ghost btn-sm" id="share-verse-btn">
            ${Utils.getIcon('share', 16)}
            Share Verse
          </button>
          <button class="btn btn-ghost btn-sm" id="create-image-btn">
            ${Utils.getIcon('image', 16)}
            Create Shareable Image
          </button>
        </div>
      </div>

      <div class="devotional-nav">
        <button class="devotional-nav-btn" id="prev-day" ${validDay === 1 ? 'disabled' : ''}>
          ${Utils.getIcon('chevronLeft', 16)}
          Day ${validDay - 1}
        </button>

        <div style="display: flex; gap: var(--space-2);">
          <button class="btn-icon btn-ghost favorite-btn ${isFavorite ? 'active' : ''}" id="toggle-favorite" aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
            ${isFavorite ? Utils.getIcon('heartFilled', 20) : Utils.getIcon('heart', 20)}
          </button>
          
          <button class="devotional-complete-btn ${progress?.completed ? 'completed' : ''}" id="mark-complete">
            ${progress?.completed ? `${Utils.getIcon('check', 16)} Completed` : 'Mark Complete'}
          </button>
        </div>

        <button class="devotional-nav-btn" id="next-day" ${validDay === 120 ? 'disabled' : ''}>
          ${validDay === 30 ? 'Spring Season →' : 
            validDay === 60 ? 'Summer Season →' : 
            validDay === 90 ? 'Autumn Season →' : 
            `Day ${validDay + 1}`}
          ${validDay !== 30 && validDay !== 60 && validDay !== 90 ? Utils.getIcon('chevronRight', 16) : ''}
        </button>
      </div>
    `;

    // Wrap devotional content in max-width container
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'page-content';
    contentWrapper.appendChild(devotionalContent);
    
    container.appendChild(contentWrapper);
    attachListeners(containerId, validDay, season, dayData);
  }

  function renderError(container, message) {
    Utils.clearElement(container);
    const errorContent = Utils.createElement('div', { className: 'empty-state' });
    errorContent.innerHTML = `
      <div class="empty-state-icon">
        ${Utils.getIcon('warning', 80)}
      </div>
      <h3 class="empty-state-title">Day Not Found</h3>
      <p class="empty-state-description">${Utils.escapeHtml(message)}</p>
    `;
    const homeBtn = Utils.createElement('button', {
      className: 'btn btn-primary',
      dataset: { route: 'home' }
    }, 'Return Home');
    errorContent.appendChild(homeBtn);
    container.appendChild(errorContent);
  }

  function attachListeners(containerId, day, season, dayData) {
    // Enhanced Journal auto-save with word/character count
    const textarea = document.getElementById('journal-entry');
    const saveIndicator = document.getElementById('save-indicator');
    const wordCount = document.getElementById('word-count');
    const charCount = document.getElementById('char-count');
    const lastSaved = document.getElementById('last-saved');

    if (textarea) {
      // Initial count update
      updateCounts(textarea.value);

      // Enhanced autosave with visual feedback
      listenerManager.add(textarea, 'input', () => {
        const content = textarea.value;
        
        // Update counts immediately
        updateCounts(content);
        
        // Show saving indicator
        if (saveIndicator) {
          saveIndicator.classList.remove('saved');
          saveIndicator.classList.add('saving');
        }
        
        // Debounced save with race-condition-free queuing
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          queueJournalSave(day, content, season.id).catch(error => {
            Utils.debug.error('Save error:', error);
          });
        }, CONFIG.JOURNAL.AUTOSAVE_DELAY_MS);
      });

      // Handle focus/blur for better UX
      listenerManager.add(textarea, 'focus', () => {
        textarea.classList.add('focused');
      });

      listenerManager.add(textarea, 'blur', () => {
        textarea.classList.remove('focused');
      });
    }

    // Helper function to update word and character counts
    function updateCounts(text) {
      const trimmed = text.trim();
      const words = trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;
      const chars = text.length;

      if (wordCount) {
        wordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
      }

      if (charCount) {
        charCount.textContent = `${chars} ${chars === 1 ? 'character' : 'characters'}`;
      }
    }

    // Initialize audio controls
    if (typeof AudioNotes !== 'undefined') {
      AudioNotes.renderAudioControls('audio-container', day);
    }

    // TTS Button
    const ttsBtn = document.getElementById('tts-btn');
    const ttsLabel = document.getElementById('tts-label');
    
    if (ttsBtn && typeof TTS !== 'undefined' && TTS.isSupported()) {
      listenerManager.add(ttsBtn, 'click', async () => {
        const status = TTS.getStatus();
        
        if (status.isReading && !status.isPaused) {
          TTS.pause();
          ttsLabel.textContent = 'Resume';
        } else if (status.isPaused) {
          TTS.resume();
          ttsLabel.textContent = 'Pause';
        } else {
          ttsLabel.textContent = 'Reading...';
          const text = `${dayData.scriptureRef}. ${dayData.scriptureText}. Today's reflection: ${dayData.prompt}`;
          TTS.read(text, {
            onEnd: () => {
              ttsLabel.textContent = 'Listen';
              Toast.success('Finished reading');
            },
            onPause: () => {
              ttsLabel.textContent = 'Resume';
            },
            onResume: () => {
              ttsLabel.textContent = 'Pause';
            }
          });
        }
      });
    } else if (ttsBtn) {
      ttsBtn.style.display = 'none';
    }

    // Share verse
    const shareBtn = document.getElementById('share-verse-btn');
    if (shareBtn && typeof Sharing !== 'undefined') {
      listenerManager.add(shareBtn, 'click', async () => {
        try {
          await Sharing.shareVerse(dayData.scriptureRef, dayData.scriptureText, season.id);
          Toast.show('Verse shared!', 'success');
        } catch (error) {
          // Fallback to copy
          try {
            await Sharing.copyVerse(dayData.scriptureRef, dayData.scriptureText);
            Toast.show('Verse copied to clipboard', 'success');
          } catch (e) {
            Toast.show('Failed to share', 'error');
          }
        }
      });
    }

    // Create quote image
    const imageBtn = document.getElementById('create-image-btn');
    if (imageBtn && typeof VerseImages !== 'undefined') {
      listenerManager.add(imageBtn, 'click', async () => {
        try {
          await VerseImages.showGenerator(dayData.scriptureText, dayData.scriptureRef, season.id);
        } catch (error) {
          Utils.debug.error('Image creation error:', error);
          Toast.error('Failed to create image');
        }
      });
    } else if (imageBtn && typeof Sharing !== 'undefined') {
      // Fallback to old sharing method if VerseImages not available
      listenerManager.add(imageBtn, 'click', async () => {
        try {
          Toast.show('Creating image...', 'info');
          await Sharing.downloadQuoteImage({
            reference: dayData.scriptureRef,
            text: dayData.scriptureText,
            season: season.id
          });
          Toast.show('Image downloaded!', 'success');
        } catch (error) {
          Utils.debug.error('Image creation error:', error);
          Toast.show('Failed to create image', 'error');
        }
      });
    }

    // Previous day
    const prevBtn = document.getElementById('prev-day');
    if (prevBtn) {
      listenerManager.add(prevBtn, 'click', () => {
        const prevDay = getPrevDay(day);
        if (prevDay) {
          Router.navigate('devotional', { day: prevDay });
        }
      });
    }

    // Next day
    const nextBtn = document.getElementById('next-day');
    if (nextBtn) {
      listenerManager.add(nextBtn, 'click', () => {
        // Check if this is the last day of a season
        if (day === 30 || day === 60 || day === 90) {
          // Navigate to the next season's intro page
          const seasonMap = {
            30: 'spring',  // After winter (days 1-30), show spring intro
            60: 'summer',  // After spring (days 31-60), show summer intro
            90: 'autumn'   // After summer (days 61-90), show autumn intro
          };
          const nextSeason = seasonMap[day];
          Router.navigate('intro', { page: nextSeason });
        } else {
          // Normal next day navigation
          const nextDay = getNextDay(day);
          if (nextDay) {
            Router.navigate('devotional', { day: nextDay });
          }
        }
      });
    }

    // Toggle favorite
    const favBtn = document.getElementById('toggle-favorite');
    if (favBtn) {
      listenerManager.add(favBtn, 'click', async () => {
        try {
          const isNowFavorite = await Store.toggleFavorite(day, season.id, dayData.scriptureRef);
          
          favBtn.classList.toggle('active', isNowFavorite);
          favBtn.innerHTML = isNowFavorite ? Utils.getIcon('heartFilled', 20) : Utils.getIcon('heart', 20);
          favBtn.setAttribute('aria-label', isNowFavorite ? 'Remove from favorites' : 'Add to favorites');
          
          Toast.show(isNowFavorite ? 'Added to favorites' : 'Removed from favorites', 'success');
        } catch (error) {
          Utils.debug.error('Toggle favorite error:', error);
          Toast.show('Failed to update favorite', 'error');
        }
      });
    }

    // Mark complete
    const completeBtn = document.getElementById('mark-complete');
    if (completeBtn) {
      listenerManager.add(completeBtn, 'click', async () => {
        try {
          const progress = await Store.getDayProgress(day);
          
          if (progress?.completed) {
            await Store.markDayIncomplete(day);
            completeBtn.classList.remove('completed');
            completeBtn.innerHTML = 'Mark Complete';
            Toast.show('Day marked as incomplete', 'warning');
          } else {
            await Store.markDayComplete(day, season.id);
            await Store.updateStreak();
            await Store.setCurrentDay(day);
            
            completeBtn.classList.add('completed');
            completeBtn.innerHTML = `${Utils.getIcon('check', 16)} Completed`;
            Toast.show('Day completed! Keep up the great work.', 'success');
          }
        } catch (error) {
          Utils.debug.error('Complete toggle error:', error);
          Toast.show('Failed to update progress', 'error');
        }
      });
    }
  }

  return {
    init,
    getSeasons,
    getSeason,
    getSeasonForDay,
    getDay,
    getTotalDays,
    getDaysInSeason,
    dayExists,
    getNextDay,
    getPrevDay,
    render,
    getFrontMatter,
    getMetadata
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Devotional;
}
