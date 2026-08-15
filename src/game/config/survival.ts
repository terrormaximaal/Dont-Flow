import { ColorId } from './constants';
import { Chunk, CHUNKS, MAX_TIER } from './chunks';
import { drawWindow, restEveryFor } from './form';
import { buildLevel, Level, LevelSpec, SectionSpec } from './level';
import { WorldId } from './worlds';

//  An endless course, built out of authored pieces.
//
//  Deterministic from a seed, which is the thing that makes it testable at all:
//  a generator that cannot be replayed can only be checked by playing it, and
//  the guards that hold the twenty levels to being finishable are worth far
//  more pointed at a thousand generated ones.
//
//  The order is chosen here. Nothing about what is *in* a chunk is decided at
//  run time - see chunks.ts for why.

/**
 * A small, fast, well-behaved generator.
 *
 * mulberry32. Chosen because it is nine lines and passes enough of the usual
 * tests for a job like this, where the requirement is "no visible pattern"
 * rather than anything cryptographic - and because Math.random cannot be
 * seeded, so it cannot be replayed, so it cannot be tested.
 */
export function randomFrom (seed: number): () => number
{
    let state = seed >>> 0;

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;

        let t = Math.imul(state ^ (state >>> 15), 1 | state);

        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * The colours an endless run deals in.
 *
 * All five, from the first chunk. A run has no curve to climb the way a level
 * does - it is the same game from the start, only faster - and holding colours
 * back would make the opening minute a tutorial nobody asked for.
 */
export const SURVIVAL_PALETTE: ColorId[] = [ 'cyan', 'magenta', 'yellow', 'green', 'purple' ];

/** How many chunks a run gets through before the next tier unlocks. */
export const TIER_EVERY = 4;

/** How many chunks may pass without somewhere to recover. */
export const REST_EVERY = 4;

/** The pace an endless run starts at, and how much each tier adds. */
export const SURVIVAL_SPEED = 470;
export const SURVIVAL_SPEED_PER_TIER = 42;

/** Row spacing at the start, and how much each tier takes off it. */
export const SURVIVAL_SPACING = 168;
export const SURVIVAL_SPACING_PER_TIER = 7;

/** The tightest the road is ever allowed to get, whatever the tier. */
export const SURVIVAL_SPACING_FLOOR = 120;

/**
 * The highest tier in play this far into a run.
 *
 * Rises a tier every few chunks and then stops. A run that kept getting harder
 * forever would have exactly one ending, and the score would only measure how
 * long the player could put it off - which is a timer, not a game.
 */
export function tierAt (chunk: number): number
{
    return Math.min(MAX_TIER, Math.floor(chunk / TIER_EVERY));
}

/** The pace and spacing a given tier runs at. */
export function paceAt (tier: number): { speed: number; spacing: number }
{
    return {
        speed: SURVIVAL_SPEED + (tier * SURVIVAL_SPEED_PER_TIER),
        spacing: Math.max(
            SURVIVAL_SPACING_FLOOR,
            SURVIVAL_SPACING - (tier * SURVIVAL_SPACING_PER_TIER)
        )
    };
}

/**
 * How much the pace keeps rising once the tiers have run out, per chunk, and
 * where it finally stops.
 *
 * The content plateaus after twenty chunks - about seventy seconds - because a
 * run that kept meeting new things forever would only ever end one way. But
 * the pace plateauing with it left a run that stopped getting harder at all,
 * so the score measured endurance rather than skill: nothing after the first
 * minute was any different, only longer.
 *
 * So the road keeps speeding up, slowly, long after it has stopped changing.
 * That is what gives an endless run an ending it earns.
 *
 * The ceiling has real margin in it. At the tightest spacing the tiers reach,
 * a lane change needs 123ms and the road allows one until about 1080 - so this
 * sits far enough below that the last stretch is hard rather than a test of
 * whether the input happens to land on the right frame.
 */
export const SURVIVAL_CREEP_PER_CHUNK = 6;
export const SURVIVAL_SPEED_CEILING = 950;

/**
 * The pace at a given point in a run, tiers and creep together.
 *
 * A function of how far the run has come and nothing else - see form.ts for
 * why the road's speed is never allowed to be a comment on the player.
 */
export function speedAtChunk (chunk: number): number
{
    const base = paceAt(tierAt(chunk)).speed;
    const past = Math.max(0, chunk - (MAX_TIER * TIER_EVERY));

    return Math.min(SURVIVAL_SPEED_CEILING, base + (past * SURVIVAL_CREEP_PER_CHUNK));
}

/**
 * Which chunk comes next.
 *
 * Two rules on top of the draw. A rest is forced when one is overdue, because
 * a run that never gets its score back dies to arithmetic rather than to any
 * mistake. And the piece just played is never repeated, since the one thing a
 * generator must not do is the same thing twice in a row - that reads as a bug
 * long before it reads as bad luck.
 */
export function pickChunk (
    random: () => number,
    tier: number,
    sinceRest: number,
    last: Chunk | null,
    form = 0
): Chunk
{
    const eligible = CHUNKS.filter((chunk) => {

        if (chunk.tier > tier)
        {
            return false;
        }

        if (sinceRest >= restEveryFor(form))
        {
            return chunk.recovery === true;
        }

        return true;
    });

    //  Never twice running, unless the tier offers nothing else - which only
    //  happens at tier zero on the very first chunks.
    const choices = eligible.filter((chunk) => chunk !== last);
    const pool = choices.length > 0 ? choices : eligible;

    //  Which end of what is unlocked to draw from. The ceiling is untouched -
    //  a run going well never meets a piece early - but a run in trouble draws
    //  from the gentler half of what it has already been shown, and one going
    //  well from the harder half.
    const ordered = [ ...pool ].sort((a, b) => a.tier - b.tier);
    const window = drawWindow(form);

    const from = Math.floor(ordered.length * window.from);
    const to = Math.max(from + 1, Math.ceil(ordered.length * window.to));

    const narrowed = ordered.slice(from, to);

    return narrowed[Math.floor(random() * narrowed.length)];
}

/**
 * One chunk turned into a section, in this run's colours.
 *
 * A chunk is written in palette slots 1 and 2; the gate offers two colours and
 * the rows are rewritten to those. Both doorways therefore always collect
 * something, which is the rule the twenty levels had to be repaired to meet.
 */
export function sectionFrom (
    chunk: Chunk,
    gate: [ number, number ],
    spacing: number
): SectionSpec
{
    //  Slot 1 becomes the first gate colour, slot 2 the second. Hazards move
    //  with them, so a wall is always one of the two colours on offer.
    const first = String(gate[0] + 1);
    const second = String(gate[1] + 1);

    const walls = 'abcde';
    const hurdles = 'ABCDE';

    const recolour = (row: string): string => [ ...row ].map((character) => {

        if (character === '1') { return first; }
        if (character === '2') { return second; }

        if (character === 'a') { return walls[gate[0]]; }
        if (character === 'b') { return walls[gate[1]]; }

        if (character === 'A') { return hurdles[gate[0]]; }
        if (character === 'B') { return hurdles[gate[1]]; }

        return character;

    }).join('');

    return {
        splitAfterLane: 0,
        gate,
        obstacles: chunk.obstacles,
        rowSpacing: spacing,
        rows: chunk.rows.map(recolour)
    };
}

export interface SurvivalCourse
{
    spec: LevelSpec;

    /** Which chunk each section came from, for reading a failure message. */
    names: string[];
}

/**
 * An endless course, as far as `count` chunks.
 *
 * Returned as an ordinary LevelSpec so everything downstream - buildLevel, the
 * Course, every guard in the suite - treats it exactly like an authored level.
 * That is the whole point of doing it this way: survival mode gets the twenty
 * levels' entire safety net for free.
 */
export function generateRun (
    seed: number,
    count: number,
    palette: ColorId[],
    world: WorldId,
    form = 0,
    startChunk = 0
): SurvivalCourse
{
    const random = randomFrom(seed);
    const sections: SectionSpec[] = [];
    const names: string[] = [];

    let sinceRest = 0;
    let last: Chunk | null = null;
    let gate = 0;

    for (let at = 0; at < count; at++)
    {
        //  Counted from where the run actually is rather than from zero, so a
        //  batch four deep is not handed opening-tier road again.
        const tier = tierAt(startChunk + at);
        const chunk = pickChunk(random, tier, sinceRest, last, form);

        //  The two colours on offer walk through the palette rather than being
        //  drawn, so consecutive gates never offer the same pair and the run
        //  cycles through every colour it has.
        const pair: [ number, number ] = [ gate % palette.length, (gate + 1) % palette.length ];

        gate += 1;

        sections.push(sectionFrom(chunk, pair, paceAt(tier).spacing));
        names.push(chunk.name);

        sinceRest = chunk.recovery === true ? 0 : sinceRest + 1;
        last = chunk;
    }

    return {
        spec: {
            name: 'SURVIVAL',
            world,
            palette,
            forwardSpeed: SURVIVAL_SPEED,
            rowSpacing: SURVIVAL_SPACING,
            sections
        },
        names
    };
}

/**
 * A batch of course, moved to start where the last one ended.
 *
 * buildLevel always lays a course out from zero, which is right for a level and
 * useless for the second batch of an endless run. Shifting the finished course
 * rather than teaching buildLevel about offsets keeps the one that twenty
 * levels depend on exactly as it is, and makes this a pure transform that can
 * be checked on its own.
 *
 * The finish distance comes back shifted too, which is what the next batch is
 * laid against - not a finish line, since an endless course has none, but the
 * point the road has been built up to.
 */
export function batchAt (spec: LevelSpec, offset: number): Level
{
    const level = buildLevel(spec);

    return {
        gates: level.gates.map((g) => ({ ...g, distance: g.distance + offset })),
        orbs: level.orbs.map((o) => ({ ...o, distance: o.distance + offset })),
        obstacles: level.obstacles.map((o) => ({ ...o, distance: o.distance + offset })),
        powerUps: level.powerUps.map((p) => ({ ...p, distance: p.distance + offset })),
        zones: level.zones.map((z) => ({ ...z, from: z.from + offset, to: z.to + offset })),
        hazards: level.hazards.map((h) => ({ ...h, from: h.from + offset, to: h.to + offset })),
        finishDistance: level.finishDistance + offset
    };
}

/** How many chunks are built at a time, and how far ahead the next batch lands. */
export const BATCH_CHUNKS = 8;

/**
 * How much road must be left in front of the drop before more is built.
 *
 * Comfortably further than anything is drawn from, so a batch is always in
 * place well before the player could see where it starts. Building on the frame
 * the road runs out would show as a stutter and, worse, as a gap.
 */
export const BATCH_AHEAD = 12000;
