/**
 * Guided Breathing Module
 * Breathing exercises with visual animation
 */

const GuidedBreathing = (() => {
  let breathingInterval = null;
  let isActive = false;
  
  // Breathing patterns (in seconds)
  const PATTERNS = {
    'box': {
      name: 'Box Breathing (4-4-4-4)',
      inhale: 4,
      hold1: 4,
      exhale: 4,
      hold2: 4
    },
    '478': {
      name: '4-7-8 Technique',
      inhale: 4,
      hold1: 7,
      exhale: 8,
      hold2: 0
    },
    'calm': {
      name: 'Calming Breath (4-6)',
      inhale: 4,
      hold1: 0,
      exhale: 6,
      hold2: 0
    },
    'energize': {
      name: 'Energizing Breath (6-2)',
      inhale: 6,
      hold1: 0,
      exhale: 2,
      hold2: 0
    }
  };

  /**
   * Initialize guided breathing
   */
  async function init() {
    console.log('✓ Guided breathing initialized');
  }

  /**
   * Start breathing exercise
   */
  function startBreathing(pattern, animationElement, textElement, onCycleComplete) {
    stopBreathing();
    
    const { inhale, hold1, exhale, hold2 } = PATTERNS[pattern];
    const cycle = [
      { phase: 'inhale', duration: inhale, text: 'Breathe In' },
      ...(hold1 > 0 ? [{ phase: 'hold', duration: hold1, text: 'Hold' }] : []),
      { phase: 'exhale', duration: exhale, text: 'Breathe Out' },
      ...(hold2 > 0 ? [{ phase: 'hold2', duration: hold2, text: 'Hold' }] : [])
    ];
    
    let currentStepIndex = 0;
    let secondsInStep = 0;
    let cycleCount = 0;
    
    isActive = true;
    
    function updateAnimation() {
      const step = cycle[currentStepIndex];
      const progress = secondsInStep / step.duration;
      
      // Update text
      if (textElement) {
        const remaining = step.duration - secondsInStep;
        textElement.textContent = `${step.text} (${Math.ceil(remaining)}s)`;
      }
      
      // Update animation
      if (animationElement) {
        updateCircleAnimation(animationElement, step.phase, progress);
      }
      
      secondsInStep++;
      
      if (secondsInStep > step.duration) {
        secondsInStep = 0;
        currentStepIndex++;
        
        if (currentStepIndex >= cycle.length) {
          currentStepIndex = 0;
          cycleCount++;
          if (onCycleComplete) {
            onCycleComplete(cycleCount);
          }
        }
      }
    }
    
    // Initial update
    updateAnimation();
    
    // Start interval
    breathingInterval = setInterval(updateAnimation, 1000);
  }

  /**
   * Update circle animation based on breathing phase
   */
  function updateCircleAnimation(element, phase, progress) {
    const minScale = 0.6;
    const maxScale = 1.0;
    
    let scale, opacity;
    
    switch (phase) {
      case 'inhale':
        scale = minScale + (maxScale - minScale) * progress;
        opacity = 0.6 + 0.4 * progress;
        break;
      case 'exhale':
        scale = maxScale - (maxScale - minScale) * progress;
        opacity = 1.0 - 0.4 * progress;
        break;
      case 'hold':
      case 'hold2':
        scale = maxScale;
        opacity = 1.0;
        break;
      default:
        scale = minScale;
        opacity = 0.6;
    }
    
    element.style.transform = `scale(${scale})`;
    element.style.opacity = opacity;
  }

  /**
   * Stop breathing exercise
   */
  function stopBreathing() {
    if (breathingInterval) {
      clearInterval(breathingInterval);
      breathingInterval = null;
    }
    isActive = false;
  }

  /**
   * Show guided breathing interface
   */
  async function showBreathing() {
    let selectedPattern = 'box';
    let cycleCount = 0;
    let targetCycles = 5;
    
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div id="breathing-setup" style="text-align: center;">
        <div style="margin-bottom: var(--space-6);">
          <label style="display: block; margin-bottom: var(--space-3); font-weight: 600;">
            Choose a Breathing Pattern
          </label>
          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${Object.entries(PATTERNS).map(([key, pattern]) => `
              <button 
                class="pattern-btn btn btn-secondary" 
                data-pattern="${key}"
                style="text-align: left; justify-content: flex-start;"
              >
                <div style="flex: 1;">
                  <div style="font-weight: 600;">${pattern.name}</div>
                  <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-1);">
                    ${pattern.inhale}s in${pattern.hold1 > 0 ? ` → ${pattern.hold1}s hold` : ''} → ${pattern.exhale}s out${pattern.hold2 > 0 ? ` → ${pattern.hold2}s hold` : ''}
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
        
        <div style="margin-bottom: var(--space-4);">
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600;">
            Number of Cycles
          </label>
          <input 
            type="number" 
            id="target-cycles" 
            min="1" 
            max="20" 
            value="${targetCycles}"
            style="width: 100%; padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: var(--text-lg); text-align: center;"
          >
        </div>
      </div>
      
      <div id="breathing-active" style="display: none; text-align: center;">
        <div style="margin: var(--space-6) 0;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: var(--space-6);">
            <div id="breathing-circle" style="
              width: 200px;
              height: 200px;
              border-radius: 50%;
              background: linear-gradient(135deg, var(--season-primary), var(--season-light));
              box-shadow: 0 0 40px rgba(74, 144, 164, 0.4);
              transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
            "></div>
          </div>
          
          <div id="breathing-instruction" style="
            font-family: var(--font-display);
            font-size: var(--text-2xl);
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: var(--space-4);
          ">
            Breathe In (4s)
          </div>
          
          <div id="breathing-progress" style="color: var(--text-secondary); font-size: var(--text-lg);">
            Cycle <span id="current-cycle">1</span> of <span id="total-cycles">${targetCycles}</span>
          </div>
        </div>
        
        <button id="stop-breathing-btn" class="btn btn-ghost">
          ${Utils.getIcon('x', 20)}
          Stop
        </button>
      </div>
    `;
    
    const setupDiv = modalContent.querySelector('#breathing-setup');
    const activeDiv = modalContent.querySelector('#breathing-active');
    const circleEl = modalContent.querySelector('#breathing-circle');
    const instructionEl = modalContent.querySelector('#breathing-instruction');
    const currentCycleEl = modalContent.querySelector('#current-cycle');
    const targetCyclesInput = modalContent.querySelector('#target-cycles');
    
    // Pattern selection
    modalContent.querySelectorAll('.pattern-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modalContent.querySelectorAll('.pattern-btn').forEach(b => {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
        });
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        selectedPattern = btn.dataset.pattern;
      });
    });
    
    // Select box breathing by default
    modalContent.querySelector('[data-pattern="box"]').click();
    
    // Target cycles input
    targetCyclesInput.addEventListener('input', (e) => {
      targetCycles = parseInt(e.target.value) || 5;
      modalContent.querySelector('#total-cycles').textContent = targetCycles;
    });
    
    Modal.create({
      title: 'Guided Breathing',
      content: modalContent,
      size: 'medium',
      closeOnOverlay: false,
      buttons: [
        {
          text: 'Start Breathing',
          className: 'btn-primary',
          onClick: () => {
            setupDiv.style.display = 'none';
            activeDiv.style.display = 'block';
            cycleCount = 0;
            
            startBreathing(
              selectedPattern,
              circleEl,
              instructionEl,
              (count) => {
                cycleCount = count;
                currentCycleEl.textContent = count + 1;
                
                if (count >= targetCycles) {
                  stopBreathing();
                  Toast.success('Breathing exercise completed!');
                  setTimeout(() => Modal.close(), 2000);
                }
              }
            );
            
            // Stop button handler
            modalContent.querySelector('#stop-breathing-btn').addEventListener('click', () => {
              stopBreathing();
              Modal.close();
            });
            
            return false; // Keep modal open
          }
        },
        {
          text: 'Cancel',
          className: 'btn-ghost',
          onClick: () => {
            stopBreathing();
            return true;
          }
        }
      ],
      onClose: () => {
        stopBreathing();
      }
    });
  }

  return {
    init,
    showBreathing,
    startBreathing,
    stopBreathing,
    PATTERNS
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GuidedBreathing;
}
