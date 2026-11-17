// The game's rules and state, with no drawing and no browser in it: the moths'
// winding path, the build pads, the lantern towers, the projectiles, the
// embers and the eight waves. step() advances one fixed step and returns what
// happened as bit flags, so the caller can react without the world knowing
// about screens or sound. Nothing here allocates after createWorld returns.

import {
  FIELD, HEART, HEART_HP, MOTHS, PADS, PATH, POOL, START_EMBERS,
  TOWERS, UPGRADE, WAVE_BONUS, WAVE_SCALE, WAVES, SELL_REFUND,
} from './config.js';

export const EVENT_KILL = 1;
export const EVENT_LEAK = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WON = 8;
export const EVENT_LOST = 16;
export const EVENT_BUILD = 32;

export const PHASE_BUILD = 'build';
export const PHASE_WAVE = 'wave';
export const PHASE_WON = 'won';
export const PHASE_LOST = 'lost';

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Where a moth is along the path: segment index + distance into it. */
function pathPoint(at) {
  let remaining = at;
  for (let i = 0; i < PATH.length - 1; i += 1) {
    const a = PATH[i];
    const b = PATH[i + 1];
    const len = distance(a.x, a.y, b.x, b.y);
    if (remaining <= len) {
      const t = len === 0 ? 0 : remaining / len;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, segment: i };
    }
    remaining -= len;
  }
  const last = PATH[PATH.length - 1];
  return { x: last.x, y: last.y, segment: PATH.length - 2 };
}

export function pathLength() {
  let total = 0;
  for (let i = 0; i < PATH.length - 1; i += 1) total += distance(PATH[i].x, PATH[i].y, PATH[i + 1].x, PATH[i + 1].y);
  return total;
}

