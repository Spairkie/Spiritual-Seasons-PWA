/**
 * Spiritual Seasons PWA - Utilities Module
 * Common utility functions used throughout the app
 */

const Utils = (() => {
  // ============================================
  // Debug Logging Utility
  // ============================================
  
  /**
   * Debug logging wrapper - only logs in debug mode
   */
  const debug = {
    log: (...args) => {
      if (CONFIG.DEBUG) console.log(...args);
    },
    warn: (...args) => {
      if (CONFIG.DEBUG) console.warn(...args);
    },
    error: (...args) => {
      // Always log errors
      console.error(...args);
    },
    info: (...args) => {
      if (CONFIG.DEBUG) console.info(...args);
    },
    table: (...args) => {
      if (CONFIG.DEBUG) console.table(...args);
    },
    group: (...args) => {
      if (CONFIG.DEBUG) console.group(...args);
    },
    groupEnd: () => {
      if (CONFIG.DEBUG) console.groupEnd();
    }
  };

  // ============================================
  // XSS Prevention & Text Sanitization
  // ============================================
  
  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text - The text to escape
   * @returns {string} - Escaped text safe for HTML insertion
   */
  function escapeHtml(text) {
    if (text == null) return '';
    const str = String(text);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Highlight search matches safely (escapes HTML then highlights)
   * @param {string} text - The text to search in
   * @param {string} query - The search query to highlight
   * @returns {string} - HTML with highlighted matches
   */
  function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text);
    
    const escapedText = escapeHtml(text);
    const escapedQuery = escapeHtml(query);
    
    // Create a regex that's safe (escape special regex chars)
    const safeQuery = escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    
    return escapedText.replace(regex, '<mark>$1</mark>');
  }

  // ============================================
  // DOM Building Helpers
  // ============================================

  /**
   * Create an element with attributes and children
   * @param {string} tag - HTML tag name
   * @param {Object} attrs - Attributes and properties
   * @param {...(Node|string)} children - Child nodes or text
   * @returns {HTMLElement}
   */
  function createElement(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
      } else if (key === 'dataset') {
        Object.assign(el.dataset, value);
      } else if (key === 'innerHTML') {
        // Only use this for trusted content!
        el.innerHTML = value;
      } else {
        el.setAttribute(key, value);
      }
    }
    
    for (const child of children) {
      if (child == null) continue;
      if (typeof child === 'string' || typeof child === 'number') {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      } else if (Array.isArray(child)) {
        child.forEach(c => {
          if (c instanceof Node) el.appendChild(c);
          else if (c != null) el.appendChild(document.createTextNode(String(c)));
        });
      }
    }
    
    return el;
  }

  /**
   * Shorthand for createElement
   */
  const el = createElement;

  /**
   * Clear all children from an element
   * @param {HTMLElement} element
   */
  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  // ============================================
  // Debounce & Throttle
  // ============================================

  /**
   * Debounce a function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Milliseconds to wait
   * @returns {Function} - Debounced function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle a function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Milliseconds between calls
   * @returns {Function} - Throttled function
   */
  function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ============================================
  // Validation Helpers
  // ============================================

  /**
   * Validate that a day number is valid (1-120)
   * @param {any} day - The day to validate
   * @returns {number|null} - Valid day number or null
   */
  function validateDay(day) {
    // Convert to number
    const num = Number(day);
    
    // Check if it's a valid integer between 1 and 120
    if (!Number.isInteger(num) || num < 1 || num > 120) {
      return null;
    }
    
    return num;
  }

  /**
   * Validate import data structure
   * @param {any} data - The data to validate
   * @returns {{valid: boolean, errors: string[]}}
   */
  function validateImportData(data) {
    const errors = [];
    
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format: expected an object');
      return { valid: false, errors };
    }

    // Check for required structure indicators
    const hasAnyValidData = 
      data.user !== undefined ||
      data.quizResults !== undefined ||
      data.journal !== undefined ||
      data.progress !== undefined ||
      data.favorites !== undefined ||
      data.settings !== undefined;

    if (!hasAnyValidData) {
      errors.push('No recognizable data found in import file');
      return { valid: false, errors };
    }

    // Validate journal entries if present
    if (data.journal !== undefined) {
      if (!Array.isArray(data.journal)) {
        errors.push('Journal data must be an array');
      } else {
        data.journal.forEach((entry, i) => {
          if (typeof entry.day !== 'number' || entry.day < 1 || entry.day > 120) {
            errors.push(`Journal entry ${i}: invalid day number`);
          }
        });
      }
    }

    // Validate progress if present
    if (data.progress !== undefined) {
      if (!Array.isArray(data.progress)) {
        errors.push('Progress data must be an array');
      }
    }

    // Validate favorites if present
    if (data.favorites !== undefined) {
      if (!Array.isArray(data.favorites)) {
        errors.push('Favorites data must be an array');
      }
    }

    // Validate settings if present
    if (data.settings !== undefined && typeof data.settings !== 'object') {
      errors.push('Settings must be an object');
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================
  // Date Helpers
  // ============================================

  /**
   * Get date string for comparison (strips time)
   * @param {Date} date
   * @returns {string}
   */
  function getDateString(date = new Date()) {
    return date.toDateString();
  }

  /**
   * Check if two dates are the same day
   * @param {Date|string} date1
   * @param {Date|string} date2
   * @returns {boolean}
   */
  function isSameDay(date1, date2) {
    const d1 = typeof date1 === 'string' ? date1 : date1.toDateString();
    const d2 = typeof date2 === 'string' ? date2 : date2.toDateString();
    return d1 === d2;
  }

  /**
   * Get yesterday's date
   * @returns {Date}
   */
  function getYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  /**
   * Format date for display
   * @param {Date} date
   * @param {Object} options - Intl.DateTimeFormat options
   * @returns {string}
   */
  function formatDate(date, options = {}) {
    const defaultOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  }

  /**
   * Format a date or ISO string as a human-readable "time ago" string.
   * @param {Date|string} date
   * @returns {string}
   */
  function formatTimeAgo(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'recently';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Get time-based greeting
   * @returns {string}
   */
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  // ============================================
  // Season Helpers
  // ============================================

  const SEASON_STARTS = {
    winter: 1,
    spring: 31,
    summer: 61,
    autumn: 91
  };

  const SEASON_ENDS = {
    winter: 30,
    spring: 60,
    summer: 90,
    autumn: 120
  };

  /**
   * Get season ID for a day number
   * @param {number} day
   * @returns {string|null}
   */
  function getSeasonForDay(day) {
    const validDay = validateDay(day);
    if (!validDay) return null;
    
    if (validDay >= 1 && validDay <= 30) return 'winter';
    if (validDay >= 31 && validDay <= 60) return 'spring';
    if (validDay >= 61 && validDay <= 90) return 'summer';
    if (validDay >= 91 && validDay <= 120) return 'autumn';
    return null;
  }

  /**
   * Get day within season (1-30)
   * @param {number} day
   * @returns {number}
   */
  function getDayInSeason(day) {
    const season = getSeasonForDay(day);
    if (!season) return 0;
    return day - SEASON_STARTS[season] + 1;
  }

  /**
   * Get emoji for a season
   * @param {string} seasonId
   * @returns {string}
   */
  function getSeasonEmoji(seasonId) {
    const emojis = {
      winter: CONFIG.SEASONS.WINTER.emoji,
      spring: CONFIG.SEASONS.SPRING.emoji,
      summer: CONFIG.SEASONS.SUMMER.emoji,
      autumn: CONFIG.SEASONS.AUTUMN.emoji
    };
    return emojis[seasonId] || '📅';
  }

  // ============================================
  // Storage Helpers
  // ============================================

  /**
   * Safe JSON parse with fallback
   * @param {string} json
   * @param {any} fallback
   * @returns {any}
   */
  function safeJsonParse(json, fallback = null) {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  // ============================================
  // Event Listener Management
  // ============================================

  /**
   * Creates an event listener manager for cleanup
   * @returns {Object}
   */
  function createListenerManager() {
    const listeners = [];

    return {
      add(element, event, handler, options) {
        if (!element) return;
        element.addEventListener(event, handler, options);
        listeners.push({ element, event, handler, options });
      },
      
      removeAll() {
        listeners.forEach(({ element, event, handler, options }) => {
          element.removeEventListener(event, handler, options);
        });
        listeners.length = 0;
      }
    };
  }

  // ============================================
  // Error Handling
  // ============================================

  /**
   * Wrap an async function with error handling
   * @param {Function} fn - Async function
   * @param {string} context - Context for error messages
   * @returns {Function}
   */
  function withErrorHandling(fn, context = 'Operation') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        console.error(`${context} failed:`, error);
        if (typeof Toast !== 'undefined') {
          Toast.show(`${context} failed. Please try again.`, 'error');
        }
        throw error;
      }
    };
  }

  /**
   * Show global error UI
   * @param {Error} error
   * @param {string} message
   */
  function showErrorBoundary(error, message = 'Something went wrong') {
    console.error('Error boundary triggered:', error);
    
    const container = document.createElement('div');
    container.className = 'error-boundary';
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 200px; flex-direction: column; gap: var(--space-4); padding: var(--space-4); text-align: center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--autumn-primary)" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <h3 style="color: var(--text-primary); margin: 0;">${escapeHtml(message)}</h3>
        <p style="color: var(--text-secondary); margin: 0;">Please try again or refresh the page.</p>
        <button class="btn btn-primary" data-action="reload">Refresh Page</button>
      </div>
    `;
    
    return container;
  }

  // ============================================
  // Loading States
  // ============================================

  /**
   * Create a loading spinner element
   * @param {string} message
   * @returns {HTMLElement}
   */
  function createLoadingSpinner(message = 'Loading...') {
    const container = createElement('div', {
      className: 'loading-container',
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-8)'
      }
    },
      createElement('div', { className: 'loading-spinner' }),
      createElement('p', { style: { color: 'var(--text-secondary)' } }, message)
    );
    return container;
  }

  /**
   * Show loading state in a container
   * @param {HTMLElement|string} container
   * @param {string} message
   */
  function showLoading(container, message = 'Loading...') {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;
    clearElement(el);
    el.appendChild(createLoadingSpinner(message));
  }

  // ============================================
  // SVG Icons
  // ============================================

  const ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    heartFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    volumeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
    stopCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/></svg>',
    externalLink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 13.4A8 8 0 1 1 10.6 4a6.4 6.4 0 0 0 9.4 9.4Z"/></svg>',
    wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3.5 12h3l2-5 3.5 10 3-7 1.8 4h3.7"/></svg>',
    waveform: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 10v4M9 7.5v9M13 5.5v13M17 9v6M20.5 11v2"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>'
  };

  /**
   * Get an icon SVG string
   * @param {string} name
   * @param {number} size
   * @returns {string}
   */
  function getIcon(name, size = 24) {
    const icon = ICONS[name] || ICONS.info;
    return icon.replace('viewBox', `width="${size}" height="${size}" viewBox`);
  }

  // Public API
  return {
    // Debug Logging
    debug,
    
    // XSS Prevention
    escapeHtml,
    highlightMatch,
    
    // DOM Building
    createElement,
    el,
    clearElement,
    
    // Timing
    debounce,
    throttle,
    
    // Validation
    validateDay,
    validateImportData,
    
    // Dates
    getDateString,
    isSameDay,
    getYesterday,
    formatDate,
    formatTimeAgo,
    getGreeting,
    
    // Seasons
    SEASON_STARTS,
    SEASON_ENDS,
    getSeasonForDay,
    getDayInSeason,
    getSeasonEmoji,
    
    // Storage
    safeJsonParse,
    
    // Events
    createListenerManager,
    
    // Errors
    withErrorHandling,
    showErrorBoundary,
    
    // Loading
    createLoadingSpinner,
    showLoading,
    
    // Icons
    ICONS,
    getIcon
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
