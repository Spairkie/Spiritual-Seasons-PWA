/**
 * Spiritual Seasons PWA - Event Manager
 * Centralized event listener management with automatic cleanup
 * Prevents memory leaks and duplicate listeners
 */

const EventManager = (() => {
  // Global registry: Map<scope, Map<element, Map<event, Set<handler>>>>
  const registry = new Map();
  
  // Timeout tracking: Map<timerId, {scope, cleanup}>
  const timeouts = new Map();
  const intervals = new Map();

  // Delegation targets: Map<selector, Map<event, Set<handler>>>
  const delegated = new Map();

  /**
   * Register an event listener
   * @param {string} scope - Module/component scope
   * @param {HTMLElement} element - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - addEventListener options
   * @returns {Function} Remove function
   */
  function on(scope, element, event, handler, options) {
    if (!element || !handler) {
      Utils.debug.warn('[EventManager] Invalid element or handler');
      return () => {};
    }

    // Create scope registry if needed
    if (!registry.has(scope)) {
      registry.set(scope, new Map());
    }

    const scopeRegistry = registry.get(scope);

    // Create element registry if needed
    if (!scopeRegistry.has(element)) {
      scopeRegistry.set(element, new Map());
    }

    const elementRegistry = scopeRegistry.get(element);

    // Create event registry if needed
    if (!elementRegistry.has(event)) {
      elementRegistry.set(event, new Set());
    }

    const handlers = elementRegistry.get(event);

    // Check for duplicate
    if (handlers.has(handler)) {
      Utils.debug.warn(`[EventManager] Duplicate listener: ${scope}.${event}`);
      return () => {};
    }

    // Add listener
    element.addEventListener(event, handler, options);
    handlers.add(handler);

    Utils.debug.log(`[EventManager] Added: ${scope}.${event}`);

    // Return remove function
    return () => {
      off(scope, element, event, handler, options);
    };
  }

  /**
   * Remove an event listener
   * @param {string} scope - Module/component scope
   * @param {HTMLElement} element - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - addEventListener options
   */
  function off(scope, element, event, handler, options) {
    if (!registry.has(scope)) return;

    const scopeRegistry = registry.get(scope);
    if (!scopeRegistry.has(element)) return;

    const elementRegistry = scopeRegistry.get(element);
    if (!elementRegistry.has(event)) return;

    const handlers = elementRegistry.get(event);
    if (!handlers.has(handler)) return;

    // Remove listener
    element.removeEventListener(event, handler, options);
    handlers.delete(handler);

    Utils.debug.log(`[EventManager] Removed: ${scope}.${event}`);

    // Cleanup empty sets
    if (handlers.size === 0) {
      elementRegistry.delete(event);
    }
    if (elementRegistry.size === 0) {
      scopeRegistry.delete(element);
    }
    if (scopeRegistry.size === 0) {
      registry.delete(scope);
    }
  }

  /**
   * Remove all listeners for a scope
   * @param {string} scope - Module/component scope
   */
  function cleanup(scope) {
    if (!registry.has(scope)) return;

    const scopeRegistry = registry.get(scope);
    let count = 0;

    // Remove all listeners
    scopeRegistry.forEach((elementRegistry, element) => {
      elementRegistry.forEach((handlers, event) => {
        handlers.forEach(handler => {
          element.removeEventListener(event, handler);
          count++;
        });
      });
    });

    registry.delete(scope);
    Utils.debug.log(`[EventManager] Cleaned up ${count} listeners for ${scope}`);

    // Also cleanup timeouts/intervals for this scope
    cleanupTimeouts(scope);
    cleanupIntervals(scope);
  }

  /**
   * Event delegation for dynamic elements
   * @param {string} scope - Module/component scope
   * @param {string} selector - CSS selector for target elements
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Remove function
   */
  function delegate(scope, selector, event, handler) {
    const delegateHandler = (e) => {
      const target = e.target.closest(selector);
      if (target) {
        handler.call(target, e);
      }
    };

    // Track delegation
    if (!delegated.has(selector)) {
      delegated.set(selector, new Map());
    }
    const selectorDelegated = delegated.get(selector);
    if (!selectorDelegated.has(event)) {
      selectorDelegated.set(event, new Set());
    }
    selectorDelegated.get(event).add({ handler, delegateHandler, scope });

    // Attach to document
    document.addEventListener(event, delegateHandler, true);

    Utils.debug.log(`[EventManager] Delegated: ${scope}.${event} on ${selector}`);

    // Return remove function
    return () => {
      document.removeEventListener(event, delegateHandler, true);
      selectorDelegated.get(event).delete({ handler, delegateHandler, scope });
    };
  }

  /**
   * Register a timeout with automatic cleanup
   * @param {string} scope - Module/component scope
   * @param {Function} callback - Callback function
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timeout ID
   */
  function setTimeout(scope, callback, delay) {
    const timerId = window.setTimeout(() => {
      callback();
      timeouts.delete(timerId);
    }, delay);

    timeouts.set(timerId, {
      scope,
      cleanup: () => window.clearTimeout(timerId)
    });

    Utils.debug.log(`[EventManager] Timeout registered: ${scope} (${timerId})`);
    return timerId;
  }

  /**
   * Register an interval with automatic cleanup
   * @param {string} scope - Module/component scope
   * @param {Function} callback - Callback function
   * @param {number} interval - Interval in milliseconds
   * @returns {number} Interval ID
   */
  function setInterval(scope, callback, interval) {
    const intervalId = window.setInterval(callback, interval);

    intervals.set(intervalId, {
      scope,
      cleanup: () => window.clearInterval(intervalId)
    });

    Utils.debug.log(`[EventManager] Interval registered: ${scope} (${intervalId})`);
    return intervalId;
  }

  /**
   * Clear a specific timeout
   * @param {number} timerId - Timeout ID
   */
  function clearTimeout(timerId) {
    if (timeouts.has(timerId)) {
      timeouts.get(timerId).cleanup();
      timeouts.delete(timerId);
      Utils.debug.log(`[EventManager] Timeout cleared: ${timerId}`);
    }
  }

  /**
   * Clear a specific interval
   * @param {number} intervalId - Interval ID
   */
  function clearInterval(intervalId) {
    if (intervals.has(intervalId)) {
      intervals.get(intervalId).cleanup();
      intervals.delete(intervalId);
      Utils.debug.log(`[EventManager] Interval cleared: ${intervalId}`);
    }
  }

  /**
   * Clear all timeouts for a scope
   * @private
   */
  function cleanupTimeouts(scope) {
    let count = 0;
    timeouts.forEach((data, timerId) => {
      if (data.scope === scope) {
        data.cleanup();
        timeouts.delete(timerId);
        count++;
      }
    });
    if (count > 0) {
      Utils.debug.log(`[EventManager] Cleared ${count} timeouts for ${scope}`);
    }
  }

  /**
   * Clear all intervals for a scope
   * @private
   */
  function cleanupIntervals(scope) {
    let count = 0;
    intervals.forEach((data, intervalId) => {
      if (data.scope === scope) {
        data.cleanup();
        intervals.delete(intervalId);
        count++;
      }
    });
    if (count > 0) {
      Utils.debug.log(`[EventManager] Cleared ${count} intervals for ${scope}`);
    }
  }

  /**
   * Once event - automatically remove after first trigger
   * @param {string} scope - Module/component scope
   * @param {HTMLElement} element - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - addEventListener options
   */
  function once(scope, element, event, handler, options) {
    const onceHandler = (e) => {
      handler(e);
      off(scope, element, event, onceHandler, options);
    };

    return on(scope, element, event, onceHandler, options);
  }

  /**
   * Get statistics for debugging
   * @returns {Object} Statistics
   */
  function getStats() {
    const stats = {
      scopes: registry.size,
      listeners: 0,
      timeouts: timeouts.size,
      intervals: intervals.size,
      delegated: 0
    };

    registry.forEach(scopeRegistry => {
      scopeRegistry.forEach(elementRegistry => {
        elementRegistry.forEach(handlers => {
          stats.listeners += handlers.size;
        });
      });
    });

    delegated.forEach(selectorDelegated => {
      selectorDelegated.forEach(handlers => {
        stats.delegated += handlers.size;
      });
    });

    return stats;
  }

  /**
   * Log current registrations for debugging
   */
  function debug() {
    Utils.debug.group('[EventManager] Debug Info');
    Utils.debug.log('Scopes:', Array.from(registry.keys()));
    Utils.debug.log('Active timeouts:', timeouts.size);
    Utils.debug.log('Active intervals:', intervals.size);
    Utils.debug.log('Stats:', getStats());
    Utils.debug.groupEnd();
  }

  /**
   * Global cleanup - remove everything
   */
  function cleanupAll() {
    Utils.debug.log('[EventManager] Global cleanup');
    
    // Cleanup all scopes
    Array.from(registry.keys()).forEach(scope => cleanup(scope));

    // Cleanup all timeouts
    timeouts.forEach(data => data.cleanup());
    timeouts.clear();

    // Cleanup all intervals
    intervals.forEach(data => data.cleanup());
    intervals.clear();

    // Clear delegated
    delegated.forEach((selectorDelegated, selector) => {
      selectorDelegated.forEach((handlers, event) => {
        handlers.forEach(({ delegateHandler }) => {
          document.removeEventListener(event, delegateHandler, true);
        });
      });
    });
    delegated.clear();
  }

  // Public API
  return {
    on,
    off,
    once,
    delegate,
    cleanup,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    getStats,
    debug,
    cleanupAll
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventManager;
}