export function createWorld(random) {
  const towers = [];
  for (let i = 0; i < PADS.length; i += 1) {
    towers.push({ pad: i, type: null, level: 0, spent: 0, cooldown: 0, angle: -Math.PI / 2, flash: 0 });
  }
  const moths = [];
  for (let i = 0; i < POOL.moths; i += 1) {
    moths.push({
      active: false, kind: 'flutter', x: 0, y: 0, hp: 1, maxHp: 1, speed: 0,
      along: 0, reward: 0, score: 0, leak: 1, radius: 10, slowUntil: 0, slowFactor: 1,
      wobble: 0, wobbleSpeed: 0, spawnTimer: 0, segment: 0,
    });
  }
  const projectiles = [];
  for (let i = 0; i < POOL.projectiles; i += 1) {
    projectiles.push({ active: false, x: 0, y: 0, target: null, speed: 0, damage: 0, type: null, slow: 0, slowTime: 0, splash: 0 });
  }
  const particles = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: '#ffffff' });
  }
  const texts = [];
  for (let i = 0; i < POOL.texts; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, maxLife: 0, text: '', color: '#ffffff' });
  }

  const state = {
    towers, moths, projectiles, particles, texts,
    phase: PHASE_BUILD,
    wave: 0,
    embers: START_EMBERS,
    heartHp: HEART_HP,
    score: 0,
    kills: 0,
    elapsed: 0,
    spawnQueue: [],
    spawnTimer: 0,
    selectedPad: -1,
    selectedType: 'ember',
    message: '',
    messageTimer: 0,
  };

  function free(pool) {
    for (let i = 0; i < pool.length; i += 1) if (!pool[i].active) return pool[i];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const p = free(particles);
      if (p === null) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      p.active = true;
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.maxLife = 0.4 + random() * 0.4;
      p.life = p.maxLife;
      p.size = 2 + random() * 3;
      p.color = color;
    }
  }

  function floatText(x, y, text, color) {
    const t = free(texts);
    if (t === null) return;
    t.active = true;
    t.x = x; t.y = y;
    t.maxLife = 1.1;
    t.life = t.maxLife;
    t.text = text;
    t.color = color;
  }

  function reset() {
    for (const tower of towers) {
      tower.type = null; tower.level = 0; tower.spent = 0; tower.cooldown = 0; tower.flash = 0;
    }
    for (const moth of moths) moth.active = false;
    for (const shot of projectiles) shot.active = false;
    for (const p of particles) p.active = false;
    for (const t of texts) t.active = false;
    state.phase = PHASE_BUILD;
    state.wave = 0;
    state.embers = START_EMBERS;
    state.heartHp = HEART_HP;
    state.score = 0;
    state.kills = 0;
    state.elapsed = 0;
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.selectedPad = -1;
    state.selectedType = 'ember';
    state.message = 'Build lanterns, then press Space to start wave 1.';
    state.messageTimer = 4;
  }

  function towerStats(tower) {
    const base = TOWERS[tower.type];
    const level = tower.level;
    return {
      damage: Math.round(base.damage * UPGRADE.damageFactor[level - 1]),
      rate: base.rate,
      range: base.range * UPGRADE.rangeFactor[level - 1],
    };
  }

  /** The embers to upgrade the tower on pad `padIndex` (null when it cannot be upgraded). */
  function upgradeCost(padIndex) {
    const tower = towers[padIndex];
    if (tower === undefined || tower.type === null || tower.level >= UPGRADE.maxLevel) return null;
    return Math.round(TOWERS[tower.type].cost * UPGRADE.costFactor[tower.level]);
  }

  /** Build a tower of `type` on an empty pad; false when the pad is taken or the embers fall short. */
  function buildTower(padIndex, type) {
    const tower = towers[padIndex];
    if (!tower || tower.type !== null) return false;
    const base = TOWERS[type];
    if (!base || state.embers < base.cost) return false;
    state.embers -= base.cost;
    tower.type = type;
    tower.level = 1;
    tower.spent = base.cost;
    tower.cooldown = 0;
    state.selectedPad = padIndex;
    burst(PADS[padIndex].x, PADS[padIndex].y, base.glow, 14, 90);
    return true;
  }

  function upgradeTower(padIndex) {
    const tower = towers[padIndex];
    if (tower === undefined || tower.type === null) return false;
    const cost = upgradeCost(padIndex);
    if (cost === null || state.embers < cost) return false;
    state.embers -= cost;
    tower.level += 1;
    tower.spent += cost;
    burst(PADS[padIndex].x, PADS[padIndex].y, TOWERS[tower.type].glow, 18, 110);
    return true;
  }

  function sellTower(padIndex) {
    const tower = towers[padIndex];
    if (!tower || tower.type === null) return false;
    state.embers += Math.round(tower.spent * SELL_REFUND);
    tower.type = null;
    tower.level = 0;
    tower.spent = 0;
    if (state.selectedPad === padIndex) state.selectedPad = -1;
    return true;
  }

  function startWave() {
    if (state.phase !== PHASE_BUILD) return false;
    state.wave += 1;
    state.phase = PHASE_WAVE;
    state.spawnQueue = [];
    for (const [kind, count, gap] of WAVES[state.wave - 1]) {
      for (let i = 0; i < count; i += 1) state.spawnQueue.push({ kind, delay: gap });
    }
    state.spawnTimer = 0.6;
    state.message = `Wave ${state.wave} of ${WAVES.length} — hold the light!`;
    state.messageTimer = 2.5;
    return true;
  }

  function spawnMoth(kind) {
    const moth = free(moths);
    if (moth === null) return;
    const def = MOTHS[kind];
    const scale = WAVE_SCALE(state.wave);
    moth.active = true;
    moth.kind = kind;
    moth.along = 0;
    const start = pathPoint(0);
    moth.x = start.x;
    moth.y = start.y;
    moth.maxHp = Math.round(def.hp * scale.hp);
    moth.hp = moth.maxHp;
    moth.speed = def.speed * scale.speed;
    moth.reward = def.reward;
    moth.score = def.score;
    moth.leak = def.leak;
    moth.radius = def.radius;
    moth.slowUntil = 0;
    moth.slowFactor = 1;
    moth.wobble = random() * Math.PI * 2;
    moth.wobbleSpeed = 2 + random() * 3;
    moth.spawnTimer = 0;
    moth.segment = 0;
  }

  function killMoth(moth) {
    moth.active = false;
    state.kills += 1;
    state.embers += moth.reward;
    state.score += moth.score;
    burst(moth.x, moth.y, MOTHS[moth.kind].color, 10, 120);
    floatText(moth.x, moth.y - 14, `+${moth.reward}`, '#ffcf5e');
  }

  function damageMoth(moth, damage, type, slow, slowTime, splash) {
    moth.hp -= damage;
    if (slow > 0) {
      moth.slowFactor = Math.min(moth.slowFactor, 1 - slow);
      moth.slowUntil = state.elapsed + slowTime;
    }
    if (splash > 0) {
      for (const other of moths) {
        if (!other.active || other === moth) continue;
        if (distance(other.x, other.y, moth.x, moth.y) <= splash) other.hp -= Math.round(damage * 0.6);
      }
    }
    if (moth.hp <= 0) killMoth(moth);
  }

  function fireTower(tower, dt) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) return;
    const pad = PADS[tower.pad];
    const stats = towerStats(tower);
    let target = null;
    let bestAlong = -1;
    for (const moth of moths) {
      if (!moth.active) continue;
      if (distance(moth.x, moth.y, pad.x, pad.y) > stats.range) continue;
      if (moth.along > bestAlong) {
        bestAlong = moth.along;
        target = moth;
      }
    }
    if (target === null) return;
    const shot = free(projectiles);
    if (shot === null) return;
    const base = TOWERS[tower.type];
    shot.active = true;
    shot.x = pad.x;
    shot.y = pad.y - 18;
    shot.target = target;
    shot.speed = base.projectileSpeed;
    shot.damage = stats.damage;
    shot.type = tower.type;
    shot.slow = base.slow ?? 0;
    shot.slowTime = base.slowTime ?? 0;
    shot.splash = base.splash ?? 0;
    tower.angle = Math.atan2(target.y - (pad.y - 18), target.x - pad.x);
    tower.flash = 0.12;
    tower.cooldown = 1 / stats.rate;
  }

  /** One fixed step. Returns EVENT_* flags for the caller (sound, announcements). */
  function step(dt) {
    let events = 0;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer = Math.max(0, state.messageTimer - dt);

    for (const tower of towers) if (tower.flash > 0) tower.flash = Math.max(0, tower.flash - dt);
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    for (const t of texts) {
      if (!t.active) continue;
      t.life -= dt;
      t.y -= 28 * dt;
      if (t.life <= 0) t.active = false;
    }

    if (state.phase !== PHASE_WAVE) return events;

    // Spawn the wave's queue, one moth per gap.
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        const next = state.spawnQueue.shift();
        spawnMoth(next.kind);
        state.spawnTimer = next.delay;
      }
    }

    // Towers fire at the moth furthest along the path within range.
    for (const tower of towers) if (tower.type !== null) fireTower(tower, dt);

    // Projectiles chase their target; a lost target flies on and fizzles.
    for (const shot of projectiles) {
      if (!shot.active) continue;
      if (shot.target === null || !shot.target.active) { shot.active = false; continue; }
      const dx = shot.target.x - shot.x;
      const dy = shot.target.y - shot.y;
      const dist = Math.hypot(dx, dy);
      const move = shot.speed * dt;
      if (dist <= move + shot.target.radius * 0.5) {
        const target = shot.target;
        shot.active = false;
        burst(target.x, target.y, TOWERS[shot.type].glow, 5, 70);
        damageMoth(target, shot.damage, shot.type, shot.slow, shot.slowTime, shot.splash);
        if (!target.active) events |= EVENT_KILL;
      } else {
        shot.x += (dx / dist) * move;
        shot.y += (dy / dist) * move;
      }
    }

    // Moths walk the path; the queen drops flutter moths behind her.
    const total = pathLength();
    for (const moth of moths) {
      if (!moth.active) continue;
      if (moth.slowUntil > 0 && state.elapsed > moth.slowUntil) moth.slowFactor = 1;
      const speed = moth.speed * moth.slowFactor;
      moth.along += speed * dt;
      moth.wobble += moth.wobbleSpeed * dt;
      const point = pathPoint(moth.along);
      let ox = 0;
      let oy = 0;
      if (moth.kind === 'dart') {
        const wob = Math.sin(moth.wobble) * 14;
        ox = -wob * 0.4;
        oy = wob;
      }
      moth.x = point.x + ox;
      moth.y = point.y + oy;
      moth.segment = point.segment;
      if (moth.kind === 'queen') {
        moth.spawnTimer -= dt;
        if (moth.spawnTimer <= 0) {
          moth.spawnTimer = 3;
          spawnMoth('flutter');
        }
      }
      if (moth.along >= total) {
        moth.active = false;
        state.heartHp -= moth.leak;
        burst(HEART.x, HEART.y, '#ff6b5e', 16, 140);
        floatText(HEART.x, HEART.y - 44, `-${moth.leak} heart`, '#ff6b5e');
        events |= EVENT_LEAK;
        if (state.heartHp <= 0) {
          state.heartHp = 0;
          state.phase = PHASE_LOST;
          events |= EVENT_LOST;
          return events;
        }
      }
    }

    // Any moth that died to splash damage still pays out.
    for (const moth of moths) {
      if (moth.active && moth.hp <= 0) {
        killMoth(moth);
        events |= EVENT_KILL;
      }
    }

    // Wave clear: nothing left to spawn and nothing alive.
    const anyAlive = moths.some((m) => m.active);
    if (state.spawnQueue.length === 0 && !anyAlive) {
      const bonus = WAVE_BONUS(state.wave);
      state.embers += bonus;
      state.score += state.wave * 50;
      floatText(HEART.x, HEART.y - 70, `Wave clear! +${bonus} embers`, '#ffcf5e');
      events |= EVENT_WAVE_CLEAR;
      if (state.wave >= WAVES.length) {
        state.phase = PHASE_WON;
        events |= EVENT_WON;
      } else {
        state.phase = PHASE_BUILD;
        state.message = `Wave ${state.wave} cleared! Build, upgrade, then press Space for wave ${state.wave + 1}.`;
        state.messageTimer = 4;
      }
    }
    return events;
  }

  reset();
  return {
    state, reset, step, buildTower, upgradeTower, sellTower, startWave,
    upgradeCost, towerStats, pathLength,
  };
}
