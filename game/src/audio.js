// Synthesized sound, no audio files: short WebAudio blips for every action.
// Created lazily on the first user gesture, so browsers allow it; muted with M.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** A single tone: frequency, seconds, waveform, volume, and an optional slide. */
  function tone(freq, seconds, type, volume, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + seconds);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + seconds);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    shoot() { tone(720, 0.07, 'square', 0.04, 420); },
    hit() { tone(190, 0.08, 'triangle', 0.06, 120); },
    coin() { tone(880, 0.12, 'sine', 0.07, 1320); },
    build() { tone(330, 0.14, 'triangle', 0.08, 520); },
    upgrade() { tone(520, 0.18, 'sine', 0.08, 940); },
    horn() { tone(196, 0.5, 'sawtooth', 0.07, 262); tone(262, 0.5, 'sawtooth', 0.05, 392); },
    leak() { tone(140, 0.3, 'sawtooth', 0.09, 70); },
    win() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        window.setTimeout(() => tone(freq, 0.28, 'sine', 0.08), i * 130);
      });
    },
    lose() {
      [392, 330, 262, 196].forEach((freq, i) => {
        window.setTimeout(() => tone(freq, 0.32, 'triangle', 0.08), i * 150);
      });
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() { return muted; },
  };
}
