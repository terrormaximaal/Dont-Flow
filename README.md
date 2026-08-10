# DON'T FLOW

A mobile web game built with [Phaser 4](https://phaser.io) and TypeScript.

You are a drop flowing down a three-lane track. Colour gates repaint you; after
each gate, collect the orbs that match your colour and avoid the ones that do
not. Reach the finish with the best score you can.

![screenshot](screenshot.png)

## Status

What is in:

- Automatic forward motion with a scrolling track
- Swipe / arrow-key lane changes that slide rather than snap
- Colour gates spanning the track
- Matching colours score and build a combo; a wrong colour costs double, breaks
  the combo, flashes the drop and kicks the screen
- A finish gate and a level-complete panel
- Ten levels, each with its own world, palette, layout, speed and row spacing
- Coloured barriers that are only safe to pass while carrying their colour,
  in three kinds introduced one at a time: static, sliding and pulsing
- Saved progress: best score per level, and a reload resumes the level you were
  on
- A title screen and a level select, unlocked as far as you have reached
- Energy: starting a level costs one, and it refills with real time

Score resets at the start of each level - only the per-level best is kept.

## Requirements

[Node.js](https://nodejs.org) is required to install dependencies and run the
npm scripts.

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Development server on `http://localhost:8080` |
| `npm run build` | Production build into `dist` |
| `npm run dev-nolog` / `npm run build-nolog` | Same, without the template's anonymous ping (see below) |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run it in watch mode |
| `npx tsc --noEmit` | Type-check |

## Controls

| Input | Action |
|---|---|
| Swipe left / right | Move one lane. A single drag can cross two lanes without lifting your finger. |
| Arrow keys, or A / D | Move one lane |
| Tap **NEXT LEVEL** / **START OVER**, or space / enter | Continue from the completion screen |
| Tap **RETRY** | Replay the level you just finished |
| Tap the pause button, or press escape | Pause, with resume / retry / menu |

Vertical drags are ignored, so a scroll-like gesture does not steer.

### Orientation

The game is portrait only. On a phone held sideways the playfield would collapse
to a sliver, so a "rotate your device" notice covers the screen and the run
pauses until it is turned back - no distance is lost.

The trigger is landscape **and** a short viewport, not landscape alone, because a
desktop window is landscape too and stays keyboard-playable. It is defined twice
and the two must be kept in step:

- `BLOCK_LANDSCAPE_QUERY` in `src/game/config/constants.ts` (pauses the run)
- the matching `@media` block in `public/style.css` (shows the notice)

## Project structure

Each system lives in its own file and knows as little as possible about the
others.

| Path | Responsibility |
|---|---|
| `src/game/config/constants.ts` | Every tunable value in the game |
| `src/game/config/level.ts` | The level format, and compiling one into a course |
| `src/game/config/levels.ts` | The levels themselves |
| `src/game/config/worlds.ts` | The environment format, and the ten worlds |
| `src/game/scenes/Title.ts` | Title screen, and where the game boots |
| `src/game/scenes/LevelSelect.ts` | Level rows, unlocked from saved progress |
| `src/game/scenes/Play.ts` | Wires the systems together and owns forward distance |
| `src/game/entities/Drop.ts` | The player: lane easing, lean, colour, hit flash |
| `src/game/entities/GatePair.ts` | Two colour gates spanning the track |
| `src/game/entities/Orb.ts` | A lane-anchored collectible |
| `src/game/entities/Obstacle.ts` | A coloured barrier: static, sliding or pulsing |
| `src/game/entities/FinishGate.ts` | The chequered finish band |
| `src/game/systems/InputSystem.ts` | Swipe and keyboard, to lane-change intents |
| `src/game/systems/Course.ts` | Owns placed objects and reports what the drop passed |
| `src/game/systems/TrackScroller.ts` | The scrolling track visuals |
| `src/game/systems/Lanes.ts` | Lane index to screen x |
| `src/game/systems/World.ts` | Track distance to screen y |
| `src/game/systems/Projection.ts` | Track space to the diagonal corridor, at draw time only |
| `src/game/systems/contact.ts` | Which gate, and what the drop is touching |
| `src/game/systems/swipe.ts` | The gesture rules, as pure functions |
| `src/game/systems/ScoreSystem.ts` | Score and combo bookkeeping |
| `src/game/systems/SaveSystem.ts` | Progress in localStorage |
| `src/game/systems/EnergySystem.ts` | Energy in hand, and refilling it over time |
| `src/game/systems/Effects.ts` | Particle bursts and haptics |
| `src/game/systems/OrientationGuard.ts` | Pauses the run while the device is sideways |
| `src/game/ui/Hud.ts` | Score and combo readout |
| `src/game/ui/LevelComplete.ts` | End-of-run panel |
| `src/game/ui/PauseButton.ts` | The pause control shown during play |
| `src/game/ui/PauseOverlay.ts` | The paused panel |
| `src/game/ui/Button.ts` | The tappable label every screen uses |
| `src/game/ui/FloatingScore.ts` | Points won or lost, rising from the hit |
| `src/game/ui/shapes.ts` | The teardrop, shared by the player and the logo |

### How position works

Nothing on the course stores a screen position. Every gate and orb sits at a
**distance along the track**, and `World.screenYFor()` converts that to a screen
y using how far the drop has travelled. The drop itself never moves vertically -
the track scrolls past it.

This is also what makes hit detection simple: an object is reached the moment
travelled distance passes its distance, which cannot tunnel at any speed.

### How the perspective works

The world is drawn as a road running away to a horizon, but it is still
**authored flat**: a lane gives an x, a distance gives a depth.
`systems/Projection.ts` is the only file that knows the world is seen in
perspective.

Two rules do all of it:

- `World.screenYFor()` turns a distance into a screen y as `k / (ahead + k)`,
  so far things barely move, near things rush past, and nothing crosses the
  horizon;
- `Projection.projectX()` pulls every point towards the vanishing point in
  proportion to its depth, which gives convergence, the narrowing of the road
  and its diagonal run all at once.

Collision never calls either. Hits are decided on track coordinates, so the
camera can be raised, lowered or straightened with no gameplay consequence -
there is no second copy of the geometry to keep in step.

The projection is the identity at the drop's own line, so the lane the player
is steering in never slides under them and what is drawn provably agrees with
what is collided.

Two properties the rendering depends on, both tested:

- it is **linear in screen y**, so straight lines stay straight and every line
  on the road can be drawn from just its two projected endpoints;
- the road **stays on screen for its whole visible length**, because a road
  that ran off the edge would hide oncoming objects.

Moving barriers take their position from a single function of distance
travelled, called by both the renderer and the collision check, so a barrier
cannot be drawn in one place and collided in another.

## Tuning the feel

All tunable values live in `src/game/config/constants.ts`. The two that matter
most:

| Constant | Effect |
|---|---|
| `FORWARD_SPEED` | How fast the track flows past, in pixels per second |
| `LANE_CHANGE_SPEED` | Lane-slide smoothing rate. Higher is snappier, lower is floatier. It is an exponential rate constant, not a duration. |

## Authoring a level

Levels live in `src/game/config/levels.ts` as entries in `LEVELS`, and are played
in array order. `level.ts` holds the format and the compiler; `levels.ts` holds
only content, so adding a level never means touching game code.

A level names a `world` (its environment) and a `palette`. Everything else refers
to colours by **position in that palette**, so a level can be re-tinted in one
place without touching its layout.

A level is a list of sections. Each section is one gate pair followed by rows,
written as text - one character per lane:

| Character | Meaning |
|---|---|
| `.` | empty |
| `1`-`5` | an orb of that palette colour |
| `a`-`e` | a barrier of that palette colour |

```ts
{
    name: '11',
    world: 'canyon',
    palette: [ 'orange', 'purple', 'cyan' ],
    forwardSpeed: 560,   // optional, defaults to FORWARD_SPEED
    rowSpacing: 140,     // optional, defaults to ORB_ROW_SPACING
    sections: [
        {
            splitAfterLane: 0,
            gate: [ 0, 1 ],        // orange gate | purple gate
            obstacles: 'slider',   // static | slider | pulse, defaults to static
            rows: [
                '1.a',             // orange orb, gap, orange barrier
                '.1c',
                'c1.'
            ]
        }
    ]
}
```

`buildLevel()` expands the sections into absolute distances, so spacing comes
from the constants at the top of `level.ts` rather than being positioned by hand.

Difficulty runs on five dials, and leaning only on speed makes a level faster
rather than harder: `forwardSpeed`, `rowSpacing`, how many colours the palette
holds, how much a colour zig-zags between lanes, and which barrier kinds are
present.

Rules the tests enforce, so a level cannot ship breaking them:

- **At most two things per row.** Three leaves no empty lane to dodge into.
- **Every row leaves a lane that is safe to be in** - empty, or holding an orb.
  An orb at worst costs points; a barrier can block the route outright, so a row
  of nothing but barriers has no way through.
- **A gate pair's two halves are different colours**, or the choice means nothing.
- **Gates split on a lane boundary.** Three lanes and two gates cannot split down
  the middle without leaving the centre lane straddling both.
- **Each barrier kind appears before it is combined**, and level 1 has none at
  all.

## Saved progress

Progress lives in `localStorage` under `dont-flow.save`: the level you were last
on, the furthest you have reached, and the best score for each level. A reload
drops you back into the level you were on - set `RESUME_AT_LAST_LEVEL` to
`false` in `constants.ts` to always start at level 1 instead.

`SaveSystem` treats the stored value as hostile. It can be missing, corrupt,
written by an older build, sized for a different number of levels, or unreadable
outright - Safari's private mode throws on access rather than returning null.
Every one of those falls back to an empty save held in memory, so the game always
starts and only persistence is lost. Bumping `SAVE_VERSION` discards saves from
an incompatible format rather than guessing at a migration.

## Energy

Starting a level costs one energy, retries included. Energy refills with real
time, up to `MAX_ENERGY`. Both that and `ENERGY_REFILL_MS` are in
`constants.ts` - set the cost to `0` to take energy out of the way while working
on something else.

This is a limit on how much can be played in a sitting, not health: it is
charged once as a level begins and never affects a run in progress.

Refills are worked out lazily from a single stored timestamp rather than ticked,
so time passes while the game is closed and there is no timer to keep alive.
`energyAt` marks the start of the interval currently being waited out, which is
why partial progress survives - 25 minutes at a 10 minute refill grants two
energy and keeps the remaining five minutes.

At the cap, nothing is stored and no timestamp is kept: spending starts a fresh
interval the moment energy drops below max, so time spent full cannot bank up.
That also keeps the menus from writing to `localStorage` on every frame, since
the meter polls this once per frame.

Energy trusts the device clock, so winding it forward grants energy. That is
inherent to storing progress locally; a server-checked clock is the only real
fix, and there is no server.

## Tests

`npm test` runs the suite in `test/`. It covers the game's pure logic, which is
where the bugs that are hard to see live:

- `level.test.ts` - compiling authored levels into a course, plus checks over the
  shipped levels themselves: no row may be completely full, every row is one
  character per lane, and every section offers both colours so either gate is
  playable
- `save.test.ts` - reading back what was written, and every way a stored value
  can be hostile
- `energy.test.ts` - refill arithmetic, spending, and a clock that has moved
  backwards
- `lanes.test.ts` - lane geometry and clamping

Nothing here drives Phaser. These modules deliberately have no Phaser imports,
so they can be tested without a canvas or a DOM; the browser globals the save
needs are stubbed per test. Anything that does touch Phaser - scenes, entities,
rendering - is verified by running the game instead.

One of these is a regression guard for a bug that had already shipped into an
otherwise working build, and was only caught by looking at real behaviour:
energy wrote to `localStorage` on every frame. The level checks guard rules that
were until now only kept by hand while authoring.

- **No image assets.** Everything is drawn with Phaser shapes and graphics,
  including the particle bursts - Phaser's particle emitter needs a texture, so
  bursts are plain circles and tweens instead.
- **The `Phaser` global is types only.** Under the ESM build, `Phaser.Math.*`
  and friends type-check and then throw `Phaser is not defined` in the browser.
  Anything used at runtime must be imported. See `src/game/utils/math.ts`.
- **Haptics** go through `navigator.vibrate`, which is a silent no-op on iOS
  Safari and desktop.

## About `log.js`

This project started from the official
[Phaser Vite TypeScript template](https://github.com/phaserjs/template-vite-ts),
which includes a `log.js` that makes a single anonymous call to `gryzor.co` on
`dev` and `build`, reporting the template name, build type and Phaser version.
No personal data is sent. Use `npm run dev-nolog` / `npm run build-nolog` to
skip it, or delete `log.js` and drop the call from the `scripts` section of
`package.json`.
