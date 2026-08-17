/**
 * Spiritual Seasons PWA - Store Module
 * IndexedDB wrapper for persistent storage
 */

const Store = (() => {
  const DB_NAME = 'spiritual-seasons-db';
  const DB_VERSION = 1;  
  let db = null;

  const STORES = {
    USER: 'user',
    JOURNAL: 'journal',
    PROGRESS: 'progress',
    FAVORITES: 'favorites',
    SETTINGS: 'settings',
    AUDIO_NOTES: 'audioNotes',  
    WEEKLY_REFLECTIONS: 'weeklyReflections', 
    STREAKS: 'streaks' 
  };

  async function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        Utils.debug.error('Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        Utils.debug.log('Database initialized successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        const transaction = event.target.transaction;
        
        Utils.debug.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
        
        // Version 1: Initial schema
        if (oldVersion < 1) {
          // User store
          if (!db.objectStoreNames.contains(STORES.USER)) {
            db.createObjectStore(STORES.USER, { keyPath: 'key' });
          }
          
          // Journal store with indexes
          if (!db.objectStoreNames.contains(STORES.JOURNAL)) {
            const journalStore = db.createObjectStore(STORES.JOURNAL, { keyPath: 'day' });
            journalStore.createIndex('season', 'season', { unique: false });
            journalStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          
          // Progress store with indexes
          if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
            const progressStore = db.createObjectStore(STORES.PROGRESS, { keyPath: 'day' });
            progressStore.createIndex('completedAt', 'completedAt', { unique: false });
          }
          
          // Favorites store
          if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
            db.createObjectStore(STORES.FAVORITES, { keyPath: 'day' });
          }
          
          // Settings store
          if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
            db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
          }
          
          // Audio notes store
          if (!db.objectStoreNames.contains(STORES.AUDIO_NOTES)) {
            const audioStore = db.createObjectStore(STORES.AUDIO_NOTES, { keyPath: 'day' });
            audioStore.createIndex('createdAt', 'createdAt', { unique: false });
            audioStore.createIndex('duration', 'duration', { unique: false });
          }
          
          // Weekly reflections store
          if (!db.objectStoreNames.contains(STORES.WEEKLY_REFLECTIONS)) {
            const reflectionStore = db.createObjectStore(STORES.WEEKLY_REFLECTIONS, { keyPath: 'week' });
            reflectionStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          
          // Streaks store
          if (!db.objectStoreNames.contains(STORES.STREAKS)) {
            db.createObjectStore(STORES.STREAKS, { keyPath: 'id' });
          }
        }
               
        Utils.debug.log(`Database upgraded to version ${DB_VERSION}`);
      };
    });
  }

  function isReady() {
    return db !== null;
  }

  async function get(storeName, key) {
    if (!db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function put(storeName, data) {
    if (!db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function remove(storeName, key) {
    if (!db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function getAll(storeName) {
    if (!db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function clear(storeName) {
    if (!db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // User Methods
  async function getUser() {
    try {
      const data = await get(STORES.USER, 'profile');
      return data || null;
    } catch {
      return null;
    }
  }

  async function saveUser(userData) {
    return put(STORES.USER, {
      key: 'profile',
      ...userData,
      updatedAt: new Date().toISOString()
    });
  }

  async function getQuizResults() {
    try {
      const data = await get(STORES.USER, 'quizResults');
      return data || null;
    } catch {
      return null;
    }
  }

  async function saveQuizResults(results) {
    return put(STORES.USER, {
      key: 'quizResults',
      ...results,
      completedAt: new Date().toISOString()
    });
  }

  async function getCurrentSeason() {
    const user = await getUser();
    return user?.currentSeason || null;
  }

  async function setCurrentSeason(season) {
    const user = await getUser() || {};
    return saveUser({ ...user, currentSeason: season });
  }

  async function getCurrentDay() {
    const user = await getUser();
    return user?.currentDay || 1;
  }

  async function setCurrentDay(day) {
    const user = await getUser() || {};
    return saveUser({ ...user, currentDay: day });
  }

  // Journal Methods
  async function getJournalEntry(day) {
    try {
      return await get(STORES.JOURNAL, day);
    } catch {
      return null;
    }
  }

  async function saveJournalEntry(day, content, season) {
    // Get existing entry to preserve createdAt
    const existing = await getJournalEntry(day);
    return put(STORES.JOURNAL, {
      day,
      content,
      season,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async function getAllJournalEntries() {
    return getAll(STORES.JOURNAL);
  }

  async function getJournalEntriesBySeason(season) {
    if (!db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORES.JOURNAL, 'readonly');
        const store = transaction.objectStore(STORES.JOURNAL);
        const index = store.index('season');
        const request = index.getAll(season);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Progress Methods
  async function getDayProgress(day) {
    try {
      return await get(STORES.PROGRESS, day);
    } catch {
      return null;
    }
  }

  async function markDayComplete(day, season) {
    return put(STORES.PROGRESS, {
      day,
      season,
      completed: true,
      completedAt: new Date().toISOString()
    });
  }

  async function markDayIncomplete(day) {
    await remove(STORES.PROGRESS, day);
    await recomputeStreak();
  }

  async function getAllProgress() {
    return getAll(STORES.PROGRESS);
  }

  async function getCompletedDays() {
    const progress = await getAllProgress();
    return progress.filter(p => p.completed).map(p => p.day);
  }

  async function getCompletedDaysCount() {
    const completed = await getCompletedDays();
    return completed.length;
  }

  async function getSeasonProgress(season) {
    const allProgress = await getAllProgress();
    return allProgress.filter(p => p.season === season && p.completed);
  }

  // Streak Methods - CONSOLIDATED TO USE STREAKS STORE
  async function getStreak() {
    const streakData = await getStreakData();
    return {
      current: streakData.currentStreak || 0,
      longest: streakData.longestStreak || 0,
      lastCompletedDate: streakData.lastCompletedDate || null
    };
  }

  async function updateStreak() {
    // Use the new calculateStreak method which is more accurate
    const calculated = await calculateStreak();
    await updateStreakData(calculated);
    return {
      current: calculated.currentStreak,
      longest: calculated.longestStreak
    };
  }

  async function recomputeStreak() {
    // Use the new calculateStreak method
    const calculated = await calculateStreak();
    await updateStreakData(calculated);
    return {
      current: calculated.currentStreak,
      longest: calculated.longestStreak
    };
  }

  // Favorites Methods
  async function getFavorite(day) {
    try {
      return await get(STORES.FAVORITES, day);
    } catch {
      return null;
    }
  }

  async function toggleFavorite(day, season, scriptureRef, note = '') {
    const existing = await getFavorite(day);
    if (existing) {
      await remove(STORES.FAVORITES, day);
      return false;
    } else {
      await put(STORES.FAVORITES, {
        day,
        season,
        scriptureRef,
        note: note || '',
        addedAt: new Date().toISOString()
      });
      return true;
    }
  }
  
  async function updateFavoriteNote(day, note) {
    const existing = await getFavorite(day);
    if (!existing) return false;
    
    await put(STORES.FAVORITES, {
      ...existing,
      note: note || '',
      updatedAt: new Date().toISOString()
    });
    return true;
  }

  async function getAllFavorites() {
    return getAll(STORES.FAVORITES);
  }

  async function isFavorite(day) {
    const fav = await getFavorite(day);
    return !!fav;
  }

  // Settings Methods
  const DEFAULT_SETTINGS = {
    bibleTranslation: 'NLT',
    fontSize: 'medium',
    lineSpacing: 'normal',
    darkMode: 'light',
    seasonTheme: 'auto',
    notificationsEnabled: false,
    reminderTime: '08:00',
    soundEnabled: false,
    autoSave: true,
    ttsRate: 0.9,
    ambientSound: 'silence',
    keyboardShortcuts: true,
    onboardingCompleted: false
  };

  async function getSettings() {
    try {
      const settings = await get(STORES.SETTINGS, 'app');
      return { ...DEFAULT_SETTINGS, ...(settings || {}) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async function getSetting(key) {
    const settings = await getSettings();
    return settings[key];
  }

  async function saveSetting(key, value) {
    const settings = await getSettings();
    settings[key] = value;
    return put(STORES.SETTINGS, {
      key: 'app',
      ...settings,
      updatedAt: new Date().toISOString()
    });
  }

  async function saveSettings(newSettings) {
    const settings = await getSettings();
    return put(STORES.SETTINGS, {
      key: 'app',
      ...settings,
      ...newSettings,
      updatedAt: new Date().toISOString()
    });
  }

  async function resetSettings() {
    return put(STORES.SETTINGS, {
      key: 'app',
      ...DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString()
    });
  }

  // Export/Import Methods 
  async function exportAllData() {
    return {
      version: 1,  
      exportedAt: new Date().toISOString(),
      user: await getUser(),
      quizResults: await getQuizResults(),
      journal: await getAllJournalEntries(),
      progress: await getAllProgress(),
      favorites: await getAllFavorites(),
      settings: await getSettings(),
      audioNotes: await getAllAudioNotes(),
      weeklyReflections: await getAllWeeklyReflections(),
      streaks: await getStreakData()
    };
  }

  function validateImportData(data) {
    const errors = [];
    const warnings = [];
    
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format: expected an object');
      return { valid: false, errors, warnings };
    }

    const hasAnyValidData =
      data.user !== undefined ||
      data.quizResults !== undefined ||
      data.journal !== undefined ||
      data.progress !== undefined ||
      data.favorites !== undefined ||
      data.settings !== undefined ||
      data.audioNotes !== undefined ||
      data.weeklyReflections !== undefined;

    if (!hasAnyValidData) {
      errors.push('No recognizable Spiritual Seasons data found');
      return { valid: false, errors, warnings };
    }

    // Validate journal entries
    if (data.journal !== undefined) {
      if (!Array.isArray(data.journal)) {
        errors.push('Journal data must be an array');
      } else {
        data.journal.forEach((entry, i) => {
          if (typeof entry.day !== 'number' || entry.day < 1 || entry.day > 120) {
            errors.push(`Journal entry ${i + 1}: invalid day number`);
          }
          if (entry.content && typeof entry.content !== 'string') {
            errors.push(`Journal entry ${i + 1}: content must be a string`);
          }
          if (entry.content && entry.content.length > CONFIG.LIMITS.MAX_JOURNAL_LENGTH) {
            warnings.push(`Journal entry ${i + 1}: content exceeds maximum length, will be truncated`);
          }
          // Check for potentially unsafe content
          if (entry.content && /<script|javascript:|onerror=/i.test(entry.content)) {
            errors.push(`Journal entry ${i + 1}: contains potentially unsafe content`);
          }
        });
      }
    }

    // Validate progress data
    if (data.progress !== undefined) {
      if (!Array.isArray(data.progress)) {
        errors.push('Progress data must be an array');
      } else {
        data.progress.forEach((prog, i) => {
          if (typeof prog.day !== 'number' || prog.day < 1 || prog.day > 120) {
            errors.push(`Progress entry ${i + 1}: invalid day number`);
          }
          if (prog.completedAt) {
            const date = new Date(prog.completedAt);
            if (isNaN(date.getTime())) {
              errors.push(`Progress entry ${i + 1}: invalid date`);
            }
          }
        });
      }
    }

    // Validate favorites
    if (data.favorites !== undefined) {
      if (!Array.isArray(data.favorites)) {
        errors.push('Favorites data must be an array');
      } else if (data.favorites.length > CONFIG.LIMITS.MAX_FAVORITE_COUNT) {
        warnings.push(`Favorites exceed limit (${CONFIG.LIMITS.MAX_FAVORITE_COUNT}), excess will be ignored`);
      }
    }

    // Validate audio notes
    if (data.audioNotes !== undefined) {
      if (!Array.isArray(data.audioNotes)) {
        errors.push('Audio notes must be an array');
      } else {
        data.audioNotes.forEach((note, i) => {
          if (note.size && note.size > CONFIG.JOURNAL.MAX_AUDIO_SIZE_MB * 1024 * 1024) {
            errors.push(`Audio note ${i + 1}: exceeds size limit (${CONFIG.JOURNAL.MAX_AUDIO_SIZE_MB}MB)`);
          }
          if (note.duration && note.duration > CONFIG.LIMITS.MAX_AUDIO_DURATION_SECONDS) {
            errors.push(`Audio note ${i + 1}: exceeds duration limit (${CONFIG.LIMITS.MAX_AUDIO_DURATION_SECONDS}s)`);
          }
        });
      }
    }

    // Validate weekly reflections
    if (data.weeklyReflections !== undefined) {
      if (!Array.isArray(data.weeklyReflections)) {
        errors.push('Weekly reflections must be an array');
      } else {
        data.weeklyReflections.forEach((reflection, i) => {
          if (typeof reflection.week !== 'number' || reflection.week < 1 || reflection.week > 17) {
            errors.push(`Weekly reflection ${i + 1}: invalid week number`);
          }
          if (!Array.isArray(reflection.responses)) {
            errors.push(`Weekly reflection ${i + 1}: responses must be an array`);
          }
        });
      }
    }

    // Validate settings
    if (data.settings) {
      const validFontSizes = ['small', 'medium', 'large', 'extra-large'];
      const validLineSpacing = ['compact', 'normal', 'relaxed', 'loose'];
      const validThemes = ['light', 'dark', 'system'];
      
      if (data.settings.fontSize && !validFontSizes.includes(data.settings.fontSize)) {
        warnings.push('Invalid font size, will use default');
      }
      if (data.settings.lineSpacing && !validLineSpacing.includes(data.settings.lineSpacing)) {
        warnings.push('Invalid line spacing, will use default');
      }
      if (data.settings.darkMode && !validThemes.includes(data.settings.darkMode)) {
        warnings.push('Invalid theme, will use default');
      }
    }

    // Check data version
    if (data.version && data.version > 1) {
      warnings.push(`Data from newer version (v${data.version}), some features may not import correctly`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async function importData(data) {
    const validation = validateImportData(data);
    if (!validation.valid) {
      return { 
        success: false, 
        errors: validation.errors,
        warnings: validation.warnings,
        message: 'Import failed: ' + validation.errors.join('; ')
      };
    }

    try {
      // Clear all stores
      await clear(STORES.USER);
      await clear(STORES.JOURNAL);
      await clear(STORES.PROGRESS);
      await clear(STORES.FAVORITES);
      await clear(STORES.SETTINGS);
      await clear(STORES.AUDIO_NOTES);
      await clear(STORES.WEEKLY_REFLECTIONS);
      await clear(STORES.STREAKS);

      let counts = { 
        journal: 0, 
        progress: 0, 
        favorites: 0, 
        audioNotes: 0, 
        reflections: 0 
      };

      // Import user data
      if (data.user) await saveUser(data.user);
      if (data.quizResults) await saveQuizResults(data.quizResults);

      // Import journal entries
      if (data.journal && Array.isArray(data.journal)) {
        for (const entry of data.journal) {
          if (entry.day >= 1 && entry.day <= 120) {
            // Use saveJournalEntry to ensure proper schema
            await saveJournalEntry(entry.day, entry.content || '', entry.season);
            counts.journal++;
          }
        }
      }

      // Import progress
      if (data.progress && Array.isArray(data.progress)) {
        for (const prog of data.progress) {
          // Use markDayComplete to ensure proper schema
          if (prog.completed && prog.day >= 1 && prog.day <= 120) {
            await markDayComplete(prog.day, prog.season);
            counts.progress++;
          }
        }
      }

      // Import favorites
      if (data.favorites && Array.isArray(data.favorites)) {
        for (const fav of data.favorites) {
          if (fav.day >= 1 && fav.day <= 120) {
            await put(STORES.FAVORITES, fav);
            counts.favorites++;
          }
        }
      }

      // Import settings
      if (data.settings) await saveSettings(data.settings);

      if (data.audioNotes && Array.isArray(data.audioNotes)) {
        for (const note of data.audioNotes) {
          if (note.day >= 1 && note.day <= 120) {
            await saveAudioNote(note);
            counts.audioNotes++;
          }
        }
      }

      if (data.weeklyReflections && Array.isArray(data.weeklyReflections)) {
        for (const reflection of data.weeklyReflections) {
          await saveWeeklyReflection(reflection);
          counts.reflections++;
        }
      }

      if (data.streaks) {
        await updateStreakData(data.streaks);
      }

      const parts = [
        `${counts.journal} journal entries`,
        `${counts.progress} progress records`,
        `${counts.favorites} favorites`
      ];
      
      if (counts.audioNotes > 0) parts.push(`${counts.audioNotes} audio notes`);
      if (counts.reflections > 0) parts.push(`${counts.reflections} reflections`);

      return { 
        success: true, 
        imported: counts,
        message: `Imported: ${parts.join(', ')}`
      };
    } catch (error) {
      Utils.debug.error('Import error:', error);
      return { 
        success: false, 
        errors: [error.message],
        message: 'Import failed due to an unexpected error'
      };
    }
  }

  async function resetAllData() {
    await clear(STORES.USER);
    await clear(STORES.JOURNAL);
    await clear(STORES.PROGRESS);
    await clear(STORES.FAVORITES);
    await clear(STORES.AUDIO_NOTES);
    await clear(STORES.WEEKLY_REFLECTIONS);
    await clear(STORES.STREAKS);
    await resetSettings();
    return true;
  }

  async function searchJournal(query) {
    const entries = await getAllJournalEntries();
    if (!query) return entries;
    const lowerQuery = query.toLowerCase();
    return entries.filter(entry => 
      entry.content && entry.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Audio Notes Methods
  async function saveAudioNote(audioData) {
    if (!audioData.day) throw new Error('Day is required for audio note');
    return await put(STORES.AUDIO_NOTES, {
      day: audioData.day,
      blob: audioData.blob,
      duration: audioData.duration || 0,
      size: audioData.size || 0,
      createdAt: audioData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async function getAudioNote(day) {
    return await get(STORES.AUDIO_NOTES, day);
  }

  async function deleteAudioNote(day) {
    return await remove(STORES.AUDIO_NOTES, day);
  }

  async function getAllAudioNotes() {
    return await getAll(STORES.AUDIO_NOTES);
  }

  async function hasAudioNote(day) {
    const note = await getAudioNote(day);
    return note !== null && note !== undefined;
  }

  // Weekly Reflections Methods
  async function saveWeeklyReflection(reflection) {
    if (!reflection.week) throw new Error('Week number is required');
    return await put(STORES.WEEKLY_REFLECTIONS, {
      week: reflection.week,
      questions: reflection.questions || [],
      responses: reflection.responses || [],
      createdAt: reflection.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async function getWeeklyReflection(week) {
    return await get(STORES.WEEKLY_REFLECTIONS, week);
  }

  async function getAllWeeklyReflections() {
    return await getAll(STORES.WEEKLY_REFLECTIONS);
  }

  async function deleteWeeklyReflection(week) {
    return await remove(STORES.WEEKLY_REFLECTIONS, week);
  }

  // Enhanced Streak Methods
  async function getStreakData() {
    const data = await get(STORES.STREAKS, 'current');
    return data || {
      id: 'current',
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      milestones: [],
      updatedAt: new Date().toISOString()
    };
  }

  async function updateStreakData(streakData) {
    return await put(STORES.STREAKS, {
      ...streakData,
      id: 'current',
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Calculate day difference accounting for daylight saving time
   * @param {Date|string} date1 - First date
   * @param {Date|string} date2 - Second date  
   * @returns {number} - Number of days difference
   */
  function getDayDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Reset to midnight to avoid DST issues
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    const diffTime = d1 - d2;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  async function calculateStreak() {
    const progress = await getAllProgress();
    const completedDays = progress
      .filter(p => p.completed)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    if (completedDays.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null
      };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    const lastCompletionDate = new Date(completedDays[0].completedAt);
    
    // Check if last completion was within grace period (24 hours)
    const now = new Date();
    const hoursSinceLastCompletion = (now - lastCompletionDate) / (1000 * 60 * 60);
    
    if (hoursSinceLastCompletion <= CONFIG.PROGRESS.STREAK_GRACE_PERIOD_HOURS) {
      // User is still in grace period, start current streak at 1
      currentStreak = 1;
      
      // Count backward through consecutive days using DST-aware calculation
      let previousDate = lastCompletionDate;
      for (let i = 1; i < completedDays.length; i++) {
        const currentDate = new Date(completedDays[i].completedAt);
        const dayDiff = getDayDifference(previousDate, currentDate); // Use helper

        if (dayDiff === 1) {
          currentStreak++;
          previousDate = currentDate;
        } else if (dayDiff === 0) {
          // Same day, continue (user might have completed multiple entries on same date)
          continue;
        } else {
          // Gap found, stop counting current streak
          break;
        }
      }
    } else {
      // Grace period expired, current streak is 0
      currentStreak = 0;
    }

    // Calculate longest streak separately using DST-aware calculation
    let tempStreak = 1;
    let previousDate = lastCompletionDate;
    
    for (let i = 1; i < completedDays.length; i++) {
      const currentDate = new Date(completedDays[i].completedAt);
      const dayDiff = getDayDifference(previousDate, currentDate); // Use helper

      if (dayDiff === 1) {
        tempStreak++;
      } else if (dayDiff === 0) {
        // Same day, continue
        continue;
      } else {
        // Gap found, save longest if needed and reset
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
      
      previousDate = currentDate;
    }
    
    // Don't forget to check the final streak
    longestStreak = Math.max(longestStreak, tempStreak);
    // Also ensure current streak is considered for longest
    longestStreak = Math.max(longestStreak, currentStreak);

    return {
      currentStreak,
      longestStreak,
      lastCompletedDate: completedDays[0].completedAt
    };
  }

  /**
   * Get number of days completed this week (Sunday to Saturday)
   * @returns {Promise<number>}
   */
  async function getWeekProgress() {
    const progress = await getAllProgress();
    const completedDays = progress.filter(p => p.completed);
    
    if (completedDays.length === 0) return 0;
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Go back to Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7); // Next Sunday
    endOfWeek.setHours(0, 0, 0, 0);
    
    const thisWeekCount = completedDays.filter(day => {
      const completedDate = new Date(day.completedAt);
      return completedDate >= startOfWeek && completedDate < endOfWeek;
    }).length;
    
    return thisWeekCount;
  }

  return {
    init, isReady, STORES, clear,
    getUser, saveUser, getQuizResults, saveQuizResults,
    getCurrentSeason, setCurrentSeason, getCurrentDay, setCurrentDay,
    getJournalEntry, saveJournalEntry, getAllJournalEntries, getJournalEntriesBySeason,
    getDayProgress, markDayComplete, markDayIncomplete,
    getAllProgress, getCompletedDays, getCompletedDaysCount, getSeasonProgress,
    getStreak, updateStreak, recomputeStreak,
    getFavorite, toggleFavorite, updateFavoriteNote, getAllFavorites, isFavorite,
    getSettings, getSetting, saveSetting, saveSettings, resetSettings, DEFAULT_SETTINGS,
    exportAllData, validateImportData, importData, resetAllData,
    searchJournal,saveAudioNote, getAudioNote, deleteAudioNote, getAllAudioNotes, hasAudioNote,
    saveWeeklyReflection, getWeeklyReflection, getAllWeeklyReflections, deleteWeeklyReflection,
    getStreakData, updateStreakData, calculateStreak, getWeekProgress
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Store;
}
