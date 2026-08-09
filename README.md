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
- Matching orbs (score + combo + burst + haptic) and wrong-coloured orbs
  (combo reset + red flash)
- A finish gate and a level-complete panel
- Three levels, each with its own layout, speed and row spacing, played in
  sequence
- Saved progress: best score per level, and a reload resumes the level you were
  on
- A title screen and a level select, unlocked as far as you have reached

Deliberately **not** in yet: energy. Score resets at the start of each level -
only the per-level best is kept.

## Requirements

[Node.js](https://nodejs.org) is required to install dependencies and run the
npm scripts.

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Development server on `http://localhost:8080` |
| `npm run build` | Production build into `dist` |
| `npm run dev-nolog` / `npm run build-nolog` | Same, without the template's anonymous ping (see below) |
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
| `src/game/scenes/Title.ts` | Title screen, and where the game boots |
| `src/game/scenes/LevelSelect.ts` | Level rows, unlocked from saved progress |
| `src/game/scenes/Play.ts` | Wires the systems together and owns forward distance |
| `src/game/entities/Drop.ts` | The player: lane easing, lean, colour, hit flash |
| `src/game/entities/GatePair.ts` | Two colour gates spanning the track |
| `src/game/entities/Orb.ts` | A lane-anchored collectible |
| `src/game/entities/FinishGate.ts` | The chequered finish band |
| `src/game/systems/InputSystem.ts` | Swipe and keyboard, to lane-change intents |
| `src/game/systems/Course.ts` | Owns placed objects and reports what the drop passed |
| `src/game/systems/TrackScroller.ts` | The scrolling track visuals |
| `src/game/systems/Lanes.ts` | Lane index to screen x |
| `src/game/systems/World.ts` | Track distance to screen y |
| `src/game/systems/ScoreSystem.ts` | Score and combo bookkeeping |
| `src/game/systems/SaveSystem.ts` | Progress in localStorage |
| `src/game/systems/Effects.ts` | Particle bursts and haptics |
| `src/game/systems/OrientationGuard.ts` | Pauses the run while the device is sideways |
| `src/game/ui/Hud.ts` | Score and combo readout |
| `src/game/ui/LevelComplete.ts` | End-of-run panel |
| `src/game/ui/PauseButton.ts` | The pause control shown during play |
| `src/game/ui/PauseOverlay.ts` | The paused panel |
| `src/game/ui/Button.ts` | The tappable label every screen uses |
| `src/game/ui/shapes.ts` | The teardrop, shared by the player and the logo |

### How position works

Nothing on the course stores a screen position. Every gate and orb sits at a
**distance along the track**, and `World.screenYFor()` converts that to a screen
y using how far the drop has travelled. The drop itself never moves vertically -
the track scrolls past it.

This is also what makes hit detection simple: an object is reached the moment
travelled distance passes its distance, which cannot tunnel at any speed.

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

A level is a list of sections. Each section is one gate pair followed by rows of
orbs, written as text - one character per lane, `B` for a blue orb, `R` for red,
`.` for empty:

```ts
{
    name: '4',
    forwardSpeed: 560,   // optional, defaults to FORWARD_SPEED
    rowSpacing: 140,     // optional, defaults to ORB_ROW_SPACING
    sections: [
        {
            splitAfterLane: 0,
            colors: [ 'blue', 'red' ],
            rows: [
                'B.R',
                '.BR',
                'RB.'
            ]
        }
    ]
}
```

`buildLevel()` expands the sections into absolute distances, so spacing comes
from the constants at the top of `level.ts` rather than being positioned by hand.

Difficulty has three dials: `forwardSpeed`, `rowSpacing`, and how much the orbs
of one colour zig-zag between lanes. The third is what forces steering - a colour
that stays in one lane can be followed without moving at all.

Two rules worth keeping:

- **At most two orbs per row.** Three leaves no empty lane, forcing the drop
  through an orb it may not match. A combo should only break through the
  player's own mistake.
- **Gates split on a lane boundary.** The track has three lanes and a pair has
  two gates, so a centred split would leave the middle lane straddling both.
  `splitAfterLane` puts the join on a lane edge instead; alternating it between
  sections keeps the layout varied.

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

`furthestLevel` is recorded but unused - a level-select menu will want it, and
storing it now means the history exists by the time that is built.

## Notes

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
