/**
 * Spiritual Seasons PWA - State Manager
 * Centralized state management with subscriptions and persistence
 * Single source of truth for application state
 */

const StateManager = (() => {
  // Internal state object
  const state = {
    // User state
    currentDay: 1,
    currentSeason: null,
    userName: null,
    
    // UI state
    currentRoute: null,
    isLoading: false,
    activeModals: [],
    
    // Feature state
    isRecording: false,
    isTTSPlaying: false,
    searchQuery: '',
    
    // Cache state
    bookData: null,
    quizData: null,
    
    // Sync state
    syncQueue: [],
    lastSyncTime: null,
    isOnline: navigator.onLine
  };

  // Subscribers: Map<key, Set<callback>>
  const subscribers = new Map();
  
  // History for undo/redo
  const history = new Map();
  const MAX_HISTORY_PER_KEY = 50;

  /**
   * Get current state value
   * @param {string} key - State key
   * @returns {any} Current value
   */
  function get(key) {
    return state[key];
  }

  /**
   * Get entire state (for debugging)
   * @returns {Object} Copy of current state
   */
  function getAll() {
    return { ...state };
  }

  /**
   * Set state value and notify subscribers
   * @param {string} key - State key
   * @param {any} value - New value
   * @param {Object} options - Options
   * @param {boolean} options.silent - Skip notifications
   * @param {boolean} options.skipHistory - Skip history tracking
   */
  function set(key, value, options = {}) {
    const oldValue = state[key];
    
    // No change, skip
    if (oldValue === value && !options.force) {
      return;
    }

    // Save to history (for undo/redo)
    if (!options.skipHistory && shouldTrackHistory(key)) {
      addToHistory(key, oldValue);
    }

    // Update state
    state[key] = value;

    // Notify subscribers
    if (!options.silent) {
      notifySubscribers(key, value, oldValue);
    }

    // Persist to storage if needed
    if (shouldPersist(key)) {
      persistKey(key, value);
    }

    console.log(`[State] ${key}:`, oldValue, '→', value);
  }

  /**
   * Update multiple state values at once
   * @param {Object} updates - Key-value pairs to update
   * @param {Object} options - Options
   */
  function update(updates, options = {}) {
    const batch = [];
    
    for (const [key, value] of Object.entries(updates)) {
      const oldValue = state[key];
      
      if (oldValue !== value || options.force) {
        if (!options.skipHistory && shouldTrackHistory(key)) {
          addToHistory(key, oldValue);
        }
        
        state[key] = value;
        batch.push({ key, value, oldValue });
        
        if (shouldPersist(key)) {
          persistKey(key, value);
        }
      }
    }

    // Notify all subscribers in batch
    if (!options.silent) {
      batch.forEach(({ key, value, oldValue }) => {
        notifySubscribers(key, value, oldValue);
      });
    }

    console.log(`[State] Batch update:`, batch.length, 'keys');
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {Function} callback - Callback(newValue, oldValue)
   * @returns {Function} Unsubscribe function
   */
  function subscribe(key, callback) {
    if (!subscribers.has(key)) {
      subscribers.set(key, new Set());
    }
    
    subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Subscribe to multiple keys at once
   * @param {string[]} keys - Array of keys
   * @param {Function} callback - Callback(key, newValue, oldValue)
   * @returns {Function} Unsubscribe function
   */
  function subscribeMultiple(keys, callback) {
    const unsubscribers = keys.map(key => 
      subscribe(key, (newValue, oldValue) => {
        callback(key, newValue, oldValue);
      })
    );

    // Return combined unsubscribe
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * Notify all subscribers of a key
   * @private
   */
  function notifySubscribers(key, newValue, oldValue) {
    const subs = subscribers.get(key);
    if (!subs) return;

    subs.forEach(callback => {
      try {
        callback(newValue, oldValue);
      } catch (error) {
        console.error(`[State] Subscriber error for ${key}:`, error);
      }
    });
  }

  /**
   * Check if key should be tracked in history
   * @private
   */
  function shouldTrackHistory(key) {
    const historyKeys = [
      'currentDay',
      'currentRoute',
      'searchQuery'
    ];
    return historyKeys.includes(key);
  }

  /**
   * Add value to history
   * @private
   */
  function addToHistory(key, value) {
    if (!history.has(key)) {
      history.set(key, []);
    }

    const keyHistory = history.get(key);
    keyHistory.push({
      value,
      timestamp: Date.now()
    });

    // Limit history size
    if (keyHistory.length > MAX_HISTORY_PER_KEY) {
      keyHistory.shift();
    }
  }

  /**
   * Get history for a key
   * @param {string} key - State key
   * @returns {Array} History entries
   */
  function getHistory(key) {
    return history.get(key) || [];
  }

  /**
   * Clear history for a key
   * @param {string} key - State key
   */
  function clearHistory(key) {
    history.delete(key);
  }

  /**
   * Check if key should be persisted
   * @private
   */
  function shouldPersist(key) {
    const persistKeys = [
      'currentDay',
      'currentSeason',
      'userName'
    ];
    return persistKeys.includes(key);
  }

  /**
   * Persist key to localStorage with quota error handling
   * @private
   */
  function persistKey(key, value) {
    try {
      const storageKey = `state:${key}`;
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('[State] Storage quota exceeded:', key);
        
        // Notify user about storage issue
        if (typeof Toast !== 'undefined') {
          Toast.error('Storage full. Please clear old data in Settings.');
        }
        
        // Optionally trigger a cleanup event
        if (typeof EventManager !== 'undefined') {
          EventManager.emit('storage:quota-exceeded', { key, value });
        }
      } else {
        console.warn(`[State] Failed to persist ${key}:`, error);
      }
    }
  }

  /**
   * Load persisted state from localStorage
   */
  function loadPersistedState() {
    const persistKeys = Object.keys(state).filter(shouldPersist);
    
    persistKeys.forEach(key => {
      try {
        const storageKey = `state:${key}`;
        const stored = localStorage.getItem(storageKey);
        
        if (stored !== null) {
          state[key] = JSON.parse(stored);
          console.log(`[State] Loaded ${key} from storage`);
        }
      } catch (error) {
        console.warn(`[State] Failed to load ${key}:`, error);
      }
    });
  }

  /**
   * Reset state to initial values
   * @param {Object} options
   * @param {boolean} options.clearStorage - Also clear localStorage
   */
  function reset(options = {}) {
    const keys = Object.keys(state);
    
    keys.forEach(key => {
      state[key] = getInitialValue(key);
      
      if (options.clearStorage && shouldPersist(key)) {
        localStorage.removeItem(`state:${key}`);
      }
    });

    history.clear();
    console.log('[State] Reset to initial values');
  }

  /**
   * Get initial value for a key
   * @private
   */
  function getInitialValue(key) {
    const initialValues = {
      currentDay: 1,
      currentSeason: null,
      userName: null,
      currentRoute: null,
      isLoading: false,
      activeModals: [],
      isRecording: false,
      isTTSPlaying: false,
      searchQuery: '',
      bookData: null,
      quizData: null,
      syncQueue: [],
      lastSyncTime: null,
      isOnline: navigator.onLine
    };
    
    return initialValues[key];
  }

  /**
   * Computed state - derive values from state
   * @param {Function} fn - Function that computes value from state
   * @param {string[]} dependencies - State keys this depends on
   * @returns {Function} Getter function
   */
  function computed(fn, dependencies = []) {
    let cachedValue;
    let isDirty = true;

    // Subscribe to dependencies
    dependencies.forEach(key => {
      subscribe(key, () => {
        isDirty = true;
      });
    });

    return () => {
      if (isDirty) {
        cachedValue = fn(state);
        isDirty = false;
      }
      return cachedValue;
    };
  }

  /**
   * Initialize state manager
   */
  function init() {
    // Load persisted state
    loadPersistedState();

    // Setup online/offline detection
    window.addEventListener('online', () => {
      set('isOnline', true);
    });

    window.addEventListener('offline', () => {
      set('isOnline', false);
    });

    console.log('[State] State manager initialized');
  }

  // Public API
  return {
    get,
    getAll,
    set,
    update,
    subscribe,
    subscribeMultiple,
    getHistory,
    clearHistory,
    reset,
    computed,
    init
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
}
