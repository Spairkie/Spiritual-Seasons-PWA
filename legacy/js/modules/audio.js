/**
 * Audio Notes Module
 * Record, save, and playback audio notes for each day
 */

const AudioNotes = (() => {
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let currentDay = null;
  let recordingStartTime = null;
  let recordingTimer = null;
  let hasPermission = false;

  const MAX_DURATION_MS = 300000; // 5 minutes
  const MAX_SIZE_MB = 10;

  /**
   * Initialize audio module
   */
  async function init() {
    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Utils.debug.warn('Audio recording not supported in this browser');
      return false;
    }

    if (!window.MediaRecorder) {
      Utils.debug.warn('MediaRecorder API not supported');
      return false;
    }

    // Check permission status if Permissions API is available
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      hasPermission = result.state === 'granted';
      
      // Listen for permission changes
      result.addEventListener('change', () => {
        hasPermission = result.state === 'granted';
        Utils.debug.log('[AudioNotes] Permission status changed:', result.state);
      });
    } catch (e) {
      // Permissions API not supported, will check on first use
      Utils.debug.log('[AudioNotes] Permissions API not supported, will request on first use');
    }

    return true;
  }

  /**
   * Check if audio recording is supported
   */
  function isSupported() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.MediaRecorder);
  }

  /**
   * Check if we can record (supported AND have permission OR permission is unknown)
   */
  function canRecord() {
    return isSupported() && (hasPermission || hasPermission === false);
  }

  /**
   * Request microphone permission
   */
  async function requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      hasPermission = true;
      return true;
    } catch (error) {
      Utils.debug.error('Microphone permission denied:', error);
      hasPermission = false;
      if (error.name === 'NotAllowedError') {
        Toast.error('Microphone access denied. Please enable it in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        Toast.error('No microphone found. Please connect a microphone.');
      } else {
        Toast.error('Unable to access microphone.');
      }
      return false;
    }
  }

  /**
   * Start recording audio note
   */
  async function startRecording(day) {
    const validDay = Utils.validateDay(day);
    if (!validDay) {
      Utils.debug.error('Invalid day parameter:', day);
      return false;
    }
    
    if (isRecording) {
      Utils.debug.warn('Already recording');
      return false;
    }

    try {
      currentDay = validDay;
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      // Determine the best audio format supported
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunks = [];
      recordingStartTime = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await handleRecordingStop();
      };

      mediaRecorder.onerror = (error) => {
        Utils.debug.error('MediaRecorder error:', error);
        Toast.error('Recording error occurred');
        cleanupRecording();
      };

      mediaRecorder.start(1000); // Collect data every second
      isRecording = true;

      // Start recording timer display
      startRecordingTimer();

      // Auto-stop after max duration
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
          Toast.warning('Recording stopped - maximum duration reached (5 minutes)');
        }
      }, MAX_DURATION_MS);

      updateUI('recording', { day });
      
      return true;
    } catch (error) {
      Utils.debug.error('Error starting recording:', error);
      
      if (error.name === 'NotAllowedError') {
        Toast.error('Microphone access denied. Please enable it in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        Toast.error('No microphone found.');
      } else {
        Toast.error('Unable to start recording.');
      }
      
      return false;
    }
  }

  /**
   * Stop recording audio note
   */
  async function stopRecording() {
    if (!mediaRecorder || !isRecording) {
      Utils.debug.warn('Not currently recording');
      return false;
    }

    try {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      isRecording = false;
      stopRecordingTimer();

      updateUI('processing', { day: currentDay });
      
      return true;
    } catch (error) {
      Utils.debug.error('Error stopping recording:', error);
      cleanupRecording();
      return false;
    }
  }

  /**
   * Cancel recording without saving
   */
  function cancelRecording() {
    if (!isRecording) return;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    cleanupRecording();
    updateUI('cancelled', { day: currentDay });
    Toast.info('Recording cancelled');
  }

  /**
   * Handle recording stop event
   */
  async function handleRecordingStop() {
    if (audioChunks.length === 0) {
      Toast.error('No audio data recorded');
      cleanupRecording();
      return;
    }

    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
    
    // Check size
    const sizeMB = audioBlob.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      Toast.error(`Audio file too large (${sizeMB.toFixed(1)}MB). Maximum size is ${MAX_SIZE_MB}MB.`);
      cleanupRecording();
      updateUI('error', { day: currentDay });
      return;
    }

    // Get duration
    const duration = await getAudioDuration(audioBlob);

    // Save to IndexedDB
    const saved = await saveAudioNote(currentDay, audioBlob, duration);
    
    if (saved) {
      Toast.success('Audio note saved ✓', Toast.DURATION.short);
      updateUI('saved', { day: currentDay });
    } else {
      Toast.error('Failed to save audio note');
      updateUI('error', { day: currentDay });
    }

    cleanupRecording();
  }

  /**
   * Clean up recording state
   */
  function cleanupRecording() {
    audioChunks = [];
    isRecording = false;
    recordingStartTime = null;
    stopRecordingTimer();
    mediaRecorder = null;
  }

  /**
   * Start recording timer
   */
  function startRecordingTimer() {
    if (recordingTimer) {
      clearInterval(recordingTimer);
    }

    recordingTimer = setInterval(() => {
      const elapsed = Date.now() - recordingStartTime;
      const remaining = MAX_DURATION_MS - elapsed;
      
      updateUI('recording', { 
        day: currentDay,
        elapsed,
        remaining
      });

      if (remaining <= 0) {
        stopRecordingTimer();
      }
    }, 100);
  }

  /**
   * Stop recording timer
   */
  function stopRecordingTimer() {
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
  }

  /**
   * Save audio note to IndexedDB
   */
  async function saveAudioNote(day, audioBlob, duration) {
    const validDay = Utils.validateDay(day);
    if (!validDay) {
      Utils.debug.error('Invalid day parameter:', day);
      return false;
    }
    
    try {
      const audioData = {
        day: validDay,
        blob: audioBlob,
        duration: duration || 0,
        size: audioBlob.size,
        mimeType: audioBlob.type,
        createdAt: new Date().toISOString()
      };

      await Store.saveAudioNote(audioData);
      return true;
    } catch (error) {
      Utils.debug.error('Error saving audio note:', error);
      return false;
    }
  }

  /**
   * Get audio note for a specific day
   */
  async function getAudioNote(day) {
    const validDay = Utils.validateDay(day);
    if (!validDay) {
      Utils.debug.error('Invalid day parameter:', day);
      return null;
    }
    
    try {
      return await Store.getAudioNote(validDay);
    } catch (error) {
      Utils.debug.error('Error getting audio note:', error);
      return null;
    }
  }

  /**
   * Delete audio note
   */
  async function deleteAudioNote(day) {
    const validDay = Utils.validateDay(day);
    if (!validDay) {
      Utils.debug.error('Invalid day parameter:', day);
      return false;
    }
    
    try {
      await Store.deleteAudioNote(validDay);
      Toast.success('Audio note deleted');
      updateUI('deleted', { day: validDay });
      return true;
    } catch (error) {
      Utils.debug.error('Error deleting audio note:', error);
      Toast.error('Failed to delete audio note');
      return false;
    }
  }

  /**
   * Get audio duration from blob
   */
  function getAudioDuration(audioBlob) {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };

      audio.src = url;
    });
  }

  /**
   * Format duration in MM:SS
   */
  function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format file size
   */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Update UI state
   */
  function updateUI(state, data = {}) {
    const event = new CustomEvent('audio-state-changed', {
      detail: { state, ...data }
    });
    window.dispatchEvent(event);
  }

  /**
   * Render audio controls for a specific day
   */
  async function renderAudioControls(containerId, day) {
    const validDay = Utils.validateDay(day);
    if (!validDay) {
      Utils.debug.error('Invalid day parameter:', day);
      return;
    }
    
    const container = document.getElementById(containerId);
    if (!container) {
      Utils.debug.error('Container not found:', containerId);
      return;
    }

    const audioNote = await getAudioNote(validDay);

    if (!isSupported()) {
      container.innerHTML = `
        <div class="audio-controls-unsupported">
          <p class="text-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Audio recording is not supported in your browser.
          </p>
        </div>
      `;
      return;
    }
    
    if (audioNote) {
      renderPlaybackControls(container, audioNote, validDay);
    } else {
      renderRecordingControls(container, validDay);
    }
  }

  /**
   * Render recording controls
   */
  function renderRecordingControls(container, day) {
    container.innerHTML = `
      <div class="audio-controls" id="audio-controls-${day}">
        <button 
          class="btn btn-secondary audio-record-btn" 
          id="start-recording-${day}"
          aria-label="Start recording audio note"
          data-day="${day}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <span>Record Audio Note</span>
        </button>
        <p class="audio-hint">Add a voice reflection for this day (max 5 minutes)</p>
      </div>
    `;

    const recordBtn = document.getElementById(`start-recording-${day}`);
    if (recordBtn) {
      recordBtn.addEventListener('click', async () => {
        const hasPermission = await requestPermission();
        if (hasPermission) {
          await startRecording(day);
        }
      });
    }
  }

  /**
   * Render recording in progress
   */
  function renderRecordingInProgress(container, day, elapsed = 0) {
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const remainingSeconds = Math.floor((MAX_DURATION_MS - elapsed) / 1000);

    container.innerHTML = `
      <div class="audio-controls recording" id="audio-controls-${day}">
        <div class="recording-indicator">
          <span class="recording-dot"></span>
          <span class="recording-time">${formatDuration(elapsedSeconds)}</span>
        </div>
        <div class="recording-progress">
          <div class="recording-progress-bar">
            <div class="recording-progress-fill" style="width: ${(elapsed / MAX_DURATION_MS) * 100}%"></div>
          </div>
          <span class="recording-remaining">${formatDuration(remainingSeconds)} remaining</span>
        </div>
        <div class="recording-actions">
          <button 
            class="btn btn-secondary btn-sm" 
            id="cancel-recording-${day}"
            aria-label="Cancel recording">
            Cancel
          </button>
          <button 
            class="btn btn-primary" 
            id="stop-recording-${day}"
            aria-label="Stop recording">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
            <span>Stop & Save</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById(`stop-recording-${day}`)?.addEventListener('click', () => {
      stopRecording();
    });

    document.getElementById(`cancel-recording-${day}`)?.addEventListener('click', () => {
      cancelRecording();
    });
  }

  /**
   * Render playback controls
   */
  function renderPlaybackControls(container, audioNote, day) {
    // Revoke existing blob URL if present to prevent memory leaks
    const existingAudio = document.getElementById(`audio-player-${day}`);
    if (existingAudio && existingAudio.src && existingAudio.src.startsWith('blob:')) {
      URL.revokeObjectURL(existingAudio.src);
    }
    
    const url = URL.createObjectURL(audioNote.blob);
    const createdDate = new Date(audioNote.createdAt);
    
    container.innerHTML = `
      <div class="audio-controls playback" id="audio-controls-${day}">
        <div class="audio-player-wrapper">
          <audio controls class="audio-player" aria-label="Audio note playback" id="audio-player-${day}">
            <source src="${url}" type="${audioNote.mimeType || 'audio/webm'}">
            Your browser doesn't support audio playback.
          </audio>
        </div>
        <div class="audio-meta">
          <div class="audio-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="audio-duration">${formatDuration(audioNote.duration)}</span>
          </div>
          <div class="audio-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span class="audio-date">${createdDate.toLocaleDateString()}</span>
          </div>
          <div class="audio-info">
            <span class="audio-size">${formatSize(audioNote.size)}</span>
          </div>
        </div>
        <div class="audio-actions">
          <button 
            class="btn btn-link btn-sm" 
            id="delete-audio-${day}"
            aria-label="Delete audio note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
          <button 
            class="btn btn-secondary btn-sm" 
            id="re-record-${day}"
            aria-label="Record new audio note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
            </svg>
            Re-record
          </button>
        </div>
      </div>
    `;

    // Clean up the blob URL when audio is no longer needed
    const audioPlayer = document.getElementById(`audio-player-${day}`);
    if (audioPlayer) {
      audioPlayer.addEventListener('ended', () => {
        // Optional: could auto-cleanup here
      });
      
      // Add observer to cleanup blob URL when audio element is removed from DOM
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node.id === `audio-controls-${day}` || 
                (node.querySelector && node.querySelector(`#audio-controls-${day}`))) {
              URL.revokeObjectURL(url);
              observer.disconnect();
            }
          });
        });
      });
      
      // Observe the container's parent for removed nodes
      if (container.parentElement) {
        observer.observe(container.parentElement, { childList: true, subtree: true });
      }
    }

    document.getElementById(`delete-audio-${day}`)?.addEventListener('click', async () => {
      const confirmed = await Modal.confirm({
        title: 'Delete Audio Note',
        message: 'Are you sure you want to delete this audio note? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      });

      if (confirmed) {
        URL.revokeObjectURL(url);
        await deleteAudioNote(day);
        renderAudioControls(container.id, day);
      }
    });

    document.getElementById(`re-record-${day}`)?.addEventListener('click', async () => {
      const confirmed = await Modal.confirm({
        title: 'Re-record Audio Note',
        message: 'Recording a new audio note will replace the current one. Continue?',
        confirmText: 'Re-record',
        cancelText: 'Cancel'
      });

      if (confirmed) {
        URL.revokeObjectURL(url);
        await deleteAudioNote(day);
        renderRecordingControls(container, day);
      }
    });
  }

  // Listen for audio state changes to update UI
  window.addEventListener('audio-state-changed', (event) => {
    const { state, day, elapsed } = event.detail;
    const container = document.getElementById('audio-container');
    
    if (!container) return;

    if (state === 'recording') {
      renderRecordingInProgress(container, day, elapsed || 0);
    } else if (state === 'saved' || state === 'deleted') {
      renderAudioControls(container.id, day);
    } else if (state === 'cancelled') {
      renderRecordingControls(container, day);
    }
  });

  /**
   * FIXED: Cleanup all audio blob URLs to prevent memory leaks
   */
  function cleanupAllBlobUrls() {
    document.querySelectorAll('audio').forEach(audioElement => {
      if (audioElement.src && audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioElement.src);
        audioElement.src = '';
      }
    });
  }

  return {
    init,
    isSupported,
    canRecord,
    requestPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    getAudioNote,
    deleteAudioNote,
    renderAudioControls,
    isRecording: () => isRecording,
    formatDuration,
    formatSize,
    cleanupAllBlobUrls  // Expose cleanup function
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioNotes;
}
