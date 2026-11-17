// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple build script (spend embers on a fixed pad plan, upgrade when
// affordable, start each wave as soon as the build phase opens), so the frame
// is what a real game looks like and the same seed always gives the same frame.
import { PADS, STEP, TOWERS, WAVES } from './config.js';
import { EVENT_LOST, EVENT_WON, PHASE_BUILD, PHASE_WAVE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** The build plan, in order: [padIndex, towerType]. The win pilot works through it. */
const BUILD_PLAN = [
  [0, 'ember'], [2, 'ember'], [4, 'frost'], [1, 'ember'], [5, 'gale'],
  [3, 'ember'], [6, 'frost'], [7, 'gale'], [8, 'ember'], [9, 'frost'],
];

/** Spend embers on the next unbuilt pad of the plan, then upgrade the cheapest tower. */
function autopilotBuild(world) {
  const state = world.state;
  for (const [pad, type] of BUILD_PLAN) {
    const tower = state.towers[pad];
    if (tower.type === null && state.embers >= TOWERS[type].cost) {
      world.buildTower(pad, type);
      return;
    }
  }
  let cheapest = null;
  let cheapestCost = Infinity;
  for (let i = 0; i < state.towers.length; i += 1) {
    const tower = state.towers[i];
    if (tower.type === null) continue;
    const cost = world.upgradeCost(i);
    if (cost !== null && cost < cheapestCost && state.embers >= cost) {
      cheapest = i;
      cheapestCost = cost;
    }
  }
  if (cheapest !== null) world.upgradeTower(cheapest);
}

/** Spend every ember the build phase allows, then start the wave. */
function spendAndStart(world) {
  let before = world.state.embers;
  autopilotBuild(world);
  while (world.state.embers < before) {
    before = world.state.embers;
    autopilotBuild(world);
  }
  world.startWave();
}

/** Run the world forward until `until` returns true, or the step cap hits. */
function simulate(world, until, maxSteps, spend = true) {
  for (let i = 0; i < maxSteps; i += 1) {
    if (world.state.phase === PHASE_BUILD) {
      if (spend) spendAndStart(world);
      else world.startWave();
    }
    const events = world.step(STEP);
    if (events & EVENT_LOST || events & EVENT_WON) return events;
    if (until(world.state)) return events;
  }
  return 0;
}

/**
 * Set `world` to the named scene (start, play, win or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'end') {
    // Title: a few towers already built and moths drifting in, for a lively backdrop.
    world.buildTower(0, 'ember');
    world.buildTower(4, 'frost');
    world.buildTower(5, 'gale');
    world.startWave();
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP);
    world.reset();
    world.buildTower(0, 'ember');
    world.buildTower(4, 'frost');
    world.buildTower(5, 'gale');
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Mid-wave 3, towers up, moths on the path, HUD full.
    simulate(
      world,
      (s) => s.phase === PHASE_WAVE && s.wave === 3
        && s.moths.filter((m) => m.active).length >= 5
        && s.moths.some((m) => m.active && m.along > 500),
      60 * 60 * 6,
    );
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    // Play the whole game out with the autopilot until the queen falls.
    simulate(world, () => false, 60 * 60 * 30);
    return { screen: world.state.phase === 'won' ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  // End: build almost nothing and never spend again, so the heart falls early.
  world.buildTower(0, 'ember');
  simulate(world, () => false, 60 * 60 * 12, false);
  return { screen: world.state.phase === 'lost' ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
