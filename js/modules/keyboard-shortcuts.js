/**
 * Keyboard Shortcuts Module
 * Global keyboard navigation for desktop/PWA
 */

const KeyboardShortcuts = (() => {
  const shortcuts = new Map([
    ['n', { action: nextDay, description: 'Next day' }],
    ['p', { action: prevDay, description: 'Previous day' }],
    ['s', { action: openSearch, description: 'Search' }],
    ['j', { action: focusJournal, description: 'Jump to journal' }],
    ['f', { action: toggleFavorite, description: 'Toggle favorite' }],
    ['m', { action: markComplete, description: 'Mark complete' }],
    ['h', { action: goHome, description: 'Go home' }],
    ['c', { action: openContents, description: 'Table of contents' }],
    ['/', { action: openSearch, description: 'Search (alternative)' }],
    ['?', { action: showHelp, description: 'Show keyboard shortcuts' }],
    ['.', { action: showHelp, description: 'Show keyboard shortcuts (alternative)' }],
    ['Escape', { action: closeModals, description: 'Close modals' }]
  ]);

  let enabled = true;
  let keydownHandler = null;

  async function init() {
    // Load preference
    try {
      const setting = await Store.getSetting('keyboardShortcuts');
      enabled = setting !== false; // Default to true
      
      if (enabled) {
        attachListeners();
      }
      
      console.log('✓ Keyboard shortcuts ' + (enabled ? 'enabled' : 'disabled'));
    } catch (error) {
      console.warn('Failed to load keyboard shortcuts setting:', error);
      // Default to enabled
      enabled = true;
      attachListeners();
    }
  }

  function attachListeners() {
    if (keydownHandler) {
      // Already attached
      return;
    }
    
    keydownHandler = handleKeyPress.bind(null);
    document.addEventListener('keydown', keydownHandler);
  }

  function detachListeners() {
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
  }

  function handleKeyPress(e) {
    // Don't trigger if user is typing in input fields
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable) {
      return;
    }

    // Don't trigger if modifier keys are pressed (except shift for '?')
    if (e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }

    const key = e.key === '?' ? '?' : e.key.toLowerCase();
    const shortcut = shortcuts.get(key);

    if (shortcut) {
      e.preventDefault();
      try {
        shortcut.action();
      } catch (error) {
        console.error('Keyboard shortcut error:', error);
      }
    }
  }

  // Shortcut actions
  function nextDay() {
    const currentRoute = Router.getCurrentRoute();
    if (currentRoute === 'devotional') {
      const currentDay = Router.currentParams.day || 1;
      if (currentDay < 120) {
        Router.navigate('devotional', { day: currentDay + 1 });
      } else {
        Toast.info('You are on the last day');
      }
    }
  }

  function prevDay() {
    const currentRoute = Router.getCurrentRoute();
    if (currentRoute === 'devotional') {
      const currentDay = Router.currentParams.day || 1;
      if (currentDay > 1) {
        Router.navigate('devotional', { day: currentDay - 1 });
      } else {
        Toast.info('You are on the first day');
      }
    }
  }

  function openSearch() {
    Router.navigate('search');
  }

  function focusJournal() {
    const journal = document.getElementById('journal-entry');
    if (journal) {
      journal.focus();
      journal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // If not on devotional page, go to current day
      const currentRoute = Router.getCurrentRoute();
      if (currentRoute !== 'devotional') {
        Store.getCurrentDay().then(day => {
          Router.navigate('devotional', { day: day || 1 });
        });
      }
    }
  }

  function toggleFavorite() {
    const favoriteBtn = document.getElementById('toggle-favorite');
    if (favoriteBtn) {
      favoriteBtn.click();
    }
  }

  function markComplete() {
    const completeBtn = document.getElementById('mark-complete');
    if (completeBtn) {
      completeBtn.click();
    }
  }

  function goHome() {
    Router.navigate('home');
  }

  function openContents() {
    Router.navigate('contents');
  }

  function closeModals() {
    // Close any open modals
    if (typeof Modal !== 'undefined' && Modal.close) {
      Modal.close();
    }
  }

  function showHelp() {
    const shortcutList = Array.from(shortcuts.entries())
      .filter(([key]) => key !== '/' && key !== '.') // Don't show duplicates
      .map(([key, shortcut]) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) 0; border-bottom: 1px solid var(--border-color);">
          <kbd style="background: var(--bg-secondary); padding: 6px 12px; border-radius: 6px; font-family: 'SF Mono', 'Monaco', 'Consolas', monospace; font-size: 14px; font-weight: 500; border: 1px solid var(--border-color); box-shadow: 0 2px 0 var(--border-color);">${Utils.escapeHtml(key === '?' ? '?' : key)}</kbd>
          <span style="margin-left: var(--space-4); flex: 1;">${Utils.escapeHtml(shortcut.description)}</span>
        </div>
      `).join('');

    Modal.create({
      title: 'Keyboard Shortcuts',
      content: `
        <div style="max-height: 60vh; overflow-y: auto; margin: var(--space-4) 0;">
          ${shortcutList}
        </div>
        <div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 2px solid var(--border-color);">
          <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
            <input type="checkbox" id="shortcuts-enabled" ${enabled ? 'checked' : ''}>
            <span>Enable keyboard shortcuts</span>
          </label>
          <p style="margin-top: var(--space-2); font-size: var(--text-sm); color: var(--text-secondary);">
            Keyboard shortcuts work when you're not typing in a text field.
          </p>
        </div>
      `,
      size: 'medium',
      buttons: [
        {
          text: 'Close',
          className: 'btn-primary',
          onClick: async () => {
            const checkbox = document.getElementById('shortcuts-enabled');
            if (checkbox) {
              const newEnabled = checkbox.checked;
              
              if (newEnabled !== enabled) {
                enabled = newEnabled;
                await Store.saveSetting('keyboardShortcuts', enabled);
                
                if (enabled) {
                  attachListeners();
                  Toast.success('Keyboard shortcuts enabled');
                } else {
                  detachListeners();
                  Toast.info('Keyboard shortcuts disabled');
                }
              }
            }
          }
        }
      ]
    });
  }

  function toggle(value) {
    enabled = value !== undefined ? value : !enabled;
    
    if (enabled) {
      attachListeners();
    } else {
      detachListeners();
    }
    
    Store.saveSetting('keyboardShortcuts', enabled).catch(error => {
      console.error('Failed to save keyboard shortcuts setting:', error);
    });
    
    return enabled;
  }

  return {
    init,
    toggle,
    showHelp,
    isEnabled: () => enabled
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeyboardShortcuts;
}
