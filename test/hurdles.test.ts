import { describe, expect, it } from 'vitest';
import { DEFAULT_LANES, JUMP_SPAN } from '../src/game/config/constants';
import { buildLevel } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';
import { canClear, oneJumpWindow, ROW_MARGIN } from './helpers/jumpReach';

/**
 * The distances at which a level's road is blocked all the way across by things
 * that can only be cleared from above.
 *
 * These are the rows that force a jump: there is no lane to steer into, so the
 * spacing between them is the only thing deciding whether they are possible.
 */
function forcedJumps (index: number): number[]
{
    const spec = LEVELS[index];
    const lanes = spec.lanes ?? DEFAULT_LANES;
    const level = buildLevel(spec);

    const rows = new Map<number, { blocked: Set<number>; allJumpable: boolean }>();

    for (const obstacle of level.obstacles)
    {
        const row = rows.get(obstacle.distance)
            ?? { blocked: new Set<number>(), allJumpable: true };

        row.blocked.add(obstacle.lane);

        //  A wall on the row means the row is not a forced jump - it is either
        //  passed by colour or not passed at all, and level.test guards that
        //  case separately.
        if (obstacle.profile === 'full')
        {
            row.allJumpable = false;
        }

        rows.set(obstacle.distance, row);
    }

    return [ ...rows.entries() ]
        .filter(([ , row ]) => row.blocked.size >= lanes && row.allJumpable)
        .map(([ distance ]) => distance)
        .sort((a, b) => a - b);
}

/**
 * Forced jumps split into the groups a single arc has to carry.
 *
 * Anything close enough to the row before it to be under the same arc belongs
 * to the same group; anything further starts a new one, and so needs a jump of
 * its own.
 */
function groupsOf (distances: number[]): number[][]
{
    const groups: number[][] = [];

    for (const distance of distances)
    {
        const current = groups[groups.length - 1];

        if (current !== undefined && distance - current[current.length - 1] <= oneJumpWindow())
        {
            current.push(distance);

            continue;
        }

        groups.push([ distance ]);
    }

    return groups;
}

describe('how far a jump reaches', () => {

    //  Measured from the arc rather than written down beside it, so it stays
    //  true if the arc is ever retuned. Two numbers matter here and they are
    //  not the same number: how much road one jump covers, and how much road
    //  two jumps need.
    it('covers less road in one arc than two arcs need', () => {

        expect(oneJumpWindow()).toBeGreaterThan(0);
        expect(oneJumpWindow()).toBeLessThan(JUMP_SPAN);

    });

    it('clears two things inside one arc', () => {

        expect(canClear(0)).toBe(true);
        expect(canClear(oneJumpWindow())).toBe(true);

    });

    it('clears two things far enough apart to land between them', () => {

        expect(canClear(JUMP_SPAN)).toBe(true);
        expect(canClear(JUMP_SPAN * 3)).toBe(true);

    });

    //  The whole reason this file exists. Between "one arc covers both" and
    //  "there is time to land and go again" is a band of spacings that cannot
    //  be cleared at all - not by playing better, not at any speed, because the
    //  drop is still coming down when the second one arrives. A level that
    //  spaces two full-width hurdles into that band is unfinishable, and
    //  nothing else in the suite would notice.
    it('cannot clear two things spaced into the dead band', () => {

        const middle = (oneJumpWindow() + JUMP_SPAN) / 2;

        expect(middle).toBeGreaterThan(oneJumpWindow());
        expect(middle).toBeLessThan(JUMP_SPAN);
        expect(canClear(middle)).toBe(false);

    });

});

describe('the forced jumps in the shipped levels', () => {

    it('fit every group of them under one arc, with room to spare', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            for (const group of groupsOf(forcedJumps(index)))
            {
                const span = group[group.length - 1] - group[0];

                expect(span, `level ${spec.name}: ${group.length} rows spanning ${span.toFixed(0)}`)
                    .toBeLessThanOrEqual(oneJumpWindow() - ROW_MARGIN);
            }
        }

    });

    it('leave room to land and take off again between groups', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            const groups = groupsOf(forcedJumps(index));

            for (let i = 1; i < groups.length; i++)
            {
                const previous = groups[i - 1];
                const gap = groups[i][0] - previous[previous.length - 1];

                expect(gap, `level ${spec.name}: groups ${gap.toFixed(0)} apart`)
                    .toBeGreaterThanOrEqual(JUMP_SPAN + ROW_MARGIN);
            }
        }

    });

    //  Level seven is where the jump is taught. It moved there from level six
    //  when the difficulty curve was set out properly: the first three levels
    //  learn, the next three take control, and jumping belongs with the levels
    //  that apply pressure rather than with the ones still teaching lanes.
    it('teach the jump on level seven, after it has settled', () => {

        const distances = forcedJumps(6);

        expect(distances.length, 'level 7').toBeGreaterThan(0);

        //  Not in the opening section: the first hurdle a player ever meets
        //  should arrive after a stretch of road they already know how to read,
        //  not on the first gate.
        expect(distances[0]).toBeGreaterThan(buildLevel(LEVELS[6]).gates[1].distance);

    });

    //  Nothing before level seven may demand one, because nothing before level
    //  seven has been shown how.
    it('never demand one before the jump has been taught', () => {

        for (let index = 0; index < 6; index++)
        {
            expect(forcedJumps(index), `level ${LEVELS[index].name}`).toEqual([]);
        }

    });

});
