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
    { level: 19, from: 75, to: 90 }
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
