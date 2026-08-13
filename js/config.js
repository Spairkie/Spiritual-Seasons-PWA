/**
 * Spiritual Seasons PWA - Configuration Constants
 * Centralized configuration for the application
 */

const CONFIG = {
  // Application Info
  APP_NAME: 'Spiritual Seasons',
  APP_VERSION: '1.0.1',
  APP_DESCRIPTION: 'Daily Devotional Workbook',
  AUTHOR: 'Dr. Jacqueline Ghee, MSW, MPCC, DMIN',
  
  // Debug mode - false for production
  DEBUG: false,

  // Database Configuration
  DB: {
    NAME: 'spiritual-seasons-db',
    VERSION: 1, 
    STORES: {
      USER: 'user',
      JOURNAL: 'journal',
      PROGRESS: 'progress',
      FAVORITES: 'favorites',
      SETTINGS: 'settings',
      AUDIO_NOTES: 'audioNotes',  
      WEEKLY_REFLECTIONS: 'weeklyReflections',  
      STREAKS: 'streaks'  
    }
  },

  // Theme Configuration
  THEME: {
    DEFAULT_MODE: 'light',
    STORAGE_KEY: 'theme-preference',
    MODES: ['light', 'dark'],
    SEASONS: ['winter', 'spring', 'summer', 'autumn']
  },

  // Season Configuration
  SEASONS: {
    WINTER: {
      id: 'winter',
      name: 'Winter',
      title: 'Stillness & Trust',
      emoji: '❄️',
      dayRange: [1, 30],
      color: '#4C7688'
    },
    SPRING: {
      id: 'spring',
      name: 'Spring',
      title: 'Renewal & Planting',
      emoji: '🌸',
      dayRange: [31, 60],
      color: '#6D8E4E'
    },
    SUMMER: {
      id: 'summer',
      name: 'Summer',
      title: 'Abundance & Joy',
      emoji: '☀️',
      dayRange: [61, 90],
      color: '#B5822B'
    },
    AUTUMN: {
      id: 'autumn',
      name: 'Autumn',
      title: 'Harvest & Letting Go',
      emoji: '🍂',
      dayRange: [91, 120],
      color: '#A9503A'
    }
  },

  // Progress Configuration
  PROGRESS: {
    TOTAL_DAYS: 120,
    STREAK_GRACE_PERIOD_HOURS: 24,
    MILESTONES: [7, 14, 30, 60, 90, 120],
    WEEKLY_REFLECTION_FREQUENCY: 7
  },

  // Journal Configuration
  JOURNAL: {
    AUTOSAVE_DELAY_MS: 2000,
    MAX_AUDIO_SIZE_MB: 10,
    AUDIO_FORMAT: 'audio/webm',
    SHOW_WORD_COUNT: true
  },

  // Notification Configuration
  NOTIFICATIONS: {
    DEFAULT_TIME: '08:00',
    PERMISSION_REQUIRED: true,
    NOTIFICATION_TAG: 'daily-devotional'
  },

  // Search Configuration
  SEARCH: {
    MIN_QUERY_LENGTH: 2,
    MAX_RESULTS: 50,
    DEBOUNCE_MS: 300
  },

  // UI Configuration
  UI: {
    TOAST_DURATION_MS: 3000,
    ANIMATION_DURATION_MS: 300,
    MODAL_CLOSE_DELAY_MS: 200
  },

  // Storage Limits
  LIMITS: {
    MAX_JOURNAL_LENGTH: 50000,
    MAX_AUDIO_DURATION_SECONDS: 300, // 5 minutes
    MAX_FAVORITE_COUNT: 120
  },

  // Feature Flags
  FEATURES: {
    AUDIO_NOTES: true,
    WEEKLY_REFLECTIONS: true,
    STREAK_TRACKING: true,
    SHARING: true,
    NOTIFICATIONS: true,
    ADVANCED_SEARCH: true,
    DATA_EXPORT: true
  },

  // Routes
  ROUTES: {
    WELCOME: 'welcome',
    QUIZ: 'quiz',
    HOME: 'home',
    DEVOTIONAL: 'devotional',
    TOC: 'contents',
    SEARCH: 'search',
    SETTINGS: 'settings',
    ABOUT: 'about',
    INTRO_PAGES: 'intro',
    WEEKLY_REFLECTION: 'reflections',
    PROGRESS: 'progress'
  },

  // API Endpoints (if needed in future)
  API: {
    BASE_URL: '',
    TIMEOUT_MS: 10000
  }
};

// Freeze configuration to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.DB);
Object.freeze(CONFIG.DB.STORES);
Object.freeze(CONFIG.THEME);
Object.freeze(CONFIG.SEASONS);
Object.freeze(CONFIG.PROGRESS);
Object.freeze(CONFIG.JOURNAL);
Object.freeze(CONFIG.NOTIFICATIONS);
Object.freeze(CONFIG.SEARCH);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.LIMITS);
Object.freeze(CONFIG.FEATURES);
Object.freeze(CONFIG.ROUTES);
Object.freeze(CONFIG.API);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
