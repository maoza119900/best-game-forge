// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, victory and game over.
//
// ?seed=N fixes the moth pattern. ?shot=start|play|win|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, PADS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  createWorld, EVENT_KILL, EVENT_LEAK, EVENT_LOST, EVENT_WAVE_CLEAR,
  EVENT_WON, EVENT_BUILD, PHASE_BUILD, PHASE_LOST, PHASE_WAVE, PHASE_WON,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART,
  ACTION_SELL, ACTION_UPGRADE, ACTION_WAVE, createInput,
} from './input.js';
import {
  createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY,
  SCREEN_TITLE, SCREEN_WIN, shopRects,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Build lanterns, then press Space to start wave 1.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.win();
    else audio.lose();
    announce(won ? `Victory! Score ${world.state.score}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  /** Handle a click: shop buttons, pads, and the selected-pad panel. */
  function handleClick(click) {
    if (screen !== SCREEN_PLAY) return;
    for (const rect of shopRects()) {
      if (click.x >= rect.x && click.x <= rect.x + rect.w && click.y >= rect.y && click.y <= rect.y + rect.h) {
        world.state.selectedType = rect.type;
        return;
      }
    }
    for (let i = 0; i < PADS.length; i += 1) {
      const pad = PADS[i];
      if (Math.hypot(click.x - pad.x, click.y - pad.y) <= pad.r + 8) {
        const tower = world.state.towers[i];
        if (tower.type === null) {
          if (world.buildTower(i, world.state.selectedType)) audio.build();
        } else {
          world.state.selectedPad = i;
        }
        return;
      }
    }
    world.state.selectedPad = -1;
  }

  function handleActions() {
    const actions = input.takeActions();
    const pick = input.takeTowerPick();
    if (pick !== null) world.state.selectedType = pick;
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART) {
      if (screen !== SCREEN_TITLE) startGame();
      return;
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PLAY && world.state.phase === PHASE_BUILD) {
        if (world.startWave()) audio.horn();
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_WAVE && world.state.phase === PHASE_BUILD) {
      if (world.startWave()) audio.horn();
    }
    if (actions & ACTION_UPGRADE && world.state.selectedPad >= 0) {
      if (world.upgradeTower(world.state.selectedPad)) audio.upgrade();
    }
    if (actions & ACTION_SELL && world.state.selectedPad >= 0) {
      world.sellTower(world.state.selectedPad);
    }
  }

  function stepWorld() {
    const events = world.step(STEP);
    if (events & EVENT_KILL) audio.hit();
    if (events & EVENT_LEAK) {
      audio.leak();
      announce(`A moth reached the lantern. Heart ${world.state.heartHp} left.`);
    }
    if (events & EVENT_WAVE_CLEAR) {
      audio.coin();
      announce(`Wave ${world.state.wave} cleared.`);
    }
    if (events & EVENT_WON) endGame(true);
    else if (events & EVENT_LOST) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    for (const click of input.takeClicks()) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
        startGame();
      } else {
        handleClick(click);
      }
    }
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        stepWorld();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting moths march unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lanternkeep. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
