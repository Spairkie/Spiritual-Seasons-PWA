/**
 * Spiritual Seasons PWA - Router Module
 * Simple client-side router for SPA navigation
 */

const Router = (() => {
  const routes = {};
  let currentRoute = null;
  let defaultRoute = 'home';
  const listeners = [];
  let clickHandler = null;
  let popStateHandler = null;
  let hashChangeHandler = null;
  let lastNavigationTime = 0; // Prevent double navigation

  function register(path, handler) {
    routes[path] = handler;
  }

  async function navigate(path, params = {}, pushState = true) {
    const cleanPath = path.replace('#', '');
    
    // Prevent rapid duplicate navigations
    const now = Date.now();
    if (currentRoute === cleanPath && 
        JSON.stringify(Router.currentParams) === JSON.stringify(params) &&
        now - lastNavigationTime < 100) {
      return;
    }
    lastNavigationTime = now;
    
    // Validate day parameter
    if (params.day !== undefined) {
      const validDay = Utils.validateDay(params.day);
      if (validDay === null) {
        Utils.debug.warn('Invalid day parameter:', params.day);
        params.day = 1;
      } else {
        params.day = validDay;
      }
    }

    // Stop TTS if playing before navigation
    if (typeof TTS !== 'undefined' && TTS.stop) {
      TTS.stop();
    }
    
    // Cancel audio recording if in progress
    if (typeof AudioNotes !== 'undefined') {
      if (AudioNotes.isRecording && AudioNotes.isRecording()) {
        AudioNotes.cancelRecording();
      }
      if (AudioNotes.cleanupAllBlobUrls) {
        AudioNotes.cleanupAllBlobUrls();
      }
    }
    
    // Cleanup blobs from previous route
    if (typeof BlobManager !== 'undefined' && currentRoute) {
      BlobManager.revokeByScope(currentRoute);
    }

    Router.currentParams = params;

    if (pushState) {
      let url = `#${cleanPath}`;
      
      if (params.day) {
        url += `/${params.day}`;
      }
      
      const queryParams = Object.keys(params)
        .filter(key => key !== 'day')
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      if (queryParams) {
        url += `?${queryParams}`;
      }
      
      window.history.pushState({ path: cleanPath, params }, '', url);
    }

    if (routes[cleanPath]) {
      document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
      });

      const targetPage = document.getElementById(`page-${cleanPath}`);
      if (targetPage) {
        targetPage.classList.add('active');
      }

      updateNav(cleanPath);

      try {
        const routeResult = routes[cleanPath](params);
        // Handle async routes
        if (routeResult && typeof routeResult.then === 'function') {
          await routeResult;
        }
      } catch (error) {
        Utils.debug.error('Route handler error:', error);
        
        // Always show error to user
        if (typeof Toast !== 'undefined') {
          Toast.error(`Failed to load ${cleanPath} page. Please try again.`);
        }
        
        // Log to error handler if available
        if (typeof ErrorHandler !== 'undefined' && ErrorHandler.handleError) {
          ErrorHandler.handleError(error, `Route navigation to ${cleanPath}`);
        }
        
        // Show error in the page content
        if (targetPage) {
          const contentContainer = targetPage.querySelector('[id$="-content"]');
          if (contentContainer) {
            contentContainer.innerHTML = `
              <div class="error-boundary" style="padding: var(--space-8); text-align: center;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--autumn-primary)" stroke-width="1.5" style="margin: 0 auto var(--space-4);">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
                <h3 style="color: var(--text-primary); margin-bottom: var(--space-2);">Failed to Load Page</h3>
                <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">An error occurred while loading this page.</p>
                <button class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
              </div>
            `;
          }
        }
      }

      const previousRoute = currentRoute;
      currentRoute = cleanPath;

      listeners.forEach(listener => {
        try {
          listener(cleanPath, params, previousRoute);
        } catch (e) {
          Utils.debug.error('Route listener error:', e);
        }
      });

      window.scrollTo(0, 0);
    } else {
      Utils.debug.warn(`Route not found: ${cleanPath}`);
      navigate(defaultRoute);
    }
  }

  function updateNav(path) {
    document.querySelectorAll('.nav-item').forEach(item => {
      const itemPath = item.getAttribute('data-route');
      const isActive = itemPath === path;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  function back() {
    window.history.back();
  }

  function parseUrl() {
    const hash = window.location.hash.slice(1) || defaultRoute;
    
    // Split path and query string
    const [pathPart, queryPart] = hash.split('?');
    const parts = pathPart.split('/');
    const path = parts[0] || defaultRoute;
    const params = {};

    // Parse day parameter from path (for devotional routes)
    if (parts.length > 1) {
      const validDay = Utils.validateDay(parts[1]);
      if (validDay !== null) {
        params.day = validDay;
      }
    }

    // Parse query parameters (for intro pages and other routes)
    if (queryPart) {
      const queryParams = new URLSearchParams(queryPart);
      queryParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    return { path, params };
  }

  function handlePopState(event) {
    lastNavigationTime = Date.now(); // Update timestamp
    
    if (event.state) {
      navigate(event.state.path, event.state.params || {}, false);
    } else {
      const { path, params } = parseUrl();
      navigate(path, params, false);
    }
  }

  // Handle hashchange events properly
  function handleHashChange(event) {
    // Prevent double navigation if popstate also fired
    const now = Date.now();
    if (now - lastNavigationTime < 100) {
      return; // Skip if navigated within last 100ms
    }
    lastNavigationTime = now;
    
    const { path, params } = parseUrl();
    navigate(path, params, false);
  }

  function handleClick(e) {
    const navItem = e.target.closest('[data-route]');
    if (navItem) {
      e.preventDefault();
      const route = navItem.getAttribute('data-route');
      const dayAttr = navItem.getAttribute('data-day');
      const pageAttr = navItem.getAttribute('data-page');
      const params = {};
      
      if (dayAttr) {
        const validDay = Utils.validateDay(dayAttr);
        if (validDay !== null) {
          params.day = validDay;
        }
      }
      
      if (pageAttr) {
        params.page = pageAttr;
      }
      
      navigate(route, params);
    }
  }

  function init() {
    // Remove old listeners if any (for hot reload safety)
    cleanup();

    popStateHandler = handlePopState;
    hashChangeHandler = handleHashChange; // NEW
    clickHandler = handleClick;

    window.addEventListener('popstate', popStateHandler);
    window.addEventListener('hashchange', hashChangeHandler); // Added hashchange listener
    document.addEventListener('click', clickHandler);

    const { path, params } = parseUrl();
    navigate(path, params, false);
  }

  function cleanup() {
    if (popStateHandler) {
      window.removeEventListener('popstate', popStateHandler);
    }
    if (hashChangeHandler) {
      window.removeEventListener('hashchange', hashChangeHandler);
    }
    if (clickHandler) {
      document.removeEventListener('click', clickHandler);
    }
  }

  function getCurrentRoute() {
    return currentRoute;
  }

  function setDefault(route) {
    defaultRoute = route;
  }

  function onChange(callback) {
    listeners.push(callback);
  }

  function offChange(callback) {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  return {
    register,
    navigate,
    back,
    init,
    cleanup,
    getCurrentRoute,
    setDefault,
    onChange,
    offChange,
    currentParams: {}
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Router;
}
