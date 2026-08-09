# DON'T FLOW

A mobile-first web game. Read this file before doing anything in this repo.

## What the game is

The player controls a liquid drop that moves forward automatically along a
track with 3 lanes. The player swipes (or uses arrow keys) to change lane.

Core loop, in order:

**SWIPE → CHOOSE → MATCH COLOUR → ABSORB → AVOID → GROW → REACH FINISH**

Coloured gates change the drop's colour. Orbs of the matching colour score
points and build a combo; wrong-colour orbs break the combo. Obstacles must
be avoided. Levels are short — 30 to 60 seconds.

The five colours are: **blue, red, yellow, purple, green.**

The game must be understandable within seconds of picking it up.

## Stack

- **Phaser 4** + **TypeScript**, bundled with **Vite**
- Scaffolded from the official `template-vite-ts` Phaser template
- Deploys automatically to GitHub Pages on every push to `main`

Do not swap out the framework, bundler or build config. Do not rebuild the
project from scratch.

## Commands

```
npm install     # once, after cloning
npm run dev     # dev server on http://localhost:8080
npm run build   # production build into dist/
```

## Where code lives

```
src/game/main.ts        game config and startup
src/game/scenes/        Phaser scenes
public/assets/          static files (currently unused)
```

## Hard rules

**Filenames in lowercase, hyphens instead of spaces.** `color-gate.ts`, not
`ColorGate.ts` or `color gate.ts`. One of us is on Windows, one on Mac, and
the deploy server is Linux — Linux is case-sensitive and the other two are
not. Get this wrong and things work locally but break on the live site.

**All tunable values as named constants at the top of the file**, each with a
short comment saying what it does. Forward speed, lane-change speed, object
spacing, combo timings, flash durations — anything that affects how the game
feels. We tune by editing numbers, not by hunting through logic.

**Keep files small.** Roughly 200 lines is the ceiling. One system per file.
If a file is growing past that, split it.

**No art or audio assets yet.** Flat shapes and solid colours only. The drop
is a circle. We are testing whether the game is fun, not what it looks like.

**Portrait orientation**, scaling to fit any screen. Everything must work
with both touch and keyboard.

**No secrets in the repo.** No API keys, tokens or passwords, ever — this
repository is public.

## Design rules

**Feel comes before content.** A mechanic that doesn't feel good doesn't get
more levels built on top of it. It gets fixed first.

**Never unfair.** No random unavoidable deaths. Dangerous moving obstacles
get a visible warning before they become lethal.

**The game sometimes lies — but always leaves a clue.** Later levels break
their own stated rules (a sign reading LEFT when the answer is right, a red
zone that is secretly the safe path). Every trick must contain something an
attentive player could have spotted. Surprises are rare and memorable, never
a constant drip.

## How we work

Two people, in different countries, both working through Claude Code and
pull requests.

- Do only what was asked. Don't build ahead into the next system.
- Don't refactor unrelated code as a side effect of a task.
- Explain what you changed and why, in plain language — neither of us is an
  experienced programmer.
- Work incrementally and stop for confirmation at natural checkpoints rather
  than delivering everything at once.

## Deliberately not built yet

Do not add these unless the task explicitly asks for them:

energy system · save system · level select · menus beyond what's needed ·
world life progression · power-ups · skins · analytics · secret levels ·
sound · haptics · currency

They are all planned. They are not now.
