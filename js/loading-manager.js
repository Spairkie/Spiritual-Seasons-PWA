/**
 * Spiritual Seasons PWA - Loading Manager
 * Manages loading states, skeleton screens, and optimistic UI updates
 */

const LoadingManager = (() => {
  // Active loading states: Map<key, {element, type, startTime}>
  const loadingStates = new Map();
  
  // Loading templates
  const templates = {
    spinner: `
      <div class="loading-spinner-wrapper">
        <div class="loading-spinner"></div>
        <p class="loading-text">{text}</p>
      </div>
    `,
    
    skeleton: {
      card: `
        <div class="skeleton-card">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 70%;"></div>
        </div>
      `,
      
      devotional: `
        <div class="skeleton-devotional">
          <div class="skeleton skeleton-badge" style="width: 200px;"></div>
          <div class="skeleton skeleton-title" style="margin-top: var(--space-4);"></div>
          <div class="skeleton skeleton-text" style="margin-top: var(--space-3);"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-card" style="margin-top: var(--space-6); height: 300px;"></div>
        </div>
      `,
      
      list: `
        <div class="skeleton-list">
          ${Array(5).fill(`
            <div class="skeleton-list-item">
              <div class="skeleton skeleton-circle" style="width: 40px; height: 40px;"></div>
              <div style="flex: 1;">
                <div class="skeleton skeleton-text" style="width: 60%;"></div>
                <div class="skeleton skeleton-text" style="width: 40%; margin-top: var(--space-2);"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `,
      
      text: `
        <div class="skeleton-text-block">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 80%;"></div>
        </div>
      `
    },
    
    progress: `
      <div class="loading-progress">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: {progress}%"></div>
        </div>
        <p class="progress-text">{text}</p>
      </div>
    `
  };

  /**
   * Show loading spinner
   * @param {HTMLElement|string} target - Element or ID
   * @param {string} text - Loading text
   * @returns {string} Loading key
   */
  function showSpinner(target, text = 'Loading...') {
    const element = getElement(target);
    if (!element) return null;

    const key = generateKey();
    const html = templates.spinner.replace('{text}', text);

    element.innerHTML = html;
    
    loadingStates.set(key, {
      element,
      type: 'spinner',
      startTime: Date.now()
    });

    return key;
  }

  /**
   * Show skeleton screen
   * @param {HTMLElement|string} target - Element or ID
   * @param {string} type - Skeleton type (card, devotional, list, text)
   * @returns {string} Loading key
   */
  function showSkeleton(target, type = 'card') {
    const element = getElement(target);
    if (!element) return null;

    const key = generateKey();
    const html = templates.skeleton[type] || templates.skeleton.card;

    element.innerHTML = html;
    
    loadingStates.set(key, {
      element,
      type: 'skeleton',
      startTime: Date.now()
    });

    return key;
  }

  /**
   * Show progress bar
   * @param {HTMLElement|string} target - Element or ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} text - Progress text
   * @returns {string} Loading key
   */
  function showProgress(target, progress = 0, text = 'Loading...') {
    const element = getElement(target);
    if (!element) return null;

    const key = generateKey();
    const html = templates.progress
      .replace('{progress}', Math.max(0, Math.min(100, progress)))
      .replace('{text}', text);

    element.innerHTML = html;
    
    loadingStates.set(key, {
      element,
      type: 'progress',
      startTime: Date.now()
    });

    return key;
  }

  /**
   * Update progress bar
   * @param {string} key - Loading key
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} text - Progress text
   */
  function updateProgress(key, progress, text = null) {
    if (!loadingStates.has(key)) return;

    const state = loadingStates.get(key);
    const progressBar = state.element.querySelector('.progress-bar-fill');
    const progressText = state.element.querySelector('.progress-text');

    if (progressBar) {
      progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }

    if (progressText && text) {
      progressText.textContent = text;
    }
  }

  /**
   * Hide loading state
   * @param {string} key - Loading key
   */
  function hide(key) {
    if (!loadingStates.has(key)) return;

    const state = loadingStates.get(key);
    const duration = Date.now() - state.startTime;

    loadingStates.delete(key);

    console.log(`[LoadingManager] Hid ${state.type} after ${duration}ms`);
  }

  /**
   * Clear element and hide loading
   * @param {HTMLElement|string} target - Element or ID
   */
  function clear(target) {
    const element = getElement(target);
    if (!element) return;

    // Find and remove any loading states for this element
    loadingStates.forEach((state, key) => {
      if (state.element === element) {
        loadingStates.delete(key);
      }
    });

    element.innerHTML = '';
  }

  /**
   * Get element from target
   * @private
   */
  function getElement(target) {
    if (typeof target === 'string') {
      return document.getElementById(target) || document.querySelector(target);
    }
    return target;
  }

  /**
   * Generate unique key
   * @private
   */
  function generateKey() {
    return `loading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  function getStats() {
    const stats = {
      active: loadingStates.size,
      byType: {}
    };

    loadingStates.forEach((state) => {
      if (!stats.byType[state.type]) {
        stats.byType[state.type] = 0;
      }
      stats.byType[state.type]++;
    });

    return stats;
  }

  // Public API
  return {
    showSpinner,
    showSkeleton,
    showProgress,
    updateProgress,
    hide,
    clear,
    getStats
  };
})();

/**
 * Optimistic UI Manager
 * Handles optimistic updates with automatic rollback on failure
 */
const OptimisticUI = (() => {
  // Pending updates: Map<key, {element, originalState, rollback}>
  const pendingUpdates = new Map();

  /**
   * Apply optimistic update
   * @param {string} key - Update key
   * @param {HTMLElement} element - Target element
   * @param {Function} update - Update function
   * @param {Function} rollback - Rollback function
   * @returns {Promise<void>}
   */
  async function apply(key, element, update, rollback = null) {
    // Save original state
    const originalState = {
      innerHTML: element.innerHTML,
      classList: Array.from(element.classList)
    };

    // Store pending update
    pendingUpdates.set(key, {
      element,
      originalState,
      rollback
    });

    try {
      // Apply update immediately
      await update();
      
      console.log(`[OptimisticUI] Applied update: ${key}`);
      
    } catch (error) {
      console.error(`[OptimisticUI] Update failed: ${key}`, error);
      // Rollback handled in commit/rollback methods
      throw error;
    }
  }

  /**
   * Commit optimistic update (operation succeeded)
   * @param {string} key - Update key
   */
  function commit(key) {
    if (!pendingUpdates.has(key)) return;

    pendingUpdates.delete(key);
    console.log(`[OptimisticUI] Committed: ${key}`);
  }

  /**
   * Rollback optimistic update (operation failed)
   * @param {string} key - Update key
   * @param {boolean} executeRollback - Execute custom rollback function
   * @returns {Promise<void>}
   */
  async function rollback(key, executeRollback = true) {
    if (!pendingUpdates.has(key)) return;

    const update = pendingUpdates.get(key);

    // Execute custom rollback if provided
    if (executeRollback && update.rollback) {
      try {
        await update.rollback();
      } catch (error) {
        console.error(`[OptimisticUI] Custom rollback failed: ${key}`, error);
      }
    }

    // Restore original state
    update.element.innerHTML = update.originalState.innerHTML;
    update.element.className = update.originalState.classList.join(' ');

    pendingUpdates.delete(key);
    console.log(`[OptimisticUI] Rolled back: ${key}`);
  }

  /**
   * Rollback all pending updates
   */
  async function rollbackAll() {
    const keys = Array.from(pendingUpdates.keys());
    
    for (const key of keys) {
      await rollback(key, true);
    }

    console.log(`[OptimisticUI] Rolled back all ${keys.length} updates`);
  }

  /**
   * Check if update is pending
   * @param {string} key - Update key
   * @returns {boolean}
   */
  function isPending(key) {
    return pendingUpdates.has(key);
  }

  /**
   * Get pending updates count
   * @returns {number}
   */
  function getPendingCount() {
    return pendingUpdates.size;
  }

  /**
   * Clear all pending updates without rollback
   */
  function clear() {
    pendingUpdates.clear();
    console.log('[OptimisticUI] Cleared all pending updates');
  }

  // Public API
  return {
    apply,
    commit,
    rollback,
    rollbackAll,
    isPending,
    getPendingCount,
    clear
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LoadingManager, OptimisticUI };
}
