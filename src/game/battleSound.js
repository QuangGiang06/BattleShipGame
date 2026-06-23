let audioContext;

function getAudioContext() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  audioContext ??= new AudioContextClass();
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function createNoiseBuffer(context, duration) {
  const length = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < length; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }

  return buffer;
}

function playTone(context, {
  start,
  duration,
  frequency,
  endFrequency = frequency,
  gain = 0.12,
  type = 'sine',
}) {
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  volume.gain.setValueAtTime(gain, start);
  volume.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(volume).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function playNoise(context, {
  start,
  duration,
  gain = 0.16,
  filterFrequency = 1000,
  filterType = 'lowpass',
}) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const volume = context.createGain();
  source.buffer = createNoiseBuffer(context, duration);
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFrequency, start);
  volume.gain.setValueAtTime(gain, start);
  volume.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.connect(filter).connect(volume).connect(context.destination);
  source.start(start);
}

export function playBattleSound(kind, enabled = true) {
  if (!enabled) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;

  if (kind === 'launch') {
    playTone(context, {
      start: now,
      duration: 0.3,
      frequency: 180,
      endFrequency: 55,
      gain: 0.15,
      type: 'sawtooth',
    });
    playNoise(context, {
      start: now,
      duration: 0.18,
      gain: 0.1,
      filterFrequency: 700,
    });
    return;
  }

  if (kind === 'miss') {
    playNoise(context, {
      start: now,
      duration: 0.45,
      gain: 0.13,
      filterFrequency: 1700,
      filterType: 'bandpass',
    });
    playTone(context, {
      start: now,
      duration: 0.35,
      frequency: 500,
      endFrequency: 170,
      gain: 0.05,
    });
    return;
  }

  if (kind === 'hit' || kind === 'sunk') {
    playNoise(context, {
      start: now,
      duration: kind === 'sunk' ? 0.75 : 0.48,
      gain: kind === 'sunk' ? 0.24 : 0.19,
      filterFrequency: 800,
    });
    playTone(context, {
      start: now,
      duration: kind === 'sunk' ? 0.75 : 0.42,
      frequency: kind === 'sunk' ? 95 : 130,
      endFrequency: 35,
      gain: kind === 'sunk' ? 0.2 : 0.15,
      type: 'square',
    });
  }
}
