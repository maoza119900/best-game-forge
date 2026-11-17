// Canvas drawing: the night island, the winding path, the lantern towers,
// the moths, the projectiles and particles, the HUD and shop, and the title,
// pause, victory and defeat screens. Pure drawing: it never changes state.

import { FIELD, FONT, HEART, PADS, PALETTE, PATH, TOWERS, WAVES } from './config.js';
import { PHASE_BUILD, PHASE_LOST, PHASE_WAVE, PHASE_WON } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const SHOP = [
  { type: 'ember', x: 20, y: 648, w: 300, h: 56 },
  { type: 'frost', x: 336, y: 648, w: 300, h: 56 },
  { type: 'gale', x: 652, y: 648, w: 300, h: 56 },
];

export function shopRects() {
  return SHOP;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGlow(x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawIsland(state) {
    // Night sea.
    const sea = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    sea.addColorStop(0, PALETTE.sea);
    sea.addColorStop(1, PALETTE.seaDeep);
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Moon and its shimmer.
    ctx.globalAlpha = 0.9;
    drawGlow(1120, 80, 70, 'rgba(244, 234, 210, 0.35)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f4ead2';
    ctx.beginPath();
    ctx.arc(1120, 80, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180, 175, 150, 0.8)';
    ctx.beginPath();
    ctx.arc(1112, 74, 6, 0, Math.PI * 2);
    ctx.arc(1130, 88, 4, 0, Math.PI * 2);
    ctx.arc(1122, 92, 3, 0, Math.PI * 2);
    ctx.fill();
    // The island.
    ctx.fillStyle = PALETTE.island;
    ctx.beginPath();
    ctx.ellipse(640, 370, 620, 300, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.islandEdge;
    ctx.lineWidth = 4;
    ctx.stroke();
    // The winding path.
    ctx.strokeStyle = PALETTE.pathEdge;
    ctx.lineWidth = 34;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i += 1) ctx.lineTo(PATH[i].x, PATH[i].y);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.path;
    ctx.lineWidth = 26;
    ctx.stroke();
    // Build pads.
    for (let i = 0; i < PADS.length; i += 1) {
      const pad = PADS[i];
      const tower = state.towers[i];
      ctx.fillStyle = tower && tower.type !== null ? PALETTE.padEdge : PALETTE.pad;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, pad.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = state.selectedPad === i ? '#ffcf5e' : PALETTE.padEdge;
      ctx.lineWidth = state.selectedPad === i ? 4 : 2;
      ctx.stroke();
      if (!tower || tower.type === null) {
        ctx.fillStyle = 'rgba(244, 234, 210, 0.45)';
        ctx.font = 'bold 20px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', pad.x, pad.y);
      }
    }
  }

  function drawHeart(state) {
    const pulse = 1 + Math.sin(state.elapsed * 3) * 0.08;
    const hpFrac = Math.max(0, state.heartHp / 20);
    ctx.save();
    ctx.globalAlpha = 0.55 + hpFrac * 0.45;
    drawGlow(HEART.x, HEART.y, 90 * pulse, 'rgba(255, 215, 106, 0.4)');
    ctx.restore();
    // Lantern post and cage.
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(HEART.x - 4, HEART.y - 6, 8, 34);
    ctx.fillStyle = '#3d2f1e';
    ctx.beginPath();
    ctx.arc(HEART.x, HEART.y - 14, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.heart;
    ctx.beginPath();
    ctx.arc(HEART.x, HEART.y - 14, 14 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(HEART.x, HEART.y - 14, 7, 0, Math.PI * 2);
    ctx.fill();
    // Heart hit points as a ring.
    ctx.strokeStyle = 'rgba(244, 234, 210, 0.25)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(HEART.x, HEART.y - 14, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = hpFrac > 0.5 ? '#ffcf5e' : '#ff6b5e';
    ctx.beginPath();
    ctx.arc(HEART.x, HEART.y - 14, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac);
    ctx.stroke();
  }

  function drawTower(state, tower) {
    const pad = PADS[tower.pad];
    const base = TOWERS[tower.type];
    const range = base.range * [1, 1.12, 1.25][tower.level - 1];
    if (state.selectedPad === tower.pad) {
      ctx.fillStyle = 'rgba(255, 207, 94, 0.07)';
      ctx.beginPath();
      ctx.arc(pad.x, pad.y - 10, range, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 207, 94, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    drawGlow(pad.x, pad.y - 12, 44 + tower.flash * 120, base.glow + '55');
    // Post.
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(pad.x - 4, pad.y - 22, 8, 26);
    // Lantern head, brighter while it just fired.
    ctx.fillStyle = base.color;
    ctx.beginPath();
    ctx.arc(pad.x, pad.y - 26, 11 + tower.flash * 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(pad.x, pad.y - 26, 5 + tower.flash * 14, 0, Math.PI * 2);
    ctx.fill();
    // Level pips.
    for (let i = 0; i < tower.level; i += 1) {
      ctx.fillStyle = base.color;
      ctx.beginPath();
      ctx.arc(pad.x - 10 + i * 10, pad.y + 12, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMoth(moth) {
    const flap = Math.sin(moth.wobble * 2) * 0.5;
    const color = moth.kind === 'queen' ? '#ffd76a' : (moth.kind === 'bulwark' ? '#8f7bff' : (moth.kind === 'dart' ? '#ff9ed2' : '#c9a7ff'));
    ctx.save();
    ctx.translate(moth.x, moth.y);
    // Wings.
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(-moth.radius * 0.7, -4 - flap * 4, moth.radius * 0.75, moth.radius * 0.45, -0.5, 0, Math.PI * 2);
    ctx.ellipse(moth.radius * 0.7, -4 - flap * 4, moth.radius * 0.75, moth.radius * 0.45, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Body.
    ctx.fillStyle = '#2a2140';
    ctx.beginPath();
    ctx.ellipse(0, 0, moth.radius * 0.45, moth.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Slowed moths wear a frost ring.
    if (moth.slowFactor < 1) {
      ctx.strokeStyle = '#7dd7ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, moth.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Hit-point bar for tough moths.
    if (moth.maxHp > 60) {
      const frac = Math.max(0, moth.hp / moth.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-16, -moth.radius - 12, 32, 5);
      ctx.fillStyle = frac > 0.5 ? '#6fd64a' : '#ff6b5e';
      ctx.fillRect(-16, -moth.radius - 12, 32 * frac, 5);
    }
    ctx.restore();
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(7, 24, 38, 0.82)';
    roundRect(12, 10, 1256, 46, 10);
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText(`Wave ${Math.max(1, state.wave)} / ${WAVES.length}`, 28, 34);
    ctx.fillStyle = '#ffcf5e';
    ctx.fillText(`Embers ${state.embers}`, 190, 34);
    ctx.fillStyle = state.heartHp <= 5 ? '#ff6b5e' : PALETTE.text;
    ctx.fillText(`Heart ${state.heartHp}`, 380, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`Score ${state.score}`, 540, 34);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '18px ' + FONT;
    ctx.fillText(`Best ${best}`, 700, 34);
    ctx.fillText(state.phase === PHASE_WAVE ? 'Wave running' : (state.phase === PHASE_BUILD ? 'Build phase' : ''), 860, 34);
    ctx.textAlign = 'right';
    ctx.fillText('P pause · M mute', 1252, 34);
    ctx.textAlign = 'left';
    // The wave message banner.
    if (state.messageTimer > 0 && state.message) {
      ctx.globalAlpha = Math.min(1, state.messageTimer);
      ctx.fillStyle = 'rgba(7, 24, 38, 0.8)';
      const w = ctx.measureText(state.message).width + 36;
      roundRect((FIELD.width - w) / 2, 66, w, 34, 8);
      ctx.fill();
      ctx.fillStyle = '#ffcf5e';
      ctx.font = 'bold 17px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(state.message, FIELD.width / 2, 84);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  function drawShop(state) {
    for (const rect of SHOP) {
      const def = TOWERS[rect.type];
      const afford = state.embers >= def.cost;
      const selected = state.selectedType === rect.type;
      ctx.fillStyle = selected ? '#2c6b52' : PALETTE.panel;
      roundRect(rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.strokeStyle = selected ? '#ffcf5e' : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 3 : 2;
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(rect.x + 28, rect.y + 28, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 17px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const key = rect.type === 'ember' ? '1' : (rect.type === 'frost' ? '2' : '3');
      ctx.fillText(`[${key}] ${def.name} — ${def.cost} embers`, rect.x + 48, rect.y + 20);
      ctx.fillStyle = afford ? PALETTE.muted : '#ff6b5e';
      ctx.font = '14px ' + FONT;
      ctx.fillText(def.blurb, rect.x + 48, rect.y + 42);
    }
    // Selected pad panel: upgrade / sell.
    const padIndex = state.selectedPad;
    if (padIndex >= 0) {
      const tower = state.towers[padIndex];
      const x = 972;
      const y = 648;
      ctx.fillStyle = PALETTE.panel;
      roundRect(x, y, 296, 56, 10);
      ctx.fill();
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 15px ' + FONT;
      ctx.textAlign = 'left';
      if (tower && tower.type !== null) {
        const def = TOWERS[tower.type];
        ctx.fillText(`${def.name} Lv${tower.level} — U upgrade, X sell`, x + 14, y + 20);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = '14px ' + FONT;
        ctx.fillText(`Damage ${Math.round(def.damage * [1, 1.6, 2.6][tower.level - 1])} · range ${Math.round(def.range * [1, 1.12, 1.25][tower.level - 1])}`, x + 14, y + 42);
      } else {
        ctx.fillText('Empty pad — click to build', x + 14, y + 20);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = '14px ' + FONT;
        ctx.fillText('Pick a lantern below, then click a pad.', x + 14, y + 42);
      }
    }
  }

  function drawOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(7, 24, 38, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.font = 'bold 64px ' + FONT;
    ctx.fillText(title, FIELD.width / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '22px ' + FONT;
    let y = 320;
    for (const line of lines) {
      ctx.fillText(line, FIELD.width / 2, y);
      y += 34;
    }
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best) {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.seaDeep;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    drawIsland(state);
    drawHeart(state);
    for (const tower of state.towers) if (tower.type !== null) drawTower(state, tower);
    for (const moth of state.moths) if (moth.active) drawMoth(moth);
    for (const shot of state.projectiles) {
      if (!shot.active) continue;
      const color = TOWERS[shot.type].color;
      drawGlow(shot.x, shot.y, 12, color + '66');
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of state.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 16px ' + FONT;
    ctx.textAlign = 'center';
    for (const t of state.texts) {
      if (!t.active) continue;
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawShop(state);
    if (screen === SCREEN_TITLE) {
      drawOverlay('LANTERNKEEP', [
        'Shadow moths march on the Heart Lantern. Build lantern towers,',
        'spend embers wisely, and hold the light through all 8 waves.',
        'Click a pad to build · 1/2/3 pick a lantern · Space starts a wave',
        'U upgrade · X sell · P pause · R restart',
        'Press Space or click to begin',
      ], '#ffd76a');
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['Press P or Space to keep playing.', 'R restarts the game.'], '#f4ead2');
    } else if (screen === SCREEN_WIN) {
      drawOverlay('THE LIGHT HOLDS', [
        `All 8 waves cleared — score ${state.score} · ${state.kills} moths banished`,
        `Best score ${best}`,
        'Press R or click to play again',
      ], '#ffd76a');
    } else if (screen === SCREEN_OVER) {
      drawOverlay('THE LIGHT FADES', [
        `The moths reached the Heart Lantern on wave ${Math.max(1, state.wave)}.`,
        `Score ${state.score} · ${state.kills} moths banished · Best ${best}`,
        'Press R or click to try again',
      ], '#ff6b5e');
    }
  }

  return { draw, resize };
}
