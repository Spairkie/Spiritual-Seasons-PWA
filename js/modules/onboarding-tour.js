/**
 * Onboarding Tour Module
 * Guide new users through the app features
 * FIXED: Improved highlighting, positioning, and mobile responsiveness
 */

const OnboardingTour = (() => {
  const TOUR_STEPS = [
    {
      target: '.header-title',
      title: 'Welcome to Spiritual Seasons! 🌱',
      content: 'Your 120-day devotional journey through four spiritual seasons: Winter, Spring, Summer, and Autumn.',
      position: 'bottom'
    },
    {
      target: '.nav-item[data-route="home"]',
      title: 'Home',
      content: 'Your dashboard shows your current progress, today\'s devotional, and recent activities.',
      position: 'top'
    },
    {
      target: '.nav-item[data-route="devotional"]',
      title: 'Daily Devotional',
      content: 'Read today\'s scripture, reflection, and journal your thoughts. You can also record audio notes!',
      position: 'top'
    },
    {
      target: '.nav-item[data-route="contents"]',
      title: 'Table of Contents',
      content: 'Browse all 120 days organized by season. Track your progress and jump to any day.',
      position: 'top'
    },
    {
      target: '.nav-item[data-route="progress"]',
      title: 'Track Progress',
      content: 'View your completion stats, streaks, favorite verses, and seasonal journey.',
      position: 'top'
    },
    {
      target: '.nav-item[data-route="settings"]',
      title: 'Settings & Tools',
      content: 'Customize your experience with themes, meditation timer, guided breathing, and more!',
      position: 'top'
    }
  ];

  let currentStep = 0;
  let tourActive = false;
  let overlayEl = null;
  let spotlightEl = null;
  let tooltipEl = null;
  let scrollY = 0;
  let resizeTimeout = null;

  /**
   * Check if user has completed onboarding
   */
  async function hasCompletedOnboarding() {
    const completed = await Store.getSetting('onboardingCompleted');
    return completed === true;
  }

  /**
   * Mark onboarding as completed
   */
  async function markCompleted() {
    await Store.saveSetting('onboardingCompleted', true);
  }

  /**
   * Start the tour
   */
  async function startTour(forceRestart = false) {
    if (tourActive && !forceRestart) return;
    
    // Check if already completed
    if (!forceRestart && await hasCompletedOnboarding()) {
      return;
    }

    tourActive = true;
    currentStep = 0;
    
    // Create dark overlay
    overlayEl = document.createElement('div');
    overlayEl.id = 'tour-overlay';
    overlayEl.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9997;
      transition: opacity 0.3s ease;
      opacity: 0;
    `;
    document.body.appendChild(overlayEl);
    
    // Trigger opacity transition
    requestAnimationFrame(() => {
      overlayEl.style.opacity = '1';
    });

    // Create spotlight element (cut-out for highlighted element)
    spotlightEl = document.createElement('div');
    spotlightEl.id = 'tour-spotlight';
    spotlightEl.style.cssText = `
      position: fixed;
      border: 3px solid var(--season-primary);
      border-radius: var(--radius-lg);
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1),
                  0 0 20px rgba(0, 0, 0, 0.3);
      z-index: 9998;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: rgba(255, 255, 255, 0.05);
    `;
    document.body.appendChild(spotlightEl);

    // Add window resize handler
    window.addEventListener('resize', handleResize);

    // Show first step
    setTimeout(() => showStep(0), 100);
  }

  /**
   * Handle window resize during tour
   */
  function handleResize() {
    if (!tourActive) return;
    
    // Debounce resize events
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    
    resizeTimeout = setTimeout(() => {
      // Re-render current step with new dimensions
      showStep(currentStep);
    }, 100);
  }

  /**
   * Show a specific tour step
   */
  function showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= TOUR_STEPS.length) {
      endTour();
      return;
    }

    currentStep = stepIndex;
    const step = TOUR_STEPS[stepIndex];
    
    // Remove previous tooltip
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }

    // Find target element
    const target = document.querySelector(step.target);
    if (!target) {
      Utils.debug.warn('Tour target not found:', step.target);
      // Skip to next step
      setTimeout(() => showStep(stepIndex + 1), 100);
      return;
    }

    // Scroll target into view first (with offset for bottom nav)
    const targetRect = target.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const bottomNavHeight = 80; // Approximate height of bottom nav
    
    // Check if target is hidden by bottom nav
    if (targetRect.bottom > viewportHeight - bottomNavHeight) {
      // Scroll to make it visible above bottom nav
      const scrollOffset = targetRect.bottom - (viewportHeight - bottomNavHeight - 20);
      window.scrollBy({
        top: scrollOffset,
        behavior: 'smooth'
      });
      
      // Wait for scroll to complete before showing highlight
      setTimeout(() => continueShowStep(step, stepIndex), 300);
    } else if (targetRect.top < 100) {
      // Scroll to make it visible below header
      window.scrollBy({
        top: targetRect.top - 100,
        behavior: 'smooth'
      });
      
      setTimeout(() => continueShowStep(step, stepIndex), 300);
    } else {
      continueShowStep(step, stepIndex);
    }
  }

  /**
   * Continue showing step after scrolling
   */
  function continueShowStep(step, stepIndex) {
    const target = document.querySelector(step.target);
    if (!target) return;

    const rect = target.getBoundingClientRect();

    // Update spotlight position and size
    const padding = 8;
    spotlightEl.style.top = `${rect.top - padding}px`;
    spotlightEl.style.left = `${rect.left - padding}px`;
    spotlightEl.style.width = `${rect.width + padding * 2}px`;
    spotlightEl.style.height = `${rect.height + padding * 2}px`;

    // Make spotlight pulse
    spotlightEl.style.animation = 'tour-pulse 2s ease-in-out infinite';

    // Create tooltip
    createTooltip(step, stepIndex, rect);
  }

  /**
   * Create and position tooltip
   */
  function createTooltip(step, stepIndex, targetRect) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tour-tooltip';
    tooltipEl.style.cssText = `
      position: fixed;
      z-index: 9999;
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3),
                  0 10px 10px -5px rgba(0, 0, 0, 0.2);
      max-width: min(90vw, 360px);
      pointer-events: auto;
      border: 2px solid var(--season-primary);
    `;

    // Build tooltip content
    const progressText = `${stepIndex + 1} of ${TOUR_STEPS.length}`;
    const isFirst = stepIndex === 0;
    const isLast = stepIndex === TOUR_STEPS.length - 1;

    tooltipEl.innerHTML = `
      <div style="margin-bottom: var(--space-4);">
        <h3 style="font-size: var(--text-lg); font-weight: 600; margin: 0 0 var(--space-2); color: var(--text-primary);">
          ${Utils.escapeHtml(step.title)}
        </h3>
        <p style="color: var(--text-secondary); font-size: var(--text-sm); line-height: var(--leading-relaxed); margin: 0;">
          ${Utils.escapeHtml(step.content)}
        </p>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);">
        <div style="font-size: var(--text-xs); color: var(--text-tertiary); font-weight: 500;">
          ${progressText}
        </div>
        <div style="display: flex; gap: var(--space-2);">
          ${!isFirst ? `
            <button class="btn btn-ghost btn-sm" data-tour-action="prev">
              ${Utils.getIcon('chevronLeft', 16)}
              Back
            </button>
          ` : ''}
          ${!isLast ? `
            <button class="btn btn-primary btn-sm" data-tour-action="next">
              Next
              ${Utils.getIcon('chevronRight', 16)}
            </button>
            <button class="btn btn-ghost btn-sm" data-tour-action="skip">
              Skip Tour
            </button>
          ` : `
            <button class="btn btn-primary btn-sm" data-tour-action="finish">
              Get Started! 🌱
            </button>
          `}
        </div>
      </div>
    `;

    // Position tooltip before appending
    document.body.appendChild(tooltipEl);
    
    // Now position it correctly
    positionTooltip(tooltipEl, targetRect, step.position);

    // Add event listeners
    tooltipEl.querySelector('[data-tour-action="prev"]')?.addEventListener('click', () => {
      showStep(stepIndex - 1);
    });
    
    tooltipEl.querySelector('[data-tour-action="next"]')?.addEventListener('click', () => {
      showStep(stepIndex + 1);
    });
    
    tooltipEl.querySelector('[data-tour-action="finish"]')?.addEventListener('click', () => {
      endTour();
      markCompleted();
      Toast.success('Welcome aboard! Enjoy your journey! 🌱');
    });
    
    tooltipEl.querySelector('[data-tour-action="skip"]')?.addEventListener('click', () => {
      endTour();
      markCompleted();
      Toast.info('You can restart the tour anytime from Settings');
    });

    // Add pulse animation CSS if not already added
    if (!document.getElementById('tour-animations')) {
      const style = document.createElement('style');
      style.id = 'tour-animations';
      style.textContent = `
        @keyframes tour-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.95;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Position tooltip relative to target - IMPROVED ALGORITHM
   */
  function positionTooltip(tooltip, targetRect, preferredPosition) {
    const spacing = 16;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const padding = 16;
    const bottomNavHeight = 64; // Height of bottom navigation
    const headerHeight = 60; // Height of header
    
    // Get tooltip dimensions AFTER it's in DOM
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    
    let top, left;
    let actualPosition = preferredPosition;

    // Calculate available space in each direction
    const spaceAbove = targetRect.top - headerHeight - spacing;
    const spaceBelow = viewportHeight - bottomNavHeight - targetRect.bottom - spacing;
    const spaceLeft = targetRect.left - padding;
    const spaceRight = viewportWidth - targetRect.right - padding;

    // Determine best position based on available space
    if (preferredPosition === 'top' && spaceAbove < tooltipHeight) {
      // Not enough space above, try below
      if (spaceBelow >= tooltipHeight) {
        actualPosition = 'bottom';
      } else {
        // Not enough space above or below, use whichever has more space
        actualPosition = spaceBelow > spaceAbove ? 'bottom' : 'top';
      }
    } else if (preferredPosition === 'bottom' && spaceBelow < tooltipHeight) {
      // Not enough space below, try above
      if (spaceAbove >= tooltipHeight) {
        actualPosition = 'top';
      } else {
        actualPosition = spaceAbove > spaceBelow ? 'top' : 'bottom';
      }
    }

    // Calculate position based on actual position
    switch (actualPosition) {
      case 'top':
        top = targetRect.top - tooltipHeight - spacing;
        left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
        break;
      
      case 'bottom':
        top = targetRect.bottom + spacing;
        left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
        break;
      
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
        left = targetRect.left - tooltipWidth - spacing;
        break;
      
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
        left = targetRect.right + spacing;
        break;
      
      default:
        // Default to bottom
        top = targetRect.bottom + spacing;
        left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
    }

    // Ensure tooltip stays within viewport bounds with padding
    const minTop = headerHeight + padding;
    const maxTop = viewportHeight - bottomNavHeight - tooltipHeight - padding;
    const minLeft = padding;
    const maxLeft = viewportWidth - tooltipWidth - padding;

    // Constrain to viewport
    top = Math.max(minTop, Math.min(top, maxTop));
    left = Math.max(minLeft, Math.min(left, maxLeft));

    // Apply position
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    
    // Add entrance animation
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'scale(0.95)';
    tooltip.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'scale(1)';
    });
  }

  /**
   * End the tour and cleanup
   */
  function endTour() {
    tourActive = false;

    // Remove resize listener
    window.removeEventListener('resize', handleResize);

    // Remove overlay with fade out
    if (overlayEl) {
      overlayEl.style.opacity = '0';
      setTimeout(() => {
        overlayEl?.remove();
        overlayEl = null;
      }, 300);
    }

    // Remove spotlight
    if (spotlightEl) {
      spotlightEl.style.opacity = '0';
      spotlightEl.style.transform = 'scale(0.95)';
      setTimeout(() => {
        spotlightEl?.remove();
        spotlightEl = null;
      }, 300);
    }

    // Remove tooltip
    if (tooltipEl) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.transform = 'scale(0.95)';
      setTimeout(() => {
        tooltipEl?.remove();
        tooltipEl = null;
      }, 300);
    }

    // Clear resize timeout
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
  }

  /**
   * Show tour prompt for new users
   */
  async function showTourPrompt() {
    if (await hasCompletedOnboarding()) {
      return;
    }

    // Wait a bit before showing prompt
    setTimeout(async () => {
      const result = await Modal.confirm({
        title: 'Welcome to Spiritual Seasons! 🌱',
        message: 'Would you like a quick tour to learn about the app features?',
        confirmText: 'Yes, show me around',
        cancelText: 'Skip for now',
        size: 'small'
      });

      if (result) {
        startTour();
      } else {
        await markCompleted();
        Toast.info('You can start the tour anytime from Settings');
      }
    }, 2000);
  }

  /**
   * Restart tour from settings
   */
  async function restartTour() {
    // First end any active tour
    if (tourActive) {
      endTour();
    }
    
    // Wait a moment then start fresh
    setTimeout(() => {
      startTour(true);
    }, 300);
  }

  return {
    startTour,
    showTourPrompt,
    restartTour,
    hasCompletedOnboarding,
    markCompleted
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OnboardingTour;
}
