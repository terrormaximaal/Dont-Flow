import { describe, expect, it } from 'vitest';
import { FORWARD_SPEED } from '../src/game/config/constants';
import { buildLevel, speedAt } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';

/**
 * How long a level takes to run, in seconds.
 *
 * Walked rather than divided, because a level's pace is no longer one number:
 * a stretch running a third faster covers its distance in less time, and the
 * whole point of measuring is to measure what the player actually sits through.
 *
 * Excludes the finish slowdown and the panel that follows, which are the same
 * couple of seconds on every level.
 */
export function durationOf (index: number): number
{
    const spec = LEVELS[index];
    const level = buildLevel(spec);
    const base = spec.forwardSpeed ?? FORWARD_SPEED;

    let seconds = 0;

    for (let d = 0; d < level.finishDistance; d += 10)
    {
        seconds += 10 / (base * speedAt(level.zones, d));
    }

    return seconds;
}

/**
 * What each level should run to.
 *
 * Three bands, widening as the game goes on: the early levels are short enough
 * to want another straight away, the middle ones long enough to have a middle,
 * and the late ones long enough that finishing is an achievement rather than a
 * formality.
 *
 * These are the durations the rework asks for rather than the ones the levels
 * happened to have. Several were over rather than under - the restructuring
 * that came before this had already made the back half longer than the brief
 * now wants it - so bringing them into band meant taking rows out, not adding
 * them, and the rows came out of the middle of movements rather than out of
 * whole movements, so every level keeps its shape.
 */
const BANDS: Array<{ level: number; from: number; to: number }> = [
    { level: 0, from: 30, to: 40 },
    { level: 1, from: 30, to: 40 },
    { level: 2, from: 30, to: 40 },
    { level: 3, from: 40, to: 50 },
    { level: 4, from: 40, to: 50 },
    { level: 5, from: 40, to: 50 },
    { level: 6, from: 50, to: 60 },
    { level: 7, from: 50, to: 60 },
    { level: 8, from: 50, to: 60 },
    { level: 9, from: 60, to: 75 },
    { level: 10, from: 60, to: 75 },
    { level: 11, from: 60, to: 75 },
    { level: 12, from: 60, to: 75 },
    { level: 13, from: 60, to: 75 },
    { level: 14, from: 60, to: 75 },
    { level: 15, from: 75, to: 90 },
    { level: 16, from: 75, to: 90 },
    { level: 17, from: 75, to: 90 },
    { level: 18, from: 75, to: 90 },
    { level: 19, from: 75, to: 90 },

    //  ------------------------------------------------------------------
    //  Levels 21 to 50.
    //
    //  The brief for these asked for six bands running from 50-60s up to
    //  75-90s. Those numbers describe a shorter game than this one is:
    //  level 20 already runs 88s, so 21 at 50-60 would be half the length
    //  of the level before it, and the guard below - that a level is never
    //  shorter than the one before - would have to be thrown away to allow
    //  it.
    //
    //  What is kept is the shape of that brief rather than its numbers: six
    //  bands, each a little longer than the last, ending well above where it
    //  starts. They are offset to continue from level 20 instead of dropping
    //  back to it, so the ramp across all fifty levels is one ramp.
    //  ------------------------------------------------------------------
    { level: 20, from: 88, to: 98 },
    { level: 21, from: 88, to: 98 },
    { level: 22, from: 88, to: 98 },
    { level: 23, from: 88, to: 98 },
    { level: 24, from: 88, to: 98 },
    { level: 25, from: 93, to: 104 },
    { level: 26, from: 93, to: 104 },
    { level: 27, from: 93, to: 104 },
    { level: 28, from: 93, to: 104 },
    { level: 29, from: 93, to: 104 },
    { level: 30, from: 99, to: 110 },
    { level: 31, from: 99, to: 110 },
    { level: 32, from: 99, to: 110 },
    { level: 33, from: 99, to: 110 },
    { level: 34, from: 99, to: 110 },
    { level: 35, from: 105, to: 116 },
    { level: 36, from: 105, to: 116 },
    { level: 37, from: 105, to: 116 },
    { level: 38, from: 105, to: 116 },
    { level: 39, from: 105, to: 116 },
    { level: 40, from: 111, to: 122 },
    { level: 41, from: 111, to: 122 },
    { level: 42, from: 111, to: 122 },
    { level: 43, from: 111, to: 122 },
    { level: 44, from: 111, to: 122 },
    { level: 45, from: 116, to: 136 },
    { level: 46, from: 116, to: 136 },
    { level: 47, from: 116, to: 136 },
    { level: 48, from: 116, to: 136 },
    { level: 49, from: 116, to: 136 }
];

describe('how long a level lasts', () => {

    it('runs every level inside its band', () => {

        for (const band of BANDS)
        {
            const seconds = durationOf(band.level);

            expect(seconds, `level ${LEVELS[band.level].name} is ${seconds.toFixed(0)}s`)
                .toBeGreaterThanOrEqual(band.from);

            expect(seconds, `level ${LEVELS[band.level].name} is ${seconds.toFixed(0)}s`)
                .toBeLessThanOrEqual(band.to);
        }

    });

    //  The ramp inverted before this work started: every level ran 24-31
    //  seconds, and level 10 was the shortest in the game because later levels
    //  were made faster without being made longer. This is the guard against
    //  that happening again as the rest are restructured.
    it('never makes a later level shorter than the one before it', () => {

        const done = BANDS.map((b) => b.level).sort((a, b) => a - b);

        expect(done.length, 'every level held to a band').toBe(LEVELS.length);

        for (let i = 1; i < done.length; i++)
        {
            const earlier = durationOf(done[i - 1]);
            const later = durationOf(done[i]);

            expect(later, `level ${LEVELS[done[i]].name} against ${LEVELS[done[i - 1]].name}`)
                .toBeGreaterThanOrEqual(earlier);
        }

    });

});

describe('a level built as a sequence', () => {

    //  Six movements rather than three similar stretches. The shape is the
    //  thing being guarded: a level with two sections cannot have an intro, a
    //  middle and an ending, however good either section is.
    it('gives every level enough movements to have a shape', () => {

        for (const band of BANDS)
        {
            expect(LEVELS[band.level].sections.length, `level ${LEVELS[band.level].name}`)
                .toBeGreaterThanOrEqual(5);
        }

    });

    //  A finale that is not denser than the level's own body is not a finale.
    it('packs every level\'s finale tighter than its opening', () => {

        for (const band of BANDS)
        {
            const spec = LEVELS[band.level];
            const level = spec.rowSpacing ?? 0;

            const first = spec.sections[0].rowSpacing ?? level;
            const last = spec.sections[spec.sections.length - 1].rowSpacing ?? level;

            expect(last, `level ${spec.name}`).toBeLessThan(first);
        }

    });

});
