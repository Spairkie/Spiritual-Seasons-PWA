/**
 * Enhanced Ambient Sound Module
 * Background soundscapes for meditation and reflection
 */

const AmbientSound = (() => {
  let audioContext = null;
  let currentSounds = new Map();
  let currentPreset = 'silence';
  let masterVolume = 0.5;
  let isPlaying = false;
  let autoMode = false;

  const PRESETS = {
    silence: {
      name: 'Silence',
      sounds: []
    },
    winter: {
      name: 'Winter Breeze',
      sounds: [
        { type: 'wind', volume: 0.4, frequency: 180 },
        { type: 'chimes', volume: 0.2, frequency: 440 }
      ]
    },
    spring: {
      name: 'Spring Garden',
      sounds: [
        { type: 'birds', volume: 0.3, frequency: 880 },
        { type: 'breeze', volume: 0.2, frequency: 220 }
      ]
    },
    summer: {
      name: 'Summer Warmth',
      sounds: [
        { type: 'crickets', volume: 0.3, frequency: 4000 },
        { type: 'breeze', volume: 0.15, frequency: 200 }
      ]
    },
    autumn: {
      name: 'Autumn Rustling',
      sounds: [
        { type: 'leaves', volume: 0.35, frequency: 150 },
        { type: 'wind', volume: 0.25, frequency: 160 }
      ]
    },
    rain: {
      name: 'Gentle Rain',
      sounds: [
        { type: 'rain', volume: 0.4, frequency: 8000 }
      ]
    },
    ocean: {
      name: 'Ocean Waves',
      sounds: [
        { type: 'waves', volume: 0.4, frequency: 100 }
      ]
    },
    forest: {
      name: 'Deep Forest',
      sounds: [
        { type: 'birds', volume: 0.25, frequency: 800 },
        { type: 'leaves', volume: 0.3, frequency: 140 }
      ]
    },
    night: {
      name: 'Peaceful Night',
      sounds: [
        { type: 'crickets', volume: 0.3, frequency: 3800 }
      ]
    },
    whitenoise: {
      name: 'White Noise',
      sounds: [
        { type: 'whitenoise', volume: 0.3, frequency: 440 }
      ]
    },
    auto: {
      name: 'Auto (Season-based)',
      sounds: []
    }
  };

  async function init() {
    try {
      const settings = await Store.getSettings();
      const savedPreset = settings.ambientSound || 'silence';
      const savedVolume = settings.ambientVolume !== undefined ? settings.ambientVolume : 0.5;
      
      masterVolume = savedVolume;
      
      if (savedPreset === 'auto') {
        autoMode = true;
        currentPreset = await getSeasonalPreset();
      } else {
        autoMode = false;
        currentPreset = savedPreset;
      }
      
      setupSeasonChangeListener();
      return true;
    } catch (error) {
      console.error('Ambient sound init error:', error);
      return false;
    }
  }

  async function getSeasonalPreset() {
    try {
      const currentSeason = await Store.getCurrentSeason();
      return currentSeason || 'silence';
    } catch (error) {
      return 'silence';
    }
  }

  function setupSeasonChangeListener() {
    if (typeof Router !== 'undefined') {
      Router.onChange(async (route, params) => {
        if (autoMode && route === 'devotional' && params.day) {
          const season = Devotional.getSeasonForDay(params.day);
          if (season && season.id !== currentPreset && PRESETS[season.id]) {
            await changePreset(season.id, true);
          }
        }
      });
    }
  }

  function createSound(type, frequency, baseVolume) {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(baseVolume * masterVolume, audioContext.currentTime);
    
    let source;

    switch (type) {
      case 'wind':
      case 'breeze':
        source = createWindSound(frequency);
        break;
      case 'rain':
        source = createRainSound();
        break;
      case 'waves':
        source = createWavesSound();
        break;
      case 'birds':
        source = createBirdsSound(frequency);
        break;
      case 'crickets':
        source = createCricketsSound(frequency);
        break;
      case 'leaves':
        source = createLeavesSound(frequency);
        break;
      case 'chimes':
        source = createChimesSound(frequency);
        break;
      case 'whitenoise':
        source = createWhiteNoise();
        break;
      default:
        source = createGenericSound(frequency);
    }

    if (source) {
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (source.start) {
        source.start(audioContext.currentTime);
      }
    }

    return { source, gainNode, type };
  }

  function createWindSound(baseFreq) {
    const oscillator = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
    
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1, audioContext.currentTime);
    lfoGain.gain.setValueAtTime(20, audioContext.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    lfo.start();
    
    return oscillator;
  }

  function createRainSound() {
    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8000, audioContext.currentTime);
    filter.Q.setValueAtTime(0.5, audioContext.currentTime);
    
    source.connect(filter);
    return filter;
  }

  function createWavesSound() {
    const oscillator = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
    
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.2, audioContext.currentTime);
    lfoGain.gain.setValueAtTime(30, audioContext.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    lfo.start();
    
    return oscillator;
  }

  function createBirdsSound(freq) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(4, audioContext.currentTime);
    lfoGain.gain.setValueAtTime(100, audioContext.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    lfo.start();
    
    return oscillator;
  }

  function createCricketsSound(freq) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(8, audioContext.currentTime);
    lfoGain.gain.setValueAtTime(200, audioContext.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    lfo.start();
    
    return oscillator;
  }

  function createLeavesSound(freq) {
    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, audioContext.currentTime);
    
    source.connect(filter);
    return filter;
  }

  function createChimesSound(freq) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    return oscillator;
  }

  function createWhiteNoise() {
    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  function createGenericSound(freq) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    return oscillator;
  }

  async function play(presetName = currentPreset, isAutoChange = false) {
    try {
      await stop();

      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      if (presetName === 'auto') {
        autoMode = true;
        presetName = await getSeasonalPreset();
        if (!isAutoChange) {
          await Store.saveSetting('ambientSound', 'auto');
        }
      } else {
        autoMode = false;
        if (!isAutoChange) {
          await Store.saveSetting('ambientSound', presetName);
        }
      }

      if (presetName === 'silence') {
        currentPreset = 'silence';
        isPlaying = false;
        return;
      }

      const preset = PRESETS[presetName];
      if (!preset || !preset.sounds || preset.sounds.length === 0) {
        return;
      }

      currentPreset = presetName;

      preset.sounds.forEach(soundConfig => {
        const sound = createSound(soundConfig.type, soundConfig.frequency, soundConfig.volume);
        if (sound) {
          currentSounds.set(soundConfig.type + '_' + soundConfig.frequency, sound);
        }
      });

      isPlaying = true;
      fadeIn();
      
    } catch (error) {
      console.error('Play error:', error);
    }
  }

  async function stop() {
    try {
      currentSounds.forEach(({ source, gainNode }) => {
        try {
          if (gainNode && audioContext) {
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          }
          if (source && source.stop) {
            source.stop();
          }
        } catch (e) {
          // Already stopped
        }
      });

      currentSounds.clear();
      isPlaying = false;
    } catch (error) {
      console.error('Stop error:', error);
    }
  }

  function fadeIn() {
    if (!audioContext) return;
    
    currentSounds.forEach(({ gainNode }) => {
      if (gainNode) {
        const currentValue = gainNode.gain.value;
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(currentValue, audioContext.currentTime + 2);
      }
    });
  }

  function fadeOut(callback) {
    if (!audioContext) {
      if (callback) callback();
      return;
    }
    
    currentSounds.forEach(({ gainNode }) => {
      if (gainNode) {
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
      }
    });

    setTimeout(() => {
      if (callback) callback();
    }, 1000);
  }

  async function setVolume(vol) {
    masterVolume = Math.max(0, Math.min(1, vol));
    await Store.saveSetting('ambientVolume', masterVolume);
    
    if (!audioContext) return;
    
    currentSounds.forEach(({ gainNode }, key) => {
      if (gainNode) {
        const preset = PRESETS[currentPreset];
        const soundType = key.split('_')[0];
        const soundConfig = preset?.sounds?.find(s => s.type === soundType);
        const baseVolume = soundConfig?.volume || 0.3;
        gainNode.gain.setValueAtTime(baseVolume * masterVolume, audioContext.currentTime);
      }
    });
  }

  async function toggle() {
    if (isPlaying) {
      await stop();
    } else {
      await play();
    }
    return isPlaying;
  }

  function getStatus() {
    return {
      isPlaying,
      currentPreset,
      masterVolume,
      autoMode,
      availablePresets: Object.keys(PRESETS)
    };
  }

  async function changePreset(presetName, isAutoChange = false) {
    fadeOut(async () => {
      await play(presetName, isAutoChange);
    });
  }

  function getAvailablePresets() {
    return Object.entries(PRESETS).map(([key, preset]) => ({
      value: key,
      label: preset.name
    }));
  }

  async function cleanup() {
    await stop();
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close();
    }
    audioContext = null;
  }

  return {
    init,
    play,
    stop,
    toggle,
    setVolume,
    changePreset,
    getStatus,
    getAvailablePresets,
    cleanup
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AmbientSound;
}
