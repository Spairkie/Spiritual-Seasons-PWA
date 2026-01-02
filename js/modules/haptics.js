/**
 * Haptic Feedback Module
 * Provides tactile feedback on mobile devices for better UX
 */

const Haptics = (() => {
  let isEnabled = true;
  let isSupported = false;

  /**
   * Initialize haptic feedback module
   */
  function init() {
    // Check for vibration API support
    isSupported = 'vibrate' in navigator || 'vibration' in navigator;

    // Load user preference
    Store.getSetting('hapticsEnabled').then(enabled => {
      if (enabled !== undefined) {
        isEnabled = enabled;
      }
    });

    console.log(`[Haptics] ${isSupported ? 'Supported' : 'Not supported'}`);
    return isSupported;
  }

  /**
   * Check if haptics is supported on this device
   * @returns {boolean}
   */
  function supported() {
    return isSupported;
  }

  /**
   * Trigger haptic feedback
   * @param {string} type - Type of haptic: 'light', 'medium', 'heavy', 'success', 'warning', 'error'
   */
  function trigger(type = 'light') {
    if (!isSupported || !isEnabled) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      warning: [20, 100, 20],
      error: [30, 100, 30, 100, 30],
      selection: [5],
      impact: [15],
      notification: [10, 100, 10, 100, 10]
    };

    const pattern = patterns[type] || patterns.light;

    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      } else if (navigator.vibration) {
        navigator.vibration(pattern);
      }
    } catch (error) {
      console.warn('[Haptics] Vibration failed:', error);
    }
  }

  /**
   * Enable haptic feedback
   */
  async function enable() {
    isEnabled = true;
    await Store.saveSetting('hapticsEnabled', true);
    trigger('success');
  }

  /**
   * Disable haptic feedback
   */
  async function disable() {
    isEnabled = false;
    await Store.saveSetting('hapticsEnabled', false);
  }

  /**
   * Toggle haptic feedback
   * @returns {boolean} New enabled state
   */
  async function toggle() {
    if (isEnabled) {
      await disable();
    } else {
      await enable();
    }
    return isEnabled;
  }

  /**
   * Get current haptics state
   * @returns {Object} State object
   */
  function getState() {
    return {
      supported: isSupported,
      enabled: isEnabled
    };
  }

  /**
   * Add haptic feedback to buttons
   */
  function attachToButtons() {
    // Add haptic feedback to all buttons
    document.addEventListener('click', (e) => {
      const button = e.target.closest('button, .btn, [role="button"]');
      if (button && !button.disabled) {
        // Different haptics for different button types
        if (button.classList.contains('btn-primary')) {
          trigger('medium');
        } else if (button.classList.contains('btn-ghost') || button.classList.contains('btn-icon')) {
          trigger('light');
        } else {
          trigger('light');
        }
      }
    }, { passive: true });

    // Add to navigation items
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item, [data-route]');
      if (navItem) {
        trigger('selection');
      }
    }, { passive: true });

    // Add to checkbox and radio inputs
    document.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox' || e.target.type === 'radio') {
        trigger('light');
      }
    }, { passive: true });

    // Add to range inputs (sliders)
    let lastSliderValue = {};
    document.addEventListener('input', (e) => {
      if (e.target.type === 'range') {
        const currentValue = e.target.value;
        const id = e.target.id || e.target.name || 'slider';
        
        // Only trigger haptic on value change (not continuous)
        if (lastSliderValue[id] !== currentValue) {
          trigger('selection');
          lastSliderValue[id] = currentValue;
        }
      }
    }, { passive: true });
  }

  return {
    init,
    supported,
    trigger,
    enable,
    disable,
    toggle,
    getState,
    attachToButtons
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Haptics;
}
