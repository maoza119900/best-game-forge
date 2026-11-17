// Lanternkeep: every tuning number, colour and wave table in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The heart lantern's hit points. A moth that reaches it deals its `leak` damage. */
export const HEART_HP = 20;

/** Embers the player starts with, and the wave-clear bonus. */
export const START_EMBERS = 130;
export const WAVE_BONUS = (wave) => 20 + wave * 10;

/** The moths' winding path across the island, from off-screen left to the heart. */
export const PATH = [
  { x: -40, y: 130 },
  { x: 300, y: 130 },
  { x: 300, y: 310 },
  { x: 690, y: 310 },
  { x: 690, y: 530 },
  { x: 1010, y: 530 },
  { x: 1010, y: 360 },
  { x: 1130, y: 360 },
];

export const HEART = { x: 1130, y: 360, radius: 34 };

/** Stone pads where lantern towers can be built (x, y, radius). */
export const PADS = [
  { x: 150, y: 230, r: 30 },
  { x: 420, y: 210, r: 30 },
  { x: 420, y: 420, r: 30 },
  { x: 560, y: 210, r: 30 },
  { x: 800, y: 210, r: 30 },
  { x: 800, y: 420, r: 30 },
  { x: 560, y: 620, r: 30 },
  { x: 880, y: 620, r: 30 },
  { x: 1120, y: 210, r: 30 },
  { x: 1120, y: 620, r: 30 },
];

/** Tower types: cost, damage, shots per second, range, and what makes each one special. */
export const TOWERS = {
  ember: {
    name: 'Ember',
    key: 'ember',
    cost: 50,
    damage: 12,
    rate: 2.2,
    range: 135,
    projectileSpeed: 460,
    color: '#ffb347',
    glow: '#ff8c1a',
    blurb: 'Fast, cheap shots',
  },
  frost: {
    name: 'Frost',
    key: 'frost',
    cost: 70,
    damage: 5,
    rate: 1.2,
    range: 125,
    projectileSpeed: 380,
    color: '#7dd7ff',
    glow: '#3aa7e8',
    slow: 0.45,
    slowTime: 1.4,
    blurb: 'Chills moths, slows them',
  },
  gale: {
    name: 'Gale',
    key: 'gale',
    cost: 90,
    damage: 20,
    rate: 0.7,
    range: 115,
    projectileSpeed: 340,
    color: '#b8ff9e',
    glow: '#6fd64a',
    splash: 60,
    blurb: 'Splash damage in a burst',
  },
};

/** Upgrade multipliers per level (level 1 is the base tower). */
export const UPGRADE = {
  costFactor: [0, 0.6, 0.9],
  damageFactor: [1, 1.6, 2.6],
  rangeFactor: [1, 1.12, 1.25],
  maxLevel: 3,
};

/** Selling a tower refunds this share of everything spent on it. */
export const SELL_REFUND = 0.7;

/** Moth kinds: hit points, speed, ember reward, score, damage on reaching the heart. */
export const MOTHS = {
  flutter: { name: 'Flutter', hp: 30, speed: 58, reward: 6, score: 10, leak: 1, radius: 11, color: '#c9a7ff' },
  dart: { name: 'Dart', hp: 24, speed: 98, reward: 8, score: 15, leak: 1, radius: 9, color: '#ff9ed2' },
  bulwark: { name: 'Bulwark', hp: 150, speed: 34, reward: 14, score: 25, leak: 2, radius: 16, color: '#8f7bff' },
  queen: { name: 'Moth Queen', hp: 1150, speed: 27, reward: 150, score: 500, leak: 5, radius: 30, color: '#ffd76a' },
};

/**
 * The eight waves. Each entry is a list of groups: [kind, count, gapSeconds].
 * Difficulty grows in count, speed and hit points through the wave multiplier.
 */
export const WAVES = [
  [['flutter', 6, 1.1]],
  [['flutter', 9, 0.9], ['dart', 3, 1.2]],
  [['flutter', 10, 0.8], ['bulwark', 2, 2.2], ['dart', 4, 1.0]],
  [['dart', 8, 0.8], ['flutter', 10, 0.7], ['bulwark', 3, 2.0]],
  [['bulwark', 5, 1.8], ['dart', 10, 0.7], ['flutter', 12, 0.6]],
  [['flutter', 16, 0.55], ['bulwark', 6, 1.6], ['dart', 12, 0.6]],
  [['bulwark', 8, 1.5], ['dart', 14, 0.55], ['flutter', 14, 0.5]],
  [['queen', 1, 0.5], ['flutter', 10, 0.7], ['bulwark', 4, 1.8], ['dart', 8, 0.6]],
];

/** Per-wave scaling of moth hit points and speed (wave 1 is the baseline). */
export const WAVE_SCALE = (wave) => ({
  hp: 1 + (wave - 1) * 0.3,
  speed: 1 + (wave - 1) * 0.06,
});

/** How many moths can exist at once; the pools are allocated once, at boot. */
export const POOL = { moths: 72, projectiles: 96, particles: 256, texts: 32 };

export const PALETTE = {
  sea: '#0b2233',
  seaDeep: '#071826',
  island: '#173d33',
  islandEdge: '#2c6b52',
  path: '#c9a86a',
  pathEdge: '#8a6f3e',
  pad: '#3d4a5c',
  padEdge: '#6b7d94',
  heart: '#ffd76a',
  text: '#f4ead2',
  muted: '#9db8a6',
  panel: '#122b22',
  panelEdge: '#2c6b52',
  danger: '#ff6b5e',
  gold: '#ffcf5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lanternkeep.best';
