/**
 * Theme Manager - Simplified for CSS-First Architecture
 * 
 * This version simply toggles data attributes.
 * All styling is handled by CSS variables in variables.css
 */

const ThemeManager = (() => {
  const STORAGE_KEY = 'theme-mode';
  const DEFAULT_MODE = 'light';
  let currentMode = DEFAULT_MODE;
  let currentSeason = 'winter';
  let initialized = false;

  /**
   * Initialize theme manager
   * Loads saved preferences and applies initial theme
   */
  function init() {
    if (initialized) return;

    // Load saved theme mode
    const savedMode = localStorage.getItem(STORAGE_KEY);
    currentMode = savedMode || DEFAULT_MODE;

    // Get current season from Store if available
    if (typeof Store !== 'undefined' && Store.isReady()) {
      Store.getCurrentSeason().then(season => {
        if (season) {
          currentSeason = season;
          applyTheme(currentMode, currentSeason);
        } else {
          applyTheme(currentMode, 'winter');
        }
      }).catch(() => {
        applyTheme(currentMode, 'winter');
      });
    } else {
      applyTheme(currentMode, 'winter');
    }
    
    initialized = true;
    Utils.debug.log('ThemeManager initialized:', { mode: currentMode, season: currentSeason });
  }

  /**
   * Set theme mode (light, dark, or system)
   * @param {string} mode - 'light', 'dark', or 'system'
   */
  function setMode(mode) {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') {
      Utils.debug.warn('Invalid theme mode:', mode);
      return;
    }

    currentMode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    
    // Determine effective mode
    let effectiveMode = mode;
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveMode = prefersDark ? 'dark' : 'light';
    }
    
    applyTheme(effectiveMode, currentSeason);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { mode: effectiveMode, season: currentSeason }
    }));
  }

  /**
   * Set active season
   * @param {string} season - 'winter', 'spring', 'summer', or 'autumn'
   */
  function setSeason(season) {
    const validSeasons = ['winter', 'spring', 'summer', 'autumn'];
    if (!validSeasons.includes(season)) {
      Utils.debug.warn('Invalid season:', season);
      return;
    }

    currentSeason = season;
    
    // Determine effective mode
    let effectiveMode = currentMode;
    if (currentMode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveMode = prefersDark ? 'dark' : 'light';
    }
    
    applyTheme(effectiveMode, currentSeason);

    window.dispatchEvent(new CustomEvent('season-changed', {
      detail: { mode: effectiveMode, season: currentSeason }
    }));
  }

  /**
   * Apply theme by setting data attributes
   * CSS handles all the actual styling via variables.css
   * 
   * @param {string} mode - 'light' or 'dark'
   * @param {string} season - 'winter', 'spring', 'summer', or 'autumn'
   */
  function applyTheme(mode, season) {
    const root = document.documentElement;

    // Set data attributes - CSS does the rest!
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-season', season);

    // Update meta theme-color for mobile browsers
    updateMetaThemeColor(mode, season);
  }

  /**
   * Update meta theme-color tag for mobile browser chrome
   * @param {string} mode - Current theme mode
   * @param {string} season - Current season
   */
  function updateMetaThemeColor(mode, season) {
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }

    // Season colors for light mode
    const seasonColors = {
      winter: '#4A90A4',
      spring: '#8BC34A',
      summer: '#FFA726',
      autumn: '#D32F2F'
    };

    // In dark mode, use dark background; in light mode, use season color
    const color = mode === 'dark' ? '#0A0A0A' : seasonColors[season];
    metaTheme.content = color;
  }

  /**
   * Toggle between light and dark mode
   */
  function toggle() {
    const newMode = currentMode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  }

  /**
   * Get current theme mode
   * @returns {string} Current mode ('light', 'dark', or 'system')
   */
  function getCurrentMode() {
    return currentMode;
  }

  /**
   * Get current season
   * @returns {string} Current season
   */
  function getCurrentSeason() {
    return currentSeason;
  }

  /**
   * Setup system preference listeners
   */
  function setupListeners() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      darkModeQuery.addEventListener('change', (e) => {
        // Only apply if user has mode set to 'system'
        if (currentMode === 'system') {
          const effectiveMode = e.matches ? 'dark' : 'light';
          applyTheme(effectiveMode, currentSeason);
          
          window.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { mode: effectiveMode, season: currentSeason }
          }));
        }
      });
    }
  }

  /**
   * Get currently active theme colors from CSS
   * @returns {Object} Theme colors
   */
  function getThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    
    return {
      mode: currentMode,
      season: currentSeason,
      primary: styles.getPropertyValue('--season-primary').trim(),
      light: styles.getPropertyValue('--season-light').trim(),
      dark: styles.getPropertyValue('--season-dark').trim(),
      accent: styles.getPropertyValue('--season-accent').trim()
    };
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      setupListeners();
    });
  } else {
    init();
    setupListeners();
  }

  // Public API
  return {
    init,
    setMode,
    setSeason,
    toggle,
    getCurrentMode,
    getCurrentSeason,
    getThemeColors
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
