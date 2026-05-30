/**
 * Page Transitions Module
 * Smooth animated transitions between pages
 * FIXED: Proper integration with router - no longer breaks page switching
 */

const PageTransitions = (() => {
  let enabled = true;
  let currentPageId = null;

  // Transition types
  const TRANSITIONS = {
    fade: {
      duration: 300,
      enterClass: 'page-transition-fade-in',
      exitClass: 'page-transition-fade-out'
    },
    slide: {
      duration: 350,
      enterClass: 'page-transition-slide-in',
      exitClass: 'page-transition-slide-out'
    }
  };

  /**
   * Initialize page transitions
   */
  function init() {
    // Add transition CSS to document
    addTransitionStyles();
    
    // Listen to route changes AFTER router has processed
    Router.onChange((newRoute, params, previousRoute) => {
      handleRouteChange(newRoute, previousRoute);
    });

    Utils.debug.log('✓ Page transitions initialized');
  }

  /**
   * Handle route change event
   */
  function handleRouteChange(newRoute, previousRoute) {
    if (!enabled) return;
    
    const newPageId = `page-${newRoute}`;
    const oldPageId = previousRoute ? `page-${previousRoute}` : null;
    
    // Animate the transition
    animatePageChange(oldPageId, newPageId);
    currentPageId = newPageId;
  }

  /**
   * Animate page transition
   */
  function animatePageChange(fromPageId, toPageId) {
    const fromPage = fromPageId ? document.getElementById(fromPageId) : null;
    const toPage = document.getElementById(toPageId);
    
    if (!toPage) return;
    
    const transition = TRANSITIONS.fade;
    
    // Set up the new page for animation
    toPage.style.opacity = '0';
    
    requestAnimationFrame(() => {
      // Fade out old page
      if (fromPage && fromPage.classList.contains('active')) {
        fromPage.style.transition = `opacity ${transition.duration}ms ease-in-out`;
        fromPage.style.opacity = '0';
      }
      
      // Fade in new page (it's already active from router)
      setTimeout(() => {
        toPage.style.transition = `opacity ${transition.duration}ms ease-in-out`;
        toPage.style.opacity = '1';
        
        // Clean up old page
        if (fromPage) {
          setTimeout(() => {
            fromPage.style.transition = '';
            fromPage.style.opacity = '';
          }, transition.duration);
        }
        
        // Clean up new page
        setTimeout(() => {
          toPage.style.transition = '';
          toPage.style.opacity = '';
        }, transition.duration);
      }, fromPage ? transition.duration / 2 : 0);
    });
  }

  /**
   * Add transition CSS to document
   */
  function addTransitionStyles() {
    // Check if already added
    if (document.getElementById('page-transitions-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'page-transitions-styles';
    style.textContent = `
      /* Page Transition Base */
      .page {
        will-change: opacity;
      }
      
      .page.active {
        opacity: 1;
      }

      /* Fade Animations */
      @keyframes page-transition-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes page-transition-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      .page-transition-fade-in {
        animation: page-transition-fade-in 0.3s ease-in-out forwards;
      }
      
      .page-transition-fade-out {
        animation: page-transition-fade-out 0.3s ease-in-out forwards;
      }

      /* Slide Animations */
      @keyframes page-transition-slide-in {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes page-transition-slide-out {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(-20px);
        }
      }
      
      .page-transition-slide-in {
        animation: page-transition-slide-in 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      
      .page-transition-slide-out {
        animation: page-transition-slide-out 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }

      /* Reduce motion for accessibility */
      @media (prefers-reduced-motion: reduce) {
        .page {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Enable or disable transitions
   */
  function setEnabled(value) {
    enabled = Boolean(value);
  }

  /**
   * Check if transitions are enabled
   */
  function isEnabled() {
    return enabled;
  }

  /**
   * Scroll to top of page
   */
  function scrollToTop(smooth = true) {
    window.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  return {
    init,
    setEnabled,
    isEnabled,
    scrollToTop,
    TRANSITIONS
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PageTransitions;
}
