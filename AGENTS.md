# DON'T FLOW

A mobile-first web game. Read this file before doing anything in this repo.

## What the game is

The player controls a liquid drop that moves forward automatically along a
track with 3 lanes. The player swipes (or uses arrow keys) to change lane.

Core loop, in order:

**SWIPE → CHOOSE → MATCH COLOUR → ABSORB → AVOID → GROW → REACH FINISH**

Coloured gates change the drop's colour. Orbs of the matching colour score
points and build a combo; a wrong colour costs double and drops the combo.
Every three orbs in a row raises what each one pays, up to five times the
base rate — losing that multiplier is the real cost of a mistake, not the
points. Barriers must be avoided unless the drop already matches them, in
which case it passes straight through. The drop swells as the score climbs.

Levels are short: currently 11 to 16 seconds each. The original plan said 30
to 60, so either the levels are due to grow or the plan is due to change.

The nine colours are: **red, blue, yellow, orange, purple, cyan, green,
pink, magenta.** A single level should only use colours from opposite ends
of that set, so no two on screen are close in hue.

There is no way to lose. A barrier costs points and the combo; it never ends
the run, and the finish is always reached.

The game must be understandable within seconds of picking it up.

## Stack

- **Phaser 4** + **TypeScript**, bundled with **Vite**
- Scaffolded from the official `template-vite-ts` Phaser template
- **Vitest** for tests, which run on plain modules with no browser
- Deploys automatically to GitHub Pages on every push to `main`

Do not swap out the framework, bundler or build config. Do not rebuild the
project from scratch.

## Commands

```
npm install     # once, after cloning
npm run dev     # dev server on http://localhost:8080
npm run build   # production build into dist/
npm test        # the whole suite, once
npm run test:watch
```

## Where code lives

```
src/game/main.ts        game config and startup
src/game/config/        constants, the level format, the levels, the worlds
src/game/scenes/        Title, LevelSelect, Play
src/game/entities/      Drop, Orb, Obstacle, GatePair, FinishGate
src/game/systems/       course, input, scoring, energy, saving, rendering
src/game/ui/            HUD, buttons, overlays, shared shapes
src/game/utils/         small maths helpers
test/                   one file per system
public/assets/          static files (currently unused)
```

## What already exists

Do not rebuild these. They are done and tested:

title screen · level select · pause and completion overlays · ten levels ·
saving (localStorage) · best score per level · combo multiplier · energy
system · ten environments · diagonal perspective projection · haptics

The energy system is **switched off** behind `ENERGY_ENABLED` in
`constants.ts`, so levels are free and unlimited and its meter is hidden.
The system itself is intact and still tested; flip the constant to bring it
back.

## Hard rules

**Filenames say what is in them.** A file holding a class is named for that
class (`Drop.ts`, `InputSystem.ts`); a file of plain functions is lowercase
with hyphens (`drop-surface.ts`, `contact.ts`, `swipe.ts`). Either way an
import must match its file exactly, character for character. One of us is on
Windows, one on Mac, and the deploy server is Linux — Linux is case-sensitive
and the other two are not. Get a capital wrong and it works locally and
breaks on the live site.

**All tunable values as named constants**, each with a short comment saying
what it does. They live together in `config/constants.ts`. Forward speed,
lane-change speed, object spacing, combo steps, ripple sizes, flash durations
— anything that affects how the game feels. We tune by editing numbers, not
by hunting through logic.

**Keep files small.** Roughly 200 lines is the ceiling. One system per file.
If a file is growing past that, split it.

**Rules that decide what happens to the player go in a plain module**, not in
the entity that draws them — `contact.ts`, `swipe.ts`, `barrier.ts`. A rule
that needs a running scene to exercise is a rule nobody checks, and these are
the ones the tests hold the levels to.

**No art or audio assets yet.** Flat shapes and solid colours only, all drawn
in code. The drop is a teardrop whose outline is rebuilt every frame so it
reads as liquid. We are testing whether the game is fun, not what it looks
like.

**Portrait orientation**, scaling to fit any screen. Everything must work
with both touch and keyboard.

**No secrets in the repo.** No API keys, tokens or passwords, ever — this
repository is public.

## Design rules

**Feel comes before content.** A mechanic that doesn't feel good doesn't get
more levels built on top of it. It gets fixed first.

**Never unfair.** No unavoidable penalties. Every row must leave a lane that
is free of barriers whatever colour the drop carries, and every level must
give enough time between rows to reach it. Both are asserted in
`test/barrier.test.ts`, so a level edit that breaks either one fails the
suite rather than the player.

**The game sometimes lies — but always leaves a clue.** Later levels break
their own stated rules (a sign reading LEFT when the answer is right, a red
zone that is secretly the safe path). Every trick must contain something an
attentive player could have spotted. Surprises are rare and memorable, never
a constant drip. *Nothing in the game does this yet.*

## How we work

Two people, in different countries, both working through Claude Code and
pull requests.

- Do only what was asked. Don't build ahead into the next system.
- Don't refactor unrelated code as a side effect of a task.
- Explain what you changed and why, in plain language — neither of us is an
  experienced programmer.
- Work incrementally and stop for confirmation at natural checkpoints rather
  than delivering everything at once.
- Keep this file true. If a change makes something here wrong, fix it in the
  same pull request.

## Deliberately not built yet

Do not add these unless the task explicitly asks for them:

world life progression · power-ups · skins · analytics · secret levels ·
sound · currency · per-level score targets

They are all planned. They are not now.
