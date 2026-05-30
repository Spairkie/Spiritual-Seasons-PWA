/**
 * Toast Notification System
 * Displays temporary messages to users with accessibility support
 */

const Toast = (() => {
  let container = null;
  let toastQueue = [];
  let isShowing = false;

  const DURATION = {
    short: 2000,
    normal: 3000,
    long: 5000
  };

  function init() {
    // Create toast container if it doesn't exist
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
  }

  function show(message, options = {}) {
    init();

    // Support both old (type, duration) and new (options) API
    const type = typeof options === 'string' ? options : (options.type || 'info');
    const duration = typeof options === 'number' ? options : (options.duration || DURATION.normal);
    
    const toast = {
      id: Date.now(),
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration,
      action: options.action || null, // { text, onClick }
      dismissButton: options.dismissButton !== false, // Default true
      onDismiss: options.onDismiss || null
    };

    toastQueue.push(toast);

    if (!isShowing) {
      showNext();
    }
  }

  function showNext() {
    if (toastQueue.length === 0) {
      isShowing = false;
      return;
    }

    isShowing = true;
    const toast = toastQueue.shift();
    displayToast(toast);
  }

  function displayToast(toast) {
    const toastElement = document.createElement('div');
    toastElement.className = `toast toast-${toast.type}`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', toast.type === 'error' ? 'assertive' : 'polite');
    
    // Get icon based on type
    const icon = getIcon(toast.type);
    
    // Build toast content
    let toastHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${escapeHtml(toast.message)}</div>
    `;
    
    // Add action button if provided
    if (toast.action) {
      toastHTML += `
        <button class="toast-action btn btn-sm btn-ghost">
          ${escapeHtml(toast.action.text)}
        </button>
      `;
    }
    
    // Add dismiss button if enabled
    if (toast.dismissButton) {
      toastHTML += `
        <button class="toast-close" aria-label="Close notification">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
    }
    
    toastElement.innerHTML = toastHTML;
    container.appendChild(toastElement);

    // Trigger animation
    setTimeout(() => {
      toastElement.classList.add('toast-show');
    }, 10);

    // Action button handler
    if (toast.action) {
      const actionBtn = toastElement.querySelector('.toast-action');
      actionBtn.addEventListener('click', () => {
        if (toast.action.onClick) {
          toast.action.onClick();
        }
        hideToast(toastElement, toast.onDismiss);
      });
    }

    // Close button handler
    if (toast.dismissButton) {
      const closeBtn = toastElement.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => {
        hideToast(toastElement, toast.onDismiss);
      });
    }

    // Auto-hide (unless duration is 0)
    if (toast.duration > 0) {
      setTimeout(() => {
        hideToast(toastElement, toast.onDismiss);
      }, toast.duration);
    }
  }

  function hideToast(toastElement, onDismiss) {
    toastElement.classList.remove('toast-show');
    toastElement.classList.add('toast-hide');

    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
      
      // Call onDismiss callback if provided
      if (onDismiss) {
        onDismiss();
      }
      
      showNext();
    }, 300);
  }

  function getIcon(type) {
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>`
    };
    return icons[type] || icons.info;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Convenience methods
  function success(message, durationOrOptions) {
    const options = typeof durationOrOptions === 'object' 
      ? { ...durationOrOptions, type: 'success' }
      : { type: 'success', duration: durationOrOptions };
    show(message, options);
  }

  function error(message, durationOrOptions) {
    const options = typeof durationOrOptions === 'object' 
      ? { ...durationOrOptions, type: 'error' }
      : { type: 'error', duration: durationOrOptions };
    show(message, options);
  }

  function warning(message, durationOrOptions) {
    const options = typeof durationOrOptions === 'object' 
      ? { ...durationOrOptions, type: 'warning' }
      : { type: 'warning', duration: durationOrOptions };
    show(message, options);
  }

  function info(message, durationOrOptions) {
    const options = typeof durationOrOptions === 'object' 
      ? { ...durationOrOptions, type: 'info' }
      : { type: 'info', duration: durationOrOptions };
    show(message, options);
  }

  return {
    show,
    success,
    error,
    warning,
    info,
    DURATION
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Toast;
}
