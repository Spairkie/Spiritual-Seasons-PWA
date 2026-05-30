/**
 * Text-to-Speech Module
 * Read devotional content aloud with speed control
 */

const TTS = (() => {
  let synth = null;
  let currentUtterance = null;
  let isPaused = false;
  let isReading = false;
  let currentRate = 1.0;
  let currentVoice = null;

  /**
   * Initialize TTS
   */
  function init() {
    if ('speechSynthesis' in window) {
      synth = window.speechSynthesis;
      
      // Load saved settings
      Store.getSettings().then(settings => {
        currentRate = settings.ttsRate || 1.0;
        
        // Wait for voices to load
        if (synth.getVoices().length > 0) {
          selectBestVoice();
        } else {
          synth.addEventListener('voiceschanged', selectBestVoice);
        }
      });

      // Pause TTS when tab is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && isPlaying()) {
          pause();
          Utils.debug.log('[TTS] Paused due to tab hidden');
        }
      });

      return true;
    }
    
    Utils.debug.warn('Text-to-speech not supported in this browser');
    return false;
  }

  /**
   * Check if TTS is supported
   */
  function isSupported() {
    return 'speechSynthesis' in window;
  }

  /**
   * Check if TTS is currently playing
   */
  function isPlaying() {
    return isReading;
  }

  /**
   * Select the best available voice
   */
  function selectBestVoice() {
    const voices = synth.getVoices();
    
    if (!voices || voices.length === 0) {
      currentVoice = null;
      return;
    }
    
    // Prefer English voices
    const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
    
    // Prefer high-quality voices (usually have "Google" or "Microsoft" in the name)
    const highQuality = englishVoices.find(voice => 
      voice.name.includes('Google') || voice.name.includes('Microsoft')
    );

    currentVoice = highQuality || englishVoices[0] || voices[0] || null;
  }

  /**
   * Preprocess text for better TTS readability
   * @param {string} text - Raw text
   * @returns {string} - Processed text
   */
  function preprocessText(text) {
    return text
      // Replace common abbreviations with full words
      .replace(/\bvs\./gi, 'versus')
      .replace(/\betc\./gi, 'etcetera')
      .replace(/\be\.g\./gi, 'for example')
      .replace(/\bi\.e\./gi, 'that is')
      // Improve scripture references
      .replace(/(\d+):(\d+)/g, '$1 verse $2')
      // Add pauses for better readability
      .replace(/;/g, ',')
      .replace(/--/g, ',')
      // Clean up excessive punctuation
      .replace(/\.{3,}/g, '.')
      .replace(/!{2,}/g, '!')
      .replace(/\?{2,}/g, '?')
      // Remove markdown/formatting
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/_/g, '')
      .trim();
  }

  /**
   * Read text aloud
   */
  function read(text, options = {}) {
    if (!isSupported()) {
      Toast.error('Text-to-speech is not supported in your browser');
      return false;
    }

    // Stop any current reading
    stop();
    
    // Preprocess text for better speech
    const processedText = preprocessText(text);

    const {
      rate = currentRate,
      pitch = 1.0,
      volume = 1.0,
      onEnd = null,
      onStart = null,
      onPause = null,
      onResume = null
    } = options;

    currentUtterance = new SpeechSynthesisUtterance(processedText);
    currentUtterance.rate = rate;
    currentUtterance.pitch = pitch;
    currentUtterance.volume = volume;
    currentUtterance.voice = currentVoice;

    // Event listeners
    currentUtterance.onstart = () => {
      isReading = true;
      isPaused = false;
      if (onStart) onStart();
    };

    currentUtterance.onend = () => {
      isReading = false;
      isPaused = false;
      if (onEnd) onEnd();
    };

    currentUtterance.onpause = () => {
      isPaused = true;
      if (onPause) onPause();
    };

    currentUtterance.onresume = () => {
      isPaused = false;
      if (onResume) onResume();
    };

    currentUtterance.onerror = (event) => {
      Utils.debug.error('TTS error:', event);
      isReading = false;
      isPaused = false;
      Toast.error('Error reading text aloud');
    };

    synth.speak(currentUtterance);
    return true;
  }

  /**
   * Pause reading
   */
  function pause() {
    if (synth && isReading && !isPaused) {
      synth.pause();
      return true;
    }
    return false;
  }

  /**
   * Resume reading
   */
  function resume() {
    if (synth && isReading && isPaused) {
      synth.resume();
      return true;
    }
    return false;
  }

  /**
   * Stop reading
   */
  function stop() {
    if (synth) {
      synth.cancel();
      isReading = false;
      isPaused = false;
      currentUtterance = null;
      return true;
    }
    return false;
  }

  /**
   * Toggle play/pause
   */
  function togglePlayPause() {
    if (isPaused) {
      resume();
      return 'playing';
    } else if (isReading) {
      pause();
      return 'paused';
    }
    return 'stopped';
  }

  /**
   * Set reading speed
   */
  async function setRate(rate) {
    currentRate = Math.max(0.1, Math.min(10, rate));
    await Store.saveSetting('ttsRate', currentRate);
    
    // If currently reading, need to restart with new rate
    if (isReading && currentUtterance) {
      const text = currentUtterance.text;
      stop();
      read(text);
    }
  }

  /**
   * Get available voices
   */
  function getVoices() {
    if (!synth) return [];
    return synth.getVoices();
  }

  /**
   * Set voice
   */
  function setVoice(voice) {
    currentVoice = voice;
  }

  /**
   * Get status
   */
  function getStatus() {
    return {
      isSupported: isSupported(),
      isReading,
      isPaused,
      rate: currentRate,
      voice: currentVoice
    };
  }

  /**
   * Read devotional content
   */
  function readDevotional(day) {
    const dayData = Devotional.getDay(day);
    if (!dayData) {
      Toast.error('No content to read');
      return false;
    }

    const text = `
      Day ${day}. 
      ${dayData.scriptureRef}. 
      ${dayData.scripture}. 
      Today's reflection: ${dayData.prompt}
    `;

    return read(text, {
      onStart: () => {
        Toast.info('Reading aloud...', 3000);
      },
      onEnd: () => {
        Toast.success('Finished reading');
      }
    });
  }

  /**
   * Render TTS controls
   */
  function renderControls(containerId, text, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!isSupported()) {
      container.innerHTML = `
        <div class="tts-not-supported">
          Text-to-speech is not supported in your browser
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="tts-controls">
        <button class="btn btn-secondary btn-sm" id="tts-play-pause">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="tts-icon-play">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="tts-icon-pause" style="display: none;">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
          <span id="tts-button-text">Read Aloud</span>
        </button>
        
        <button class="btn btn-ghost btn-sm" id="tts-stop" style="display: none;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="6" width="12" height="12"/>
          </svg>
        </button>

        <div class="tts-speed-control" id="tts-speed-display" style="display: none;">
          <label style="font-size: var(--text-sm); color: var(--text-secondary);">
            Speed: <span id="tts-rate-value">${currentRate}x</span>
          </label>
          <input type="range" min="0.5" max="2" step="0.1" value="${currentRate}" id="tts-rate-slider" class="slider">
        </div>
      </div>
    `;

    attachTTSListeners(text, options);
  }

  /**
   * Attach event listeners to TTS controls
   */
  function attachTTSListeners(text, options) {
    const playPauseBtn = document.getElementById('tts-play-pause');
    const stopBtn = document.getElementById('tts-stop');
    const playIcon = document.getElementById('tts-icon-play');
    const pauseIcon = document.getElementById('tts-icon-pause');
    const buttonText = document.getElementById('tts-button-text');
    const speedDisplay = document.getElementById('tts-speed-display');
    const rateSlider = document.getElementById('tts-rate-slider');
    const rateValue = document.getElementById('tts-rate-value');

    playPauseBtn?.addEventListener('click', () => {
      if (!isReading) {
        // Start reading
        read(text, {
          ...options,
          onStart: () => {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            buttonText.textContent = 'Pause';
            stopBtn.style.display = 'inline-flex';
            speedDisplay.style.display = 'flex';
            if (options.onStart) options.onStart();
          },
          onEnd: () => {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            buttonText.textContent = 'Read Aloud';
            stopBtn.style.display = 'none';
            speedDisplay.style.display = 'none';
            if (options.onEnd) options.onEnd();
          }
        });
      } else {
        // Toggle pause/resume
        const state = togglePlayPause();
        if (state === 'paused') {
          playIcon.style.display = 'block';
          pauseIcon.style.display = 'none';
          buttonText.textContent = 'Resume';
        } else if (state === 'playing') {
          playIcon.style.display = 'none';
          pauseIcon.style.display = 'block';
          buttonText.textContent = 'Pause';
        }
      }
    });

    stopBtn?.addEventListener('click', () => {
      stop();
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      buttonText.textContent = 'Read Aloud';
      stopBtn.style.display = 'none';
      speedDisplay.style.display = 'none';
    });

    rateSlider?.addEventListener('input', (e) => {
      const rate = parseFloat(e.target.value);
      rateValue.textContent = rate.toFixed(1) + 'x';
      setRate(rate);
    });
  }

  return {
    init,
    isSupported,
    isPlaying,
    read,
    pause,
    resume,
    stop,
    togglePlayPause,
    setRate,
    getVoices,
    setVoice,
    getStatus,
    readDevotional,
    renderControls
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TTS;
}
