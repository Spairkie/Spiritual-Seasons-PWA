/**
 * Spiritual Seasons PWA - Main Application
 * Initializes and coordinates all modules
 */

// Main App
const App = (() => {
  let bookData = null;
  let quizData = null;
  let listenerManager = null;
  let abortController = null; // For cancelling fetch requests

  /**
   * Fetch with timeout and cancellation support
   */
  async function fetchWithTimeout(url, timeout = 10000) {
    // Create new abort controller for this request
    abortController = new AbortController();
    const signal = abortController.signal;
    
    return Promise.race([
      fetch(url, { signal }),
      new Promise((_, reject) => 
        setTimeout(() => {
          abortController.abort();
          reject(new Error(`Request timeout for ${url}`));
        }, timeout)
      )
    ]);
  }

  /**
   * Load content data with timeout protection and cancellation
   */
  async function loadData() {
    try {
      const [bookResponse, quizResponse] = await Promise.all([
        fetchWithTimeout('content/book.json'),
        fetchWithTimeout('content/quiz.json')
      ]);

      if (!bookResponse.ok || !quizResponse.ok) {
        throw new Error('Failed to fetch content files');
      }

      bookData = await bookResponse.json();
      quizData = await quizResponse.json();

      return true;
    } catch (error) {
      // Check if request was aborted
      if (error.name === 'AbortError') {
        Utils.debug.log('Data loading was cancelled');
        return false;
      }
      
      Utils.debug.error('Failed to load data:', error);
      
      // More specific error messages
      if (error.message.includes('timeout')) {
        Toast.error('Loading took too long. Please check your connection.');
      } else if (error.message.includes('Failed to fetch')) {
        Toast.error('Unable to load content. Please check your internet connection.');
      } else {
        Toast.error('Failed to load devotional content. Please try again.');
      }
      
      return false;
    }
  }

  function setupRoutes() {
    // Intro Pages Route
    Router.register('intro', async (params) => {
      const container = document.getElementById('intro-content');
      try {
        const page = params.page || 'toc';
        await IntroPages.init();
        IntroPages.render('intro-content', page);
      } catch (error) {
        Utils.debug.error('Intro pages render error:', error);
        if (ErrorHandler && ErrorHandler.handleError) {
          ErrorHandler.handleError(error, 'Intro pages route');
        }
        showErrorInContainer('intro-content', 'Failed to load introductory pages');
      }
    });

    // Progress Route (NEW)
    Router.register('progress', async () => {
      try {
        await Progress.renderDashboard('progress-content');
      } catch (error) {
        Utils.debug.error('Progress render error:', error);
        showErrorInContainer('progress-content', 'Failed to load progress dashboard');
      }
    });

    // Weekly Reflections Route (NEW)
    Router.register('reflections', async () => {
      try {
        await WeeklyReflection.renderReflectionsView('reflections-content');
      } catch (error) {
        Utils.debug.error('Reflections render error:', error);
        showErrorInContainer('reflections-content', 'Failed to load reflections');
      }
    });

    // Search Route (NEW)
    Router.register('search', async () => {
      try {
        await Search.renderSearchInterface('search-content');
      } catch (error) {
        Utils.debug.error('Search render error:', error);
        showErrorInContainer('search-content', 'Failed to load search');
      }
    });

    // Privacy Route (NEW)
    Router.register('privacy', async () => {
      try {
        await Privacy.renderPrivacyDashboard('privacy-content');
      } catch (error) {
        Utils.debug.error('Privacy render error:', error);
        showErrorInContainer('privacy-content', 'Failed to load privacy dashboard');
      }
    });

    Router.register('home', async () => {
      try {
        await renderHome();
      } catch (error) {
        Utils.debug.error('Home render error:', error);
        showErrorInContainer('home-content', 'Failed to load home page');
      }
    });

    Router.register('quiz', async () => {
      try {
        Quiz.renderWelcome('quiz-content');
      } catch (error) {
        Utils.debug.error('Quiz render error:', error);
        showErrorInContainer('quiz-content', 'Failed to load quiz');
      }
    });

    Router.register('devotional', async (params) => {
      try {
        const day = Utils.validateDay(params.day) || await Store.getCurrentDay() || 1;
        await Devotional.render('devotional-content', day);
      } catch (error) {
        Utils.debug.error('Devotional render error:', error);
        showErrorInContainer('devotional-content', 'Failed to load devotional');
      }
    });

    Router.register('contents', async () => {
      try {
        await TOC.render('contents-content');
      } catch (error) {
        Utils.debug.error('Contents render error:', error);
        showErrorInContainer('contents-content', 'Failed to load contents');
      }
    });

    Router.register('favorites', async () => {
      try {
        await renderFavorites();
      } catch (error) {
        Utils.debug.error('Favorites render error:', error);
        showErrorInContainer('favorites-content', 'Failed to load favorites');
      }
    });

    Router.register('settings', async () => {
      try {
        await Settings.render('settings-content');
      } catch (error) {
        Utils.debug.error('Settings render error:', error);
        showErrorInContainer('settings-content', 'Failed to load settings');
      }
    });
  }

  function showErrorInContainer(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    Utils.clearElement(container);
    
    const errorBoundary = Utils.createElement('div', { className: 'error-boundary' });
    errorBoundary.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--autumn-primary)" stroke-width="1.5" style="margin: 0 auto var(--space-4);">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
      <h3 style="color: var(--text-primary); margin-bottom: var(--space-2);">${Utils.escapeHtml(message)}</h3>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-6);">
        We encountered an issue loading this page. You can try refreshing or return to the home page.
      </p>
      <div style="display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="location.reload()">
          ${Utils.getIcon('undo', 16)}
          <span>Refresh Page</span>
        </button>
        <button class="btn btn-secondary" data-route="home">
          ${Utils.getIcon('home', 16)}
          <span>Go Home</span>
        </button>
        <button class="btn btn-ghost" data-route="settings">
          ${Utils.getIcon('settings', 16)}
          <span>Settings</span>
        </button>
      </div>
    `;
    
    container.appendChild(errorBoundary);
  }

  async function renderFavorites() {
    const container = document.getElementById('favorites-content');
    if (!container) return;

    Utils.showLoading(container, 'Loading favorites...');

    const favorites = await Store.getAllFavorites();
    
    Utils.clearElement(container);

    const pageHeader = Utils.createElement('div', { className: 'page-header' },
      Utils.createElement('h1', { className: 'page-title' }, 'Favorites'),
      Utils.createElement('p', { className: 'page-subtitle' }, `${favorites.length} saved devotionals`)
    );

    const pageContent = Utils.createElement('div', { className: 'page-content' });

    if (favorites.length === 0) {
      const emptyState = Utils.createElement('div', { className: 'empty-state' });
      emptyState.innerHTML = `
        <div class="empty-state-icon">
          ${Utils.getIcon('heart', 80)}
        </div>
        <h3 class="empty-state-title">No Favorites Yet</h3>
        <p class="empty-state-description">Mark devotionals as favorites to find them here quickly.</p>
      `;
      const exploreBtn = Utils.createElement('button', {
        className: 'btn btn-primary',
        dataset: { route: 'contents' }
      }, 'Browse Devotionals');
      emptyState.appendChild(exploreBtn);
      pageContent.appendChild(emptyState);
    } else {
      // Sort by day number
      favorites.sort((a, b) => a.day - b.day);

      const favList = Utils.createElement('div', { className: 'card-list' });
      
      for (const fav of favorites) {
        const dayData = Devotional.getDay(fav.day);
        if (!dayData) continue;

        const season = Devotional.getSeasonForDay(fav.day);
        const dayInSeason = Utils.getDayInSeason(fav.day);

        const card = Utils.createElement('div', { className: 'card card-interactive' });
        card.innerHTML = `
          <div class="card-header">
            <div>
              <span class="season-badge" style="font-size: var(--text-xs);">
                ${season.title.split(' — ')[0]} • Day ${dayInSeason}
              </span>
            </div>
            <button class="btn-icon btn-ghost" data-unfavorite="${fav.day}" aria-label="Remove from favorites">
              ${Utils.getIcon('heartFilled', 20)}
            </button>
          </div>
          <h3 class="card-title" style="margin-top: var(--space-2); margin-bottom: var(--space-2);">
            ${Utils.escapeHtml(dayData.scriptureRef)}
          </h3>
          <p class="card-description">"${Utils.escapeHtml(dayData.scriptureText)}"</p>
          ${fav.note ? `
            <div class="favorite-note" style="margin-top: var(--space-3); padding: var(--space-3); background: var(--season-light); border-radius: var(--radius-md); border-left: 3px solid var(--season-primary);">
              <div style="font-size: var(--text-xs); font-weight: 600; color: var(--season-dark); margin-bottom: var(--space-1);">WHY I SAVED THIS</div>
              <div style="font-size: var(--text-sm); color: var(--text-secondary); line-height: var(--leading-relaxed);">${Utils.escapeHtml(fav.note)}</div>
            </div>
          ` : ''}
          <div style="display: flex; gap: var(--space-2); margin-top: var(--space-3); flex-wrap: wrap;">
            <button class="btn btn-ghost btn-sm" data-route="devotional" data-day="${fav.day}">
              Read Devotional
              ${Utils.getIcon('arrowRight', 16)}
            </button>
            <button class="btn btn-ghost btn-sm" data-edit-note="${fav.day}">
              ${Utils.getIcon('edit', 16)}
              ${fav.note ? 'Edit' : 'Add'} Note
            </button>
          </div>
        `;
        
        // Add unfavorite handler
        const unfavoriteBtn = card.querySelector('[data-unfavorite]');
        unfavoriteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await Store.toggleFavorite(fav.day);
          Toast.success('Removed from favorites');
          renderFavorites(); // Refresh the list
        });
        
        // Add edit note handler
        const editNoteBtn = card.querySelector('[data-edit-note]');
        editNoteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          showEditNoteModal(fav.day, fav.note || '', dayData.scriptureRef);
        });
        
        favList.appendChild(card);
      }
      
      pageContent.appendChild(favList);
    }

    container.appendChild(pageHeader);
    container.appendChild(pageContent);
  }
  
  // Helper function to show edit note modal for favorites
  function showEditNoteModal(day, currentNote, scriptureRef) {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div style="margin-bottom: var(--space-4);">
        <label for="favorite-note" style="display: block; font-weight: 600; margin-bottom: var(--space-2); color: var(--text-primary);">
          Why did you save ${scriptureRef}?
        </label>
        <textarea 
          id="favorite-note" 
          class="reflection-textarea"
          rows="4"
          maxlength="500"
          placeholder="Add a personal note to help you remember why this devotional is meaningful to you..."
          style="width: 100%;"
        >${Utils.escapeHtml(currentNote)}</textarea>
        <div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-1);">
          <span id="note-char-count">${currentNote.length}</span>/500 characters
        </div>
      </div>
    `;
    
    const textarea = modalContent.querySelector('#favorite-note');
    const charCount = modalContent.querySelector('#note-char-count');
    
    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
    });
    
    Modal.create({
      title: 'Edit Favorite Note',
      content: modalContent,
      size: 'medium',
      buttons: [
        {
          text: 'Save Note',
          className: 'btn-primary',
          onClick: async () => {
            const note = textarea.value.trim();
            await Store.updateFavoriteNote(day, note);
            Toast.success(note ? 'Note saved' : 'Note removed');
            renderFavorites();
            return true;
          }
        },
        {
          text: 'Cancel',
          className: 'btn-secondary',
          onClick: () => true
        }
      ]
    });
  }

  /**
   * Render the home page with season info, progress, and quick actions
   * @async
   * @returns {Promise<void>}
   * @description Displays:
   *   - Seasonal badge with emoji and title based on current day
   *   - Today's devotional card with scripture preview
   *   - Progress card showing completion and weekly progress
   *   - Wellness tools (meditation, breathing, sounds, favorites)
   */
  async function renderHome() {
    const container = document.getElementById('home-content');
    if (!container) return;

    Utils.showLoading(container, 'Loading...');

    // Fetch all required data in parallel for better performance
    const [currentDay, completedCount, streak, weekProgress] = await Promise.all([
      Store.getCurrentDay(),
      Store.getCompletedDaysCount(),
      Store.getStreak(),
      Store.getWeekProgress()
    ]);

    // Get devotional data for current day
    const dayData = Devotional.getDay(currentDay || 1);
    const season = Devotional.getSeasonForDay(currentDay || 1);

    // Set theme based on current day's season, ensuring consistency
    if (season) {
      document.documentElement.setAttribute('data-season', season.id);
      Utils.debug.log(`[Home] Setting season to: ${season.id} (day ${currentDay})`);
    }

    const dateStr = Utils.formatDate(new Date());
    const greeting = Utils.getGreeting();
    const dayInSeason = season ? Utils.getDayInSeason(currentDay || 1) : 1;

    Utils.clearElement(container);

    // Wrapper with max-width for consistent layout
    const contentWrapper = Utils.createElement('div', { className: 'page-content' });

    const homeContent = Utils.createElement('div');

    // Hero section with greeting and seasonal badge
    const hero = Utils.createElement('div', { className: 'home-hero' },
      Utils.createElement('p', { className: 'home-greeting' }, `📅 ${greeting}`),
      Utils.createElement('h1', { className: 'home-date' }, dateStr)
    );

    if (season) {
      // Extract just the season name (e.g., "Winter" from "Winter — A Season of Stillness")
      const seasonTitle = season.title ? season.title.split(' — ')[0] : season.id.charAt(0).toUpperCase() + season.id.slice(1);
      const seasonEmoji = Utils.getSeasonEmoji(season.id);
      const seasonBadge = Utils.createElement('div', { 
        className: 'season-badge', 
        style: 'margin-bottom: var(--space-4);'
      });
      seasonBadge.innerHTML = `${seasonEmoji} ${seasonTitle}`;
      hero.appendChild(seasonBadge);
    }

    homeContent.appendChild(hero);

    // Today's card
    const todayCard = Utils.createElement('div', { className: 'today-card' });
    
    if (dayData && season) {
      todayCard.innerHTML = `
        <div class="today-card-header">
          <span class="today-label">📖 TODAY'S DEVOTIONAL</span>
          <span class="today-progress">DAY ${dayInSeason} OF 30</span>
        </div>
        <h3 class="today-scripture">${Utils.escapeHtml(dayData.scriptureRef)}</h3>
        <p class="today-text">"${Utils.escapeHtml(dayData.scriptureText)}"</p>
      `;
      
      const continueBtn = Utils.createElement('button', {
        className: 'btn btn-primary btn-block',
        dataset: { route: 'devotional', day: currentDay }
      });
      continueBtn.textContent = 'Continue Reading →';
      todayCard.appendChild(continueBtn);
    } else {
      todayCard.innerHTML = `
        <div class="today-card-header">
          <span class="today-label">📖 TODAY'S DEVOTIONAL</span>
          <span class="today-progress">DAY 0 OF 30</span>
        </div>
        <p class="today-text">Take the quiz to discover your spiritual season and begin your journey.</p>
      `;
      
      const discoverBtn = Utils.createElement('button', {
        className: 'btn btn-primary btn-block',
        dataset: { route: 'quiz' }
      });
      discoverBtn.textContent = 'Discover Your Season →';
      todayCard.appendChild(discoverBtn);
    }

    homeContent.appendChild(todayCard);

    // Quick Wellness Tools section
    const wellnessSection = Utils.createElement('div', { className: 'wellness-section' });
    wellnessSection.innerHTML = `
      <div class="wellness-header">QUICK WELLNESS TOOLS</div>
      <div class="wellness-tools-grid">
        <button class="wellness-tool-card wellness-meditation" data-show-meditation-timer>
          <div class="tool-icon">⏱️</div>
          <div class="tool-title">5 Min Meditation</div>
          <div class="tool-subtitle">Peace & stillness</div>
        </button>
        <button class="wellness-tool-card wellness-breathe" data-show-breathing>
          <div class="tool-icon">💨</div>
          <div class="tool-title">Breathe</div>
          <div class="tool-subtitle">Box pattern 4-4-4-4</div>
        </button>
        <button class="wellness-tool-card wellness-sounds" data-show-ambient>
          <div class="tool-icon">🎵</div>
          <div class="tool-title">Ambient Sounds</div>
          <div class="tool-subtitle">Calming soundscape</div>
        </button>
        <button class="wellness-tool-card wellness-favorites" data-route="favorites">
          <div class="tool-icon">❤️</div>
          <div class="tool-title">Favorites</div>
          <div class="tool-subtitle">View saved days</div>
        </button>
      </div>
    `;
    homeContent.appendChild(wellnessSection);

    // Daily verse quote
    const verseQuote = Utils.createElement('div', { className: 'home-verse-quote' });
    verseQuote.innerHTML = `
      <p class="verse-quote-text">"Be still, and know that I am God"</p>
      <p class="verse-quote-ref">— Psalm 46:10</p>
    `;
    homeContent.appendChild(verseQuote);

    // Wrap homeContent in page-content container
    contentWrapper.appendChild(homeContent);
    container.appendChild(contentWrapper);

    // Add event listeners for wellness tools
    const meditationBtn = container.querySelector('[data-show-meditation-timer]');
    if (meditationBtn && typeof MeditationTimer !== 'undefined') {
      meditationBtn.addEventListener('click', () => {
        MeditationTimer.showTimer();
      });
    }

    const breathingBtn = container.querySelector('[data-show-breathing]');
    if (breathingBtn && typeof GuidedBreathing !== 'undefined') {
      breathingBtn.addEventListener('click', () => {
        GuidedBreathing.showBreathing();
      });
    }

    const ambientBtn = container.querySelector('[data-show-ambient]');
    if (ambientBtn && typeof AmbientSound !== 'undefined') {
      ambientBtn.addEventListener('click', () => {
        showAmbientSoundPanel();
      });
    }
  }

  // Helper function to show ambient sound panel - FIXED
  function showAmbientSoundPanel() {
    if (typeof AmbientSound === 'undefined' || typeof Modal === 'undefined') return;

    const presets = AmbientSound.getAvailablePresets();
    const currentStatus = AmbientSound.getStatus();
    
    // Fix: Ensure we have valid presets
    if (!presets || presets.length === 0) {
      Toast.error('Ambient sounds not available');
      return;
    }

    // Fix: Ensure volume is a valid number
    const currentVolume = (typeof currentStatus.volume === 'number' && !isNaN(currentStatus.volume)) 
      ? currentStatus.volume 
      : 0.7;
    
    // Emoji mapping for presets
    const presetEmojis = {
      'silence': '🔇',
      'winter': '❄️',
      'spring': '🌸',
      'summer': '☀️',
      'autumn': '🍂',
      'rain': '🌧️',
      'ocean': '🌊',
      'forest': '🌲',
      'night': '🌙',
      'whitenoise': '📻',
      'auto': '🔄'
    };
    
    const presetsHtml = presets
      .filter(preset => preset.value !== 'silence' && preset.value !== 'auto') // Hide silence and auto
      .map(preset => {
        const emoji = presetEmojis[preset.value] || '🎵';
        const name = preset.label || 'Unknown';
        return `
          <button class="btn btn-secondary btn-block" 
                  style="margin-bottom: var(--space-2); justify-content: flex-start; text-align: left;"
                  data-preset="${preset.value}">
            <span style="margin-right: var(--space-2);">${emoji}</span>
            <div style="font-weight: 600;">${name}</div>
          </button>
        `;
      }).join('');

    const modal = Modal.create({
      title: '🎵 Ambient Sounds',
      content: `
        <div style="max-height: 60vh; overflow-y: auto;">
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4); text-align: center;">
            Choose a calming soundscape for your devotional time
          </p>
          ${presetsHtml}
        </div>
        <div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-primary);">
          <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3);">
            <label style="flex: 1;">Volume</label>
            <input type="range" min="0" max="100" value="${Math.round(currentVolume * 100)}" 
                   id="ambient-volume-slider" 
                   style="flex: 2;"
                   oninput="this.nextElementSibling.textContent = this.value + '%'">
            <span style="min-width: 40px; text-align: right;">${Math.round(currentVolume * 100)}%</span>
          </div>
        </div>
      `,
      size: 'medium',
      buttons: [
        {
          text: currentStatus.isPlaying ? 'Stop' : 'Close',
          className: currentStatus.isPlaying ? 'btn-danger' : 'btn-secondary',
          onClick: () => {
            if (currentStatus.isPlaying) {
              AmbientSound.stop();
            }
          }
        }
      ]
    });

    // Add preset click handlers
    const modalElement = modal.getElement();
    modalElement.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const presetId = btn.getAttribute('data-preset');
        if (!presetId) return;
        
        try {
          await AmbientSound.changePreset(presetId);
          await AmbientSound.play();
          const presetName = btn.querySelector('div')?.textContent || 'Sound';
          Toast.success(`Playing: ${presetName}`);
          modal.close();
        } catch (error) {
          Utils.debug.error('Failed to play ambient sound:', error);
          Toast.error('Failed to play sound');
        }
      });
    });

    // Volume slider handler
    const volumeSlider = modalElement.querySelector('#ambient-volume-slider');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value) / 100;
        if (!isNaN(volume)) {
          AmbientSound.setVolume(volume);
        }
      });
    }
  }

  async function init() {
    Utils.debug.log('%c✨ Spiritual Seasons v' + CONFIG.APP_VERSION + ' ✨', 
      'font-size: 20px; font-weight: bold; color: #4A90A4; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);'
    );
    Utils.debug.log('%cBy Dr. Jacqueline Ghee • Built with ❤️', 
      'font-size: 12px; color: #5D6D7E;'
    );
    Utils.debug.log('Initializing Spiritual Seasons PWA...');

    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; flex-direction: column; gap: var(--space-4);">
        <div class="loading-spinner"></div>
        <p style="color: var(--text-secondary);">Loading...</p>
      </div>
    `;

    try {
      // Initialize error handling FIRST
      ErrorHandler.init();
      Utils.debug.log('✓ Error handling initialized');
      
      // Initialize core infrastructure
      if (typeof StateManager !== 'undefined') {
        StateManager.init();
        Utils.debug.log('✓ State manager initialized');
      }
      
      if (typeof BlobManager !== 'undefined') {
        BlobManager.setupAutoCleanup();
        Utils.debug.log('✓ Blob manager initialized');
      }
      
      if (typeof SyncQueue !== 'undefined') {
        SyncQueue.init();
        
        // Register sync handlers
        SyncQueue.registerHandler('save-journal', async (data) => {
          return await Store.saveJournalEntry(data.day, data.content, data.season);
        });
        
        SyncQueue.registerHandler('mark-complete', async (data) => {
          return await Store.markDayComplete(data.day, data.season);
        });
        
        SyncQueue.registerHandler('toggle-favorite', async (data) => {
          return await Store.toggleFavorite(data.day);
        });
        
        // Listen to sync events
        SyncQueue.on((event, operation) => {
          if (event === 'success') {
            Utils.debug.log('✓ Synced:', operation?.type);
          } else if (event === 'failed') {
            Toast.error(`Failed to sync ${operation?.type}`);
          } else if (event === 'online') {
            Toast.success('Connection restored - syncing changes...');
          }
        });
        
        Utils.debug.log('✓ Sync queue initialized');
      }

      // Initialize database
      await Store.init();
      Utils.debug.log('✓ Store initialized (v' + CONFIG.DB.VERSION + ')');

      // Initialize theme system (light mode default)
      ThemeManager.init();
      Utils.debug.log('✓ ThemeManager initialized (light mode default)');

      // Load content data
      const dataLoaded = await loadData();
      if (!dataLoaded) {
        throw new Error('Failed to load content data');
      }
      Utils.debug.log('✓ Content loaded');

      // Initialize modules
      TTS.init();
      await AmbientSound.init();
      Quiz.init(quizData);
      Devotional.init(bookData);
      await IntroPages.init();
      await AudioNotes.init();
      await Progress.init();
      await WeeklyReflection.init();
      await Search.init();
      await Privacy.init();
      await Notifications.init();
      await KeyboardShortcuts.init();
      
      // Initialize new feature modules
      await MeditationTimer.init();
      await GuidedBreathing.init();
      PageTransitions.init();
      
      // Initialize error boundaries and haptics
      ErrorBoundary.initGlobalHandlers();
      Haptics.init();
      Haptics.attachToButtons();
      
      // Initialize blob cleanup
      BlobManager.setupAutoCleanup();
      
      Utils.debug.log('✓ Modules initialized');

      // Apply saved settings
      await Settings.applySettings();
      Settings.initSystemThemeListener();

      // Get current day and set theme based on progress (not quiz)
      const currentDay = await Store.getCurrentDay() || 1;
      const currentDaySeason = Devotional.getSeasonForDay(currentDay);
      
      if (currentDaySeason) {
        ThemeManager.setSeason(currentDaySeason.id);
        document.documentElement.setAttribute('data-season', currentDaySeason.id);
      }

      // Render app shell and setup routing
      renderAppShell();
      setupRoutes();

      // Set default route
      const quizResults = await Store.getQuizResults();
      if (!quizResults) {
        Router.setDefault('intro'); // Show intro pages for first-time users
      }
      Router.init();

      // Add online/offline detection with persistent indicator
      function showOfflineIndicator() {
        if (document.getElementById('offline-indicator')) return; // Already showing
        
        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.className = 'offline-indicator';
        indicator.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
          <span>You're offline. Changes will sync when online.</span>
        `;
        document.body.appendChild(indicator);
      }

      function hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
          indicator.classList.add('fade-out');
          setTimeout(() => indicator.remove(), 300);
        }
      }

      window.addEventListener('online', () => {
        hideOfflineIndicator();
        Toast.success('Connection restored - syncing...');
        Utils.debug.log('📶 Online');
      });

      window.addEventListener('offline', () => {
        showOfflineIndicator();
        Toast.warning('You are offline');
        Utils.debug.log('📵 Offline');
      });

      // Show offline indicator on load if already offline
      if (!navigator.onLine) {
        showOfflineIndicator();
      }

      Utils.debug.log('✅ App initialized successfully (v' + CONFIG.APP_VERSION + ')');
      Utils.debug.log('Current status: ' + (navigator.onLine ? '📶 Online' : '📵 Offline'));
      
      // Show onboarding tour for new users
      setTimeout(() => {
        OnboardingTour.showTourPrompt();
      }, 1000);

    } catch (error) {
      Utils.debug.error('Failed to initialize app:', error);
      document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; flex-direction: column; gap: var(--space-4); padding: var(--space-4); text-align: center;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--autumn-primary)" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <h2 style="color: var(--text-primary);">Something went wrong</h2>
          <p style="color: var(--text-secondary);">${Utils.escapeHtml(error.message) || 'Please refresh the page to try again.'}</p>
          <button class="btn btn-primary" onclick="location.reload()">Refresh</button>
        </div>
      `;
    }
  }

  function renderAppShell() {
    document.body.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <div class="season-accent-bar"></div>
          <div class="header-content">
            <div class="header-title" data-route="home" style="cursor: pointer;">
              <img src="assets/icons/icon.svg" alt="" class="header-logo" onerror="this.style.display='none'">
              Spiritual Seasons
            </div>
            <div class="header-actions">
              <button class="btn-icon btn-ghost" data-route="search" aria-label="Search">
                ${Utils.getIcon('search', 20)}
              </button>
              <button class="btn-icon btn-ghost" data-route="settings" aria-label="Settings">
                ${Utils.getIcon('settings', 20)}
              </button>
            </div>
          </div>
        </header>

        <main class="app-main">
          <div id="page-home" class="page"><div id="home-content"></div></div>
          <div id="page-intro" class="page"><div id="intro-content"></div></div>
          <div id="page-quiz" class="page"><div id="quiz-content"></div></div>
          <div id="page-devotional" class="page"><div id="devotional-content"></div></div>
          <div id="page-contents" class="page"><div id="contents-content"></div></div>
          <div id="page-search" class="page"><div id="search-content"></div></div>
          <div id="page-favorites" class="page"><div id="favorites-content"></div></div>
          <div id="page-progress" class="page"><div id="progress-content"></div></div>
          <div id="page-reflections" class="page"><div id="reflections-content"></div></div>
          <div id="page-privacy" class="page"><div id="privacy-content"></div></div>
          <div id="page-settings" class="page"><div id="settings-content"></div></div>
        </main>

        <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
          <div class="bottom-nav-content">
            <a class="nav-item" data-route="home" aria-label="Home">
              ${Utils.getIcon('home', 24)}
              <span>Home</span>
            </a>
            <a class="nav-item" data-route="devotional" aria-label="Read">
              ${Utils.getIcon('book', 24)}
              <span>Read</span>
            </a>
            <a class="nav-item" data-route="contents" aria-label="Contents">
              ${Utils.getIcon('list', 24)}
              <span>Contents</span>
            </a>
            <a class="nav-item" data-route="progress" aria-label="Progress">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>Progress</span>
            </a>
            <a class="nav-item" data-route="settings" aria-label="Settings">
              ${Utils.getIcon('settings', 24)}
              <span>Settings</span>
            </a>
          </div>
        </nav>
      </div>
    `;
  }

  function cleanup() {
    // Cancel any pending requests
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    
    if (listenerManager) {
      listenerManager.removeAll();
    }
    Router.cleanup();
    
    // Cleanup PWA listeners (if service worker is supported)
    if (typeof pwaListenerManager !== 'undefined' && pwaListenerManager) {
      pwaListenerManager.removeAll();
    }
    
    // Cleanup audio if recording
    if (typeof AudioNotes !== 'undefined') {
      if (AudioNotes.isRecording()) {
        AudioNotes.cancelRecording();
      }
    }
    
    // Cleanup all blob URLs
    if (typeof BlobManager !== 'undefined') {
      BlobManager.revokeAll();
    }
    
    // Cleanup all event listeners
    if (typeof EventManager !== 'undefined') {
      EventManager.cleanupAll();
    }
    
    Utils.debug.log('✓ App cleanup complete');
  }

  return {
    init,
    renderHome,
    cleanup
  };
})();

