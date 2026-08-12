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
 * Only the levels that have been restructured are held to a band so far;
 * the rest are recorded below as a list of what is still to do, rather than
 * as a passing test that quietly says nothing.
 */
const BANDS: Array<{ level: number; from: number; to: number }> = [
    { level: 0, from: 30, to: 45 }
];

describe('how long a level lasts', () => {

    it('runs each restructured level inside its band', () => {

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
    it('gives level one enough movements to have a shape', () => {

        expect(LEVELS[0].sections.length).toBeGreaterThanOrEqual(5);

    });

    //  A finale that is not denser than the level's own body is not a finale.
    it('packs level one\'s last section tighter than its first', () => {

        const spec = LEVELS[0];
        const level = spec.rowSpacing ?? 0;

        const first = spec.sections[0].rowSpacing ?? level;
        const last = spec.sections[spec.sections.length - 1].rowSpacing ?? level;

        expect(last).toBeLessThan(first);

    });

});
