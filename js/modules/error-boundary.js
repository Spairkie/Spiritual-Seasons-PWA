/**
 * Error Boundary Module
 * Provides graceful error handling at route and component level
 */

const ErrorBoundary = (() => {
  /**
   * Create an error boundary for a container
   * @param {string} containerId - ID of the container element
   * @returns {Object} Error boundary instance
   */
  function create(containerId) {
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.warn(`[ErrorBoundary] Container '${containerId}' not found`);
      return null;
    }

    /**
     * Execute a function within the error boundary
     * @param {Function} fn - Async function to execute
     * @param {Object} options - Error handling options
     * @returns {Promise<any>} Result or null on error
     */
    async function tryExecute(fn, options = {}) {
      const {
        errorTitle = 'Something went wrong',
        errorMessage = null,
        showReload = true,
        showBack = true,
        onError = null
      } = options;

      try {
        return await fn();
      } catch (error) {
        console.error(`[ErrorBoundary] Error in ${containerId}:`, error);
        
        // Call custom error handler if provided
        if (onError) {
          try {
            await onError(error);
          } catch (handlerError) {
            console.error('[ErrorBoundary] Error in error handler:', handlerError);
          }
        }

        // Log to error handler module
        if (typeof ErrorHandler !== 'undefined') {
          ErrorHandler.handleError(error, `ErrorBoundary: ${containerId}`);
        }

        // Show error UI
        showError(error, {
          title: errorTitle,
          message: errorMessage,
          showReload,
          showBack
        });

        return null;
      }
    }

    /**
     * Display error UI in the container
     * @param {Error} error - The error object
     * @param {Object} options - Display options
     */
    function showError(error, options = {}) {
      const {
        title = 'Something went wrong',
        message = null,
        showReload = true,
        showBack = true
      } = options;

      const errorMessage = message || error.message || 'An unexpected error occurred';

      container.innerHTML = `
        <div class="error-boundary">
          <div class="error-boundary-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 class="error-boundary-title">${Utils.escapeHtml(title)}</h2>
          <p class="error-boundary-message">${Utils.escapeHtml(errorMessage)}</p>
          <div class="error-boundary-actions">
            ${showReload ? '<button class="btn btn-primary" id="error-reload">Reload App</button>' : ''}
            ${showBack ? '<button class="btn btn-ghost" id="error-back">Go Back</button>' : ''}
          </div>
        </div>
      `;

      // Attach event listeners
      if (showReload) {
        const reloadBtn = container.querySelector('#error-reload');
        if (reloadBtn) {
          reloadBtn.addEventListener('click', () => {
            triggerHaptic('light');
            location.reload();
          });
        }
      }

      if (showBack) {
        const backBtn = container.querySelector('#error-back');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            triggerHaptic('light');
            if (window.history.length > 1) {
              history.back();
            } else {
              Router.navigate('home');
            }
          });
        }
      }
    }

    /**
     * Clear the error boundary
     */
    function clear() {
      if (container) {
        Utils.clearElement(container);
      }
    }

    /**
     * Trigger haptic feedback
     * @param {string} type - Type of haptic feedback
     */
    function triggerHaptic(type = 'light') {
      if (typeof Haptics !== 'undefined') {
        Haptics.trigger(type);
      }
    }

    return {
      tryExecute,
      showError,
      clear
    };
  }

  /**
   * Wrap a route handler with error boundary
   * @param {string} containerId - Container ID for the route
   * @param {Function} handler - Route handler function
   * @param {Object} options - Error handling options
   * @returns {Function} Wrapped handler
   */
  function wrapRoute(containerId, handler, options = {}) {
    return async (params) => {
      const boundary = create(containerId);
      if (!boundary) {
        // Fallback if boundary creation fails
        try {
          return await handler(params);
        } catch (error) {
          console.error(`[ErrorBoundary] Route error in ${containerId}:`, error);
          if (typeof ErrorHandler !== 'undefined') {
            ErrorHandler.handleError(error, `Route: ${containerId}`);
          }
        }
        return;
      }

      return boundary.tryExecute(
        () => handler(params),
        {
          errorTitle: options.errorTitle || 'Failed to load page',
          ...options
        }
      );
    };
  }

  /**
   * Global error handler setup
   */
  function initGlobalHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[ErrorBoundary] Unhandled promise rejection:', event.reason);
      
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleError(event.reason, 'Unhandled Promise');
      }

      // Show toast notification
      if (typeof Toast !== 'undefined') {
        Toast.error('An unexpected error occurred. Please refresh if issues persist.');
      }

      // Prevent default browser error display
      event.preventDefault();
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      console.error('[ErrorBoundary] Global error:', event.error);
      
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleError(event.error, 'Global Error');
      }

      // Don't prevent default for script loading errors
      if (event.filename) {
        return true;
      }

      event.preventDefault();
    });
  }

  return {
    create,
    wrapRoute,
    initGlobalHandlers
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorBoundary;
}
