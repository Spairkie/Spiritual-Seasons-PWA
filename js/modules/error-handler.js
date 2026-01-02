/**
 * Error Handling Module
 * Comprehensive error boundaries, retry logic, and user-friendly error messages
 */

const ErrorHandler = (() => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second
  let errorLog = [];
  const MAX_LOG_SIZE = 50;

  /**
   * Initialize error handling
   */
  function init() {
    // Global error handler
    window.addEventListener('error', handleGlobalError);
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    console.log('✓ Error handling initialized');
    return true;
  }

  /**
   * Handle global JavaScript errors
   */
  function handleGlobalError(event) {
    logError({
      type: 'global_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      timestamp: new Date().toISOString()
    });

    // Don't show UI for every error, just log it
    console.error('Global error:', event.error);
    
    // Prevent default browser error handling
    event.preventDefault();
  }

  /**
   * Handle unhandled promise rejections
   */
  function handleUnhandledRejection(event) {
    logError({
      type: 'unhandled_rejection',
      message: event.reason?.message || 'Unhandled promise rejection',
      reason: event.reason,
      timestamp: new Date().toISOString()
    });

    console.error('Unhandled rejection:', event.reason);
    
    // Prevent default browser handling
    event.preventDefault();
  }

  /**
   * Log error to internal log
   */
  function logError(error) {
    errorLog.unshift(error);
    
    // Keep log size manageable
    if (errorLog.length > MAX_LOG_SIZE) {
      errorLog = errorLog.slice(0, MAX_LOG_SIZE);
    }
  }

  /**
   * Get error log
   */
  function getErrorLog() {
    return [...errorLog];
  }

  /**
   * Clear error log
   */
  function clearErrorLog() {
    errorLog = [];
  }

  /**
   * Retry a failed operation with exponential backoff
   */
  async function retry(operation, options = {}) {
    const {
      maxRetries = MAX_RETRIES,
      delay = RETRY_DELAY,
      exponentialBackoff = true,
      onRetry = null
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const retryDelay = exponentialBackoff 
            ? delay * Math.pow(2, attempt - 1)
            : delay;

          if (onRetry) {
            onRetry(attempt, retryDelay, error);
          }

          console.log(`Retry attempt ${attempt}/${maxRetries} in ${retryDelay}ms`);
          await sleep(retryDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle fetch errors with retry
   */
  async function fetchWithRetry(url, options = {}) {
    return retry(
      async () => {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      },
      {
        maxRetries: 3,
        onRetry: (attempt) => {
          console.log(`Retrying fetch to ${url}, attempt ${attempt}`);
        }
      }
    );
  }

  /**
   * Handle IndexedDB errors with retry
   */
  async function dbOperationWithRetry(operation, operationName = 'Database operation') {
    try {
      return await retry(operation, {
        maxRetries: 2,
        delay: 500,
        onRetry: (attempt) => {
          console.log(`Retrying ${operationName}, attempt ${attempt}`);
        }
      });
    } catch (error) {
      console.error(`${operationName} failed after retries:`, error);
      showUserFriendlyError({
        title: 'Database Error',
        message: 'We\'re having trouble saving your data. Please try again.',
        error,
        actions: [
          {
            text: 'Retry',
            onClick: () => dbOperationWithRetry(operation, operationName)
          },
          {
            text: 'Cancel',
            onClick: () => Modal.close()
          }
        ]
      });
      throw error;
    }
  }

  /**
   * Show user-friendly error message
   */
  function showUserFriendlyError(options) {
    const {
      title = 'Something Went Wrong',
      message = 'An unexpected error occurred. Please try again.',
      error = null,
      actions = [],
      technicalDetails = false
    } = options;

    const content = document.createElement('div');
    content.className = 'error-dialog-content';
    
    content.innerHTML = `
      <div class="error-dialog-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="error-dialog-message">
        <p>${message}</p>
      </div>
      ${technicalDetails && error ? `
        <details class="error-dialog-details">
          <summary>Technical Details</summary>
          <pre><code>${error.stack || error.message || error}</code></pre>
        </details>
      ` : ''}
    `;

    const buttons = actions.length > 0 ? actions : [
      {
        text: 'OK',
        className: 'btn-primary',
        onClick: () => true
      }
    ];

    Modal.create({
      title,
      content,
      buttons,
      size: 'small'
    });
  }

  /**
   * Create error boundary for async operations
   */
  function createErrorBoundary(operation, fallback, errorHandler) {
    return async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        console.error('Error in bounded operation:', error);
        logError({
          type: 'bounded_operation',
          message: error.message,
          error,
          timestamp: new Date().toISOString()
        });

        if (errorHandler) {
          errorHandler(error);
        }

        if (fallback) {
          return fallback(...args);
        }

        throw error;
      }
    };
  }

  /**
   * Graceful degradation wrapper
   */
  function withGracefulDegradation(operation, fallbackValue, errorMessage) {
    return async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        console.warn(errorMessage || 'Operation failed, using fallback:', error);
        logError({
          type: 'graceful_degradation',
          message: errorMessage || 'Operation failed',
          error,
          timestamp: new Date().toISOString()
        });
        return fallbackValue;
      }
    };
  }

  /**
   * Categorize error type
   */
  function categorizeError(error) {
    if (error.name === 'QuotaExceededError') {
      return {
        category: 'storage',
        userMessage: 'Storage is full. Please free up space or clear old data.',
        canRetry: false
      };
    }

    if (error.name === 'NotAllowedError') {
      return {
        category: 'permission',
        userMessage: 'Permission denied. Please check your browser settings.',
        canRetry: false
      };
    }

    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return {
        category: 'network',
        userMessage: 'Network error. Please check your connection and try again.',
        canRetry: true
      };
    }

    if (error.name === 'TypeError') {
      return {
        category: 'programming',
        userMessage: 'An unexpected error occurred. Our team has been notified.',
        canRetry: false
      };
    }

    return {
      category: 'unknown',
      userMessage: 'An unexpected error occurred. Please try again.',
      canRetry: true
    };
  }

  /**
   * Handle error with smart categorization
   */
  function handleError(error, context = '') {
    const errorInfo = categorizeError(error);
    
    console.error(`Error in ${context}:`, error);
    logError({
      type: errorInfo.category,
      context,
      message: error.message,
      error,
      timestamp: new Date().toISOString()
    });

    const actions = errorInfo.canRetry ? [
      {
        text: 'Try Again',
        className: 'btn-primary',
        onClick: () => {
          window.location.reload();
          return true;
        }
      },
      {
        text: 'Cancel',
        className: 'btn-secondary',
        onClick: () => true
      }
    ] : [
      {
        text: 'OK',
        className: 'btn-primary',
        onClick: () => true
      }
    ];

    showUserFriendlyError({
      title: `${errorInfo.category.charAt(0).toUpperCase() + errorInfo.category.slice(1)} Error`,
      message: errorInfo.userMessage,
      error,
      actions,
      technicalDetails: true
    });
  }

  /**
   * Export error log for debugging
   */
  function exportErrorLog() {
    const log = getErrorLog();
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    Toast.success('Error log exported');
  }

  /**
   * Render error log viewer (for settings/debug)
   */
  function renderErrorLog(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const log = getErrorLog();

    if (log.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          <p>No errors logged</p>
          <p class="text-secondary">The app is running smoothly!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="error-log-viewer">
        <div class="error-log-header">
          <h3>${log.length} ${log.length === 1 ? 'Error' : 'Errors'} Logged</h3>
          <div class="error-log-actions">
            <button class="btn btn-secondary btn-sm" id="export-log-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
            </button>
            <button class="btn btn-secondary btn-sm" id="clear-log-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Clear
            </button>
          </div>
        </div>
        <div class="error-log-list">
          ${log.map((error, index) => `
            <details class="error-log-item">
              <summary>
                <span class="error-type">${error.type}</span>
                <span class="error-message">${error.message}</span>
                <span class="error-time">${formatTime(error.timestamp)}</span>
              </summary>
              <pre class="error-details"><code>${JSON.stringify(error, null, 2)}</code></pre>
            </details>
          `).join('')}
        </div>
      </div>
    `;

    // Attach event listeners
    document.getElementById('export-log-btn')?.addEventListener('click', exportErrorLog);
    document.getElementById('clear-log-btn')?.addEventListener('click', () => {
      clearErrorLog();
      Toast.success('Error log cleared');
      renderErrorLog(containerId);
    });
  }

  /**
   * Format timestamp
   */
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleString();
  }

  return {
    init,
    retry,
    fetchWithRetry,
    dbOperationWithRetry,
    showUserFriendlyError,
    createErrorBoundary,
    withGracefulDegradation,
    handleError,
    categorizeError,
    getErrorLog,
    clearErrorLog,
    exportErrorLog,
    renderErrorLog
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}