// Start the app
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  App.cleanup();
});

// Register service worker with update detection
if ('serviceWorker' in navigator) {
  let deferredPrompt = null;
  let pwaListenerManager = null;

  // Capture PWA install prompt
  const handleBeforeInstallPrompt = (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install promotion after user engages with app
    setTimeout(() => {
      showPWAInstallPromotion();
    }, 60000); // After 1 minute
  };

  // Listen for successful installation
  const handleAppInstalled = () => {
    Utils.debug.log('PWA installed successfully');
    Toast.success('App installed! You can now launch it from your home screen.');
    deferredPrompt = null;
  };

  // Initialize PWA event listeners
  pwaListenerManager = Utils.createListenerManager();
  pwaListenerManager.add(window, 'beforeinstallprompt', handleBeforeInstallPrompt);
  pwaListenerManager.add(window, 'appinstalled', handleAppInstalled);

  // Show PWA install promotion
  function showPWAInstallPromotion() {
    if (!deferredPrompt) return;
    
    // Check if user has previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;
    
    const toast = Toast.info(
      'Install Spiritual Seasons for a better experience!',
      {
        duration: 0, // Don't auto-dismiss
        action: {
          text: 'Install',
          onClick: async () => {
            if (!deferredPrompt) return;
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            Utils.debug.log(`User ${outcome} the install prompt`);
            
            if (outcome === 'accepted') {
              Toast.success('Thanks for installing!');
            }
            
            deferredPrompt = null;
          }
        },
        dismissButton: true,
        onDismiss: () => {
          localStorage.setItem('pwa-install-dismissed', 'true');
        }
      }
    );
  }

  // Register service worker
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        Utils.debug.log('ServiceWorker registered:', registration.scope);
        
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
        
        // Detect new version available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              Utils.debug.log('New version available');
              
              Toast.info(
                'A new version is available!',
                {
                  duration: 0, // Don't auto-dismiss
                  action: {
                    text: 'Update',
                    onClick: () => {
                      window.location.reload();
                    }
                  }
                }
              );
            }
          });
        });
      })
      .catch(error => {
        Utils.debug.error('ServiceWorker registration failed:', error);
      });
  });
}

// Note: Global error handlers are in error-handler.js
// No duplicate handlers needed here

