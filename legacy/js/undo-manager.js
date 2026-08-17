/**
 * Spiritual Seasons PWA - Undo/Redo Manager
 * Manages undo/redo history for journal entries and other editable content
 */

const UndoManager = (() => {
  // History stacks: Map<key, {undo: [], redo: []}>
  const histories = new Map();
  
  // Configuration
  const MAX_HISTORY_SIZE = 50;
  const MERGE_TIMEOUT = 1000; // Merge edits within 1 second
  
  // Last edit tracking for merging
  const lastEdits = new Map();

  /**
   * Initialize history for a key
   * @private
   */
  function initHistory(key) {
    if (!histories.has(key)) {
      histories.set(key, {
        undo: [],
        redo: [],
        lastSaved: null
      });
    }
  }

  /**
   * Push a new state to history
   * @param {string} key - History key (e.g., 'journal-1')
   * @param {any} state - Current state to save
   * @param {Object} options
   * @param {boolean} options.merge - Try to merge with last edit
   */
  function push(key, state, options = {}) {
    initHistory(key);
    
    const history = histories.get(key);
    const now = Date.now();

    // Check if we should merge with last edit
    if (options.merge && lastEdits.has(key)) {
      const lastEdit = lastEdits.get(key);
      
      if (now - lastEdit.timestamp < MERGE_TIMEOUT) {
        // Replace last undo state instead of adding new one
        if (history.undo.length > 0) {
          history.undo[history.undo.length - 1] = {
            state: lastEdit.state,
            timestamp: lastEdit.timestamp
          };
        }
        
        lastEdits.set(key, { state, timestamp: now });
        return;
      }
    }

    // Add to undo stack
    history.undo.push({
      state: JSON.parse(JSON.stringify(state)), // Deep clone
      timestamp: now
    });

    // Limit history size
    if (history.undo.length > MAX_HISTORY_SIZE) {
      history.undo.shift();
    }

    // Clear redo stack when new change is made
    history.redo = [];

    // Update last edit
    lastEdits.set(key, { state, timestamp: now });

    Utils.debug.log(`[UndoManager] Pushed state for ${key} (undo: ${history.undo.length})`);
  }

  /**
   * Undo last change
   * @param {string} key - History key
   * @param {any} currentState - Current state to save before undoing
   * @returns {any|null} Previous state or null
   */
  function undo(key, currentState) {
    if (!canUndo(key)) {
      Utils.debug.warn(`[UndoManager] Cannot undo: ${key}`);
      return null;
    }

    const history = histories.get(key);

    // Save current state to redo stack
    history.redo.push({
      state: JSON.parse(JSON.stringify(currentState)),
      timestamp: Date.now()
    });

    // Get previous state from undo stack
    const previous = history.undo.pop();

    Utils.debug.log(`[UndoManager] Undo for ${key} (undo: ${history.undo.length}, redo: ${history.redo.length})`);

    return previous.state;
  }

  /**
   * Redo last undone change
   * @param {string} key - History key
   * @param {any} currentState - Current state to save before redoing
   * @returns {any|null} Next state or null
   */
  function redo(key, currentState) {
    if (!canRedo(key)) {
      Utils.debug.warn(`[UndoManager] Cannot redo: ${key}`);
      return null;
    }

    const history = histories.get(key);

    // Save current state to undo stack
    history.undo.push({
      state: JSON.parse(JSON.stringify(currentState)),
      timestamp: Date.now()
    });

    // Get next state from redo stack
    const next = history.redo.pop();

    Utils.debug.log(`[UndoManager] Redo for ${key} (undo: ${history.undo.length}, redo: ${history.redo.length})`);

    return next.state;
  }

  /**
   * Check if undo is available
   * @param {string} key - History key
   * @returns {boolean}
   */
  function canUndo(key) {
    if (!histories.has(key)) return false;
    return histories.get(key).undo.length > 0;
  }

  /**
   * Check if redo is available
   * @param {string} key - History key
   * @returns {boolean}
   */
  function canRedo(key) {
    if (!histories.has(key)) return false;
    return histories.get(key).redo.length > 0;
  }

  /**
   * Get undo stack size
   * @param {string} key - History key
   * @returns {number}
   */
  function getUndoCount(key) {
    if (!histories.has(key)) return 0;
    return histories.get(key).undo.length;
  }

  /**
   * Get redo stack size
   * @param {string} key - History key
   * @returns {number}
   */
  function getRedoCount(key) {
    if (!histories.has(key)) return 0;
    return histories.get(key).redo.length;
  }

  /**
   * Clear history for a key
   * @param {string} key - History key
   */
  function clear(key) {
    if (histories.has(key)) {
      histories.delete(key);
      lastEdits.delete(key);
      Utils.debug.log(`[UndoManager] Cleared history for ${key}`);
    }
  }

  /**
   * Clear all histories
   */
  function clearAll() {
    const count = histories.size;
    histories.clear();
    lastEdits.clear();
    Utils.debug.log(`[UndoManager] Cleared all histories (${count})`);
  }

  /**
   * Mark current state as saved
   * Used to determine if there are unsaved changes
   * @param {string} key - History key
   */
  function markSaved(key) {
    if (histories.has(key)) {
      histories.get(key).lastSaved = Date.now();
      Utils.debug.log(`[UndoManager] Marked ${key} as saved`);
    }
  }

  /**
   * Check if there are unsaved changes
   * @param {string} key - History key
   * @returns {boolean}
   */
  function hasUnsavedChanges(key) {
    if (!histories.has(key)) return false;
    
    const history = histories.get(key);
    
    // If never saved, check if there's any history
    if (history.lastSaved === null) {
      return history.undo.length > 0;
    }

    // Check if there are changes after last save
    if (history.undo.length === 0) return false;
    
    const lastChange = history.undo[history.undo.length - 1];
    return lastChange.timestamp > history.lastSaved;
  }

  /**
   * Get history info for a key
   * @param {string} key - History key
   * @returns {Object|null}
   */
  function getInfo(key) {
    if (!histories.has(key)) return null;
    
    const history = histories.get(key);
    
    return {
      undoCount: history.undo.length,
      redoCount: history.redo.length,
      canUndo: history.undo.length > 0,
      canRedo: history.redo.length > 0,
      hasUnsavedChanges: hasUnsavedChanges(key),
      lastSaved: history.lastSaved
    };
  }

  /**
   * Get all active history keys
   * @returns {string[]}
   */
  function getKeys() {
    return Array.from(histories.keys());
  }

  /**
   * Get statistics for debugging
   * @returns {Object}
   */
  function getStats() {
    const stats = {
      totalHistories: histories.size,
      totalUndoStates: 0,
      totalRedoStates: 0,
      withUnsavedChanges: 0
    };

    histories.forEach((history, key) => {
      stats.totalUndoStates += history.undo.length;
      stats.totalRedoStates += history.redo.length;
      
      if (hasUnsavedChanges(key)) {
        stats.withUnsavedChanges++;
      }
    });

    return stats;
  }

  /**
   * Debug - log all histories
   */
  function debug() {
    Utils.debug.group('[UndoManager] Debug Info');
    Utils.debug.log('Active histories:', histories.size);
    Utils.debug.log('Stats:', getStats());
    
    histories.forEach((history, key) => {
      Utils.debug.log(`${key}:`, {
        undo: history.undo.length,
        redo: history.redo.length,
        unsaved: hasUnsavedChanges(key)
      });
    });
    
    Utils.debug.groupEnd();
  }

  /**
   * Create keyboard shortcuts for undo/redo
   * @param {string} key - History key
   * @param {Function} getCurrentState - Function to get current state
   * @param {Function} applyState - Function to apply state
   */
  function setupKeyboardShortcuts(key, getCurrentState, applyState) {
    const handleKeyDown = (e) => {
      // Ctrl+Z / Cmd+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        
        if (canUndo(key)) {
          const previousState = undo(key, getCurrentState());
          if (previousState !== null) {
            applyState(previousState);
          }
        }
      }
      
      // Ctrl+Shift+Z / Cmd+Shift+Z - Redo
      // Or Ctrl+Y / Cmd+Y
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        
        if (canRedo(key)) {
          const nextState = redo(key, getCurrentState());
          if (nextState !== null) {
            applyState(nextState);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }

  // Public API
  return {
    push,
    undo,
    redo,
    canUndo,
    canRedo,
    getUndoCount,
    getRedoCount,
    clear,
    clearAll,
    markSaved,
    hasUnsavedChanges,
    getInfo,
    getKeys,
    getStats,
    debug,
    setupKeyboardShortcuts
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UndoManager;
}
