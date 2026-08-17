/**
 * Modal Dialog System
 * Reusable modal component with accessibility and keyboard navigation
 */

const Modal = (() => {
  let activeModal = null;
  let previousFocus = null;
  let scrollY = 0;

  function lockBodyScroll() {
    // Store current scroll position
    scrollY = window.scrollY;
    
    // Lock the body
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    // Restore body
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    
    // Restore scroll position
    window.scrollTo(0, scrollY);
  }

  function create(options = {}) {
    const {
      title = '',
      content = '',
      buttons = [],
      size = 'medium', // 'small', 'medium', 'large'
      closeOnOverlay = true,
      closeOnEscape = true,
      showCloseButton = true,
      onOpen = null,
      onClose = null
    } = options;

    // Close any existing modal
    if (activeModal) {
      close();
    }

    // Store current focus
    previousFocus = document.activeElement;
    
    // Lock body scroll
    lockBodyScroll();

    // Create modal structure
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.setAttribute('role', 'dialog');
    modalOverlay.setAttribute('aria-modal', 'true');
    if (title) {
      modalOverlay.setAttribute('aria-labelledby', 'modal-title');
    }

    const modalContainer = document.createElement('div');
    modalContainer.className = `modal-container modal-${size}`;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Header
    if (title || showCloseButton) {
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';

      if (title) {
        const modalTitle = document.createElement('h2');
        modalTitle.id = 'modal-title';
        modalTitle.className = 'modal-title';
        modalTitle.textContent = title;
        modalHeader.appendChild(modalTitle);
      }

      if (showCloseButton) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.setAttribute('aria-label', 'Close dialog');
        closeBtn.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        closeBtn.addEventListener('click', () => close());
        modalHeader.appendChild(closeBtn);
      }

      modalContent.appendChild(modalHeader);
    }

    // Body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    if (typeof content === 'string') {
      modalBody.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      modalBody.appendChild(content);
    }

    modalContent.appendChild(modalBody);

    // Footer with buttons
    if (buttons.length > 0) {
      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer';

      buttons.forEach((btn, index) => {
        const button = document.createElement('button');
        button.className = `btn ${btn.className || 'btn-secondary'}`;
        button.textContent = btn.text;
        
        if (btn.onClick) {
          button.addEventListener('click', async (e) => {
            const result = await btn.onClick(e);
            // Close modal unless onClick returns false
            if (result !== false) {
              close();
            }
          });
        } else {
          button.addEventListener('click', () => close());
        }

        // First button gets focus
        if (index === 0) {
          button.setAttribute('data-autofocus', 'true');
        }

        modalFooter.appendChild(button);
      });

      modalContent.appendChild(modalFooter);
    }

    modalContainer.appendChild(modalContent);
    modalOverlay.appendChild(modalContainer);
    document.body.appendChild(modalOverlay);

    // Store reference
    activeModal = {
      overlay: modalOverlay,
      container: modalContainer,
      content: modalContent,
      onClose
    };

    // Event listeners
    if (closeOnOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          close();
        }
      });
    }

    if (closeOnEscape) {
      document.addEventListener('keydown', handleEscape);
    }

    // Focus management
    setupFocusTrap(modalContainer);

    // Show modal with animation
    setTimeout(() => {
      modalOverlay.classList.add('modal-show');
      
      // Focus first button or first focusable element
      const autofocus = modalContainer.querySelector('[data-autofocus]');
      if (autofocus) {
        autofocus.focus();
      } else {
        const firstFocusable = modalContainer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }

      if (onOpen) {
        onOpen();
      }
    }, 10);

    return {
      close: () => close(),
      getElement: () => modalOverlay
    };
  }

  function close() {
    if (!activeModal) return;

    const { overlay, onClose } = activeModal;

    overlay.classList.remove('modal-show');
    overlay.classList.add('modal-hide');

    document.removeEventListener('keydown', handleEscape);
    
    // Unlock body scroll
    unlockBodyScroll();

    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      // Restore focus
      if (previousFocus) {
        previousFocus.focus();
        previousFocus = null;
      }

      if (onClose) {
        onClose();
      }

      activeModal = null;
    }, 300);
  }

  function handleEscape(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      close();
    }
  }

  function setupFocusTrap(container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    });
  }

  // Convenience methods
  function confirm(options) {
    return new Promise((resolve) => {
      create({
        title: options.title || 'Confirm',
        content: options.message || 'Are you sure?',
        size: options.size || 'small',
        buttons: [
          {
            text: options.confirmText || 'Confirm',
            className: options.confirmClass || 'btn-primary',
            onClick: () => {
              resolve(true);
            }
          },
          {
            text: options.cancelText || 'Cancel',
            className: 'btn-secondary',
            onClick: () => {
              resolve(false);
            }
          }
        ],
        onClose: () => resolve(false)
      });
    });
  }

  function alert(options) {
    return new Promise((resolve) => {
      create({
        title: options.title || 'Alert',
        content: options.message || '',
        size: options.size || 'small',
        buttons: [
          {
            text: options.buttonText || 'OK',
            className: 'btn-primary',
            onClick: () => {
              resolve();
            }
          }
        ],
        onClose: () => resolve()
      });
    });
  }

  function isOpen() {
    return activeModal !== null;
  }

  return {
    create,
    close,
    confirm,
    alert,
    isOpen
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Modal;
}
