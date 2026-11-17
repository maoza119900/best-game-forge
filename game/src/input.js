// Keyboard and pointer input, in logical playfield coordinates.
// Held keys give nothing here (the game is mouse-driven); one-shot presses
// (start wave, pause, restart, mute, tower choice) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost
// and never counted twice. Clicks are queued with their logical position.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_WAVE = 16;
export const ACTION_UPGRADE = 32;
export const ACTION_SELL = 64;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);
const WAVE = new Set(['KeyN']);
const UPGRADE = new Set(['KeyU']);
const SELL = new Set(['KeyX']);
const TOWER_KEYS = { Digit1: 'ember', Digit2: 'frost', Digit3: 'gale' };

export function createInput(canvas) {
  let actions = 0;
  let towerPick = null;
  const clicks = [];

  /** Convert a pointer event to logical playfield coordinates. */
  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (WAVE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_WAVE;
    } else if (UPGRADE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_UPGRADE;
    } else if (SELL.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SELL;
    } else if (TOWER_KEYS[event.code]) {
      towerPick = TOWER_KEYS[event.code];
    } else {
      return;
    }
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    clicks.push(toLogical(event));
    event.preventDefault();
  });
  // Losing the window must not leave a click stuck: clicks are one-shot anyway.
  window.addEventListener('blur', () => {});

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The tower type picked with keys 1/2/3 since the last call, or null. */
    takeTowerPick() {
      const pick = towerPick;
      towerPick = null;
      return pick;
    },
    /** The clicks since the last call, as {x, y} in logical coordinates. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
  };
}
