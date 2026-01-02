/**
 * Meditation Timer Module
 * Simple meditation timer with optional chime sounds
 */

const MeditationTimer = (() => {
  let timerInterval = null;
  let remainingSeconds = 0;
  let isPaused = false;
  let chimeEnabled = true;
  
  // Preset durations in seconds
  const PRESETS = {
    short: { duration: 300, label: '5 minutes' },
    medium: { duration: 600, label: '10 minutes' },
    long: { duration: 1200, label: '20 minutes' },
    custom: { duration: 900, label: 'Custom' }
  };

  /**
   * Initialize meditation timer
   */
  async function init() {
    // Load saved preferences
    const settings = await Store.getSetting('meditationTimer') || {};
    chimeEnabled = settings.chimeEnabled !== false;
    console.log('✓ Meditation timer initialized');
  }

  /**
   * Start timer
   */
  function startTimer(duration, onTick, onComplete) {
    if (timerInterval) {
      stopTimer();
    }
    
    remainingSeconds = duration;
    isPaused = false;
    
    // Play start chime
    if (chimeEnabled) {
      playChime('start');
    }
    
    // Initial tick
    if (onTick) onTick(remainingSeconds);
    
    timerInterval = setInterval(() => {
      if (!isPaused) {
        remainingSeconds--;
        
        if (onTick) onTick(remainingSeconds);
        
        // Halfway chime (optional)
        if (remainingSeconds === Math.floor(duration / 2) && chimeEnabled) {
          playChime('halfway');
        }
        
        if (remainingSeconds <= 0) {
          stopTimer();
          if (chimeEnabled) {
            playChime('end');
          }
          if (onComplete) onComplete();
        }
      }
    }, 1000);
  }

  /**
   * Pause/Resume timer
   */
  function togglePause() {
    isPaused = !isPaused;
    return isPaused;
  }

  /**
   * Stop timer
   */
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    remainingSeconds = 0;
    isPaused = false;
  }

  /**
   * Play chime sound
   */
  function playChime(type = 'end') {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different chimes
    const frequencies = {
      start: 440, // A4
      halfway: 523.25, // C5
      end: 659.25 // E5
    };
    
    oscillator.frequency.value = frequencies[type] || frequencies.end;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.5);
  }

  /**
   * Format seconds to MM:SS
   */
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Show meditation timer interface
   */
  async function showTimer() {
    let selectedPreset = 'medium';
    let customMinutes = 15;
    let isActive = false;
    
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div id="timer-setup" style="text-align: center;">
        <div style="margin-bottom: var(--space-6);">
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600;">
            Duration
          </label>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2);">
            ${Object.entries(PRESETS).map(([key, preset]) => `
              <button 
                class="preset-btn btn btn-secondary" 
                data-preset="${key}"
                style="padding: var(--space-4);"
              >
                ${preset.label}
              </button>
            `).join('')}
          </div>
        </div>
        
        <div id="custom-duration" style="display: none; margin-bottom: var(--space-6);">
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600;">
            Custom Duration (minutes)
          </label>
          <input 
            type="number" 
            id="custom-minutes" 
            min="1" 
            max="60" 
            value="${customMinutes}"
            style="width: 100%; padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: var(--text-lg); text-align: center;"
          >
        </div>
        
        <div style="margin-bottom: var(--space-4);">
          <label style="display: flex; align-items: center; gap: var(--space-2); justify-content: center; cursor: pointer;">
            <input type="checkbox" id="chime-enabled" ${chimeEnabled ? 'checked' : ''}>
            <span>Play chime sounds</span>
          </label>
        </div>
      </div>
      
      <div id="timer-active" style="display: none; text-align: center;">
        <div style="margin: var(--space-8) 0;">
          <div id="timer-display" style="font-family: var(--font-display); font-size: 72px; font-weight: 700; color: var(--season-primary); line-height: 1;">
            10:00
          </div>
          <div id="timer-status" style="margin-top: var(--space-2); color: var(--text-secondary); font-size: var(--text-lg);">
            Meditation in progress...
          </div>
        </div>
        
        <div style="display: flex; gap: var(--space-3); justify-content: center;">
          <button id="pause-btn" class="btn btn-secondary" style="min-width: 120px;">
            ${Utils.getIcon('pause', 20)}
            Pause
          </button>
          <button id="stop-btn" class="btn btn-ghost">
            ${Utils.getIcon('x', 20)}
            Stop
          </button>
        </div>
      </div>
    `;
    
    const timerSetup = modalContent.querySelector('#timer-setup');
    const timerActive = modalContent.querySelector('#timer-active');
    const timerDisplay = modalContent.querySelector('#timer-display');
    const timerStatus = modalContent.querySelector('#timer-status');
    const customDurationDiv = modalContent.querySelector('#custom-duration');
    const customMinutesInput = modalContent.querySelector('#custom-minutes');
    
    // Preset button handlers
    modalContent.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modalContent.querySelectorAll('.preset-btn').forEach(b => {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
        });
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        
        selectedPreset = btn.dataset.preset;
        customDurationDiv.style.display = selectedPreset === 'custom' ? 'block' : 'none';
      });
    });
    
    // Select medium by default
    modalContent.querySelector('[data-preset="medium"]').click();
    
    // Chime toggle
    modalContent.querySelector('#chime-enabled').addEventListener('change', async (e) => {
      chimeEnabled = e.target.checked;
      await Store.saveSetting('meditationTimer', { chimeEnabled });
    });
    
    // Custom minutes input
    customMinutesInput.addEventListener('input', (e) => {
      customMinutes = parseInt(e.target.value) || 15;
    });
    
    Modal.create({
      title: 'Meditation Timer',
      content: modalContent,
      size: 'medium',
      closeOnOverlay: false, // Don't close when clicking outside during meditation
      buttons: [
        {
          text: 'Start Meditation',
          className: 'btn-primary',
          onClick: () => {
            const duration = selectedPreset === 'custom' 
              ? customMinutes * 60 
              : PRESETS[selectedPreset].duration;
            
            timerSetup.style.display = 'none';
            timerActive.style.display = 'block';
            isActive = true;
            
            startTimer(
              duration,
              (remaining) => {
                timerDisplay.textContent = formatTime(remaining);
                if (isPaused) {
                  timerStatus.textContent = 'Paused';
                } else {
                  timerStatus.textContent = 'Meditation in progress...';
                }
              },
              () => {
                timerStatus.textContent = 'Meditation complete! 🙏';
                Toast.success('Meditation session completed!');
                setTimeout(() => Modal.close(), 2000);
              }
            );
            
            // Pause button handler
            modalContent.querySelector('#pause-btn').addEventListener('click', () => {
              const paused = togglePause();
              const pauseBtn = modalContent.querySelector('#pause-btn');
              pauseBtn.innerHTML = paused 
                ? `${Utils.getIcon('play', 20)} Resume`
                : `${Utils.getIcon('pause', 20)} Pause`;
            });
            
            // Stop button handler
            modalContent.querySelector('#stop-btn').addEventListener('click', () => {
              stopTimer();
              Modal.close();
            });
            
            return false; // Keep modal open
          }
        },
        {
          text: 'Cancel',
          className: 'btn-ghost',
          onClick: () => {
            if (isActive) {
              stopTimer();
            }
            return true;
          }
        }
      ],
      onClose: () => {
        if (isActive) {
          stopTimer();
        }
      }
    });
  }

  return {
    init,
    showTimer,
    startTimer,
    stopTimer,
    togglePause,
    formatTime
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MeditationTimer;
}
