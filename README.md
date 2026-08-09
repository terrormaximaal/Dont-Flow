# DON'T FLOW

A mobile web game built with [Phaser 4](https://phaser.io) and TypeScript.

You are a drop flowing down a three-lane track. Colour gates repaint you; after
each gate, collect the orbs that match your colour and avoid the ones that do
not. Reach the finish with the best score you can.

![screenshot](screenshot.png)

## Status: first playable

What is in:

- Automatic forward motion with a scrolling track
- Swipe / arrow-key lane changes that slide rather than snap
- Colour gates spanning the track
- Matching orbs (score + combo + burst + haptic) and wrong-coloured orbs
  (combo reset + red flash)
- A finish gate, a **LEVEL COMPLETE** panel and a restart button

Deliberately **not** in yet: menus, a level system, energy, and saving.

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
| Tap **RESTART**, or space / enter | Play again from the completion screen |

Vertical drags are ignored, so a scroll-like gesture does not steer.

## Project structure

Each system lives in its own file and knows as little as possible about the
others.

| Path | Responsibility |
|---|---|
| `src/game/config/constants.ts` | Every tunable value in the game |
| `src/game/config/level.ts` | The course layout, as data |
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
| `src/game/systems/Effects.ts` | Particle bursts and haptics |
| `src/game/ui/Hud.ts` | Score and combo readout |
| `src/game/ui/LevelComplete.ts` | End-of-run panel |

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

`src/game/config/level.ts` describes the course as a list of sections. Each
section is one gate pair followed by rows of orbs, written as text - one
character per lane, `B` for a blue orb, `R` for red, `.` for empty:

```ts
{
    splitAfterLane: 0,
    colors: [ 'blue', 'red' ],
    rows: [
        'B.R',
        '.BR',
        'RB.'
    ]
}
```

`buildLevel()` expands the sections into absolute distances, so spacing is
controlled by the constants at the top of that file rather than by hand.

Two rules worth keeping:

- **At most two orbs per row.** Three leaves no empty lane, forcing the drop
  through an orb it may not match. A combo should only break through the
  player's own mistake.
- **Gates split on a lane boundary.** The track has three lanes and a pair has
  two gates, so a centred split would leave the middle lane straddling both.
  `splitAfterLane` puts the join on a lane edge instead; alternating it between
  sections keeps the layout varied.

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
