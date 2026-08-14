import { describe, expect, it } from 'vitest';
import { DEFAULT_LANES, JUMP_BUFFER, JUMP_SPAN } from '../src/game/config/constants';
import { buildLevel } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';
import { bufferedTakeoff } from '../src/game/systems/jump';
import { canClear, oneJumpWindow, ROW_MARGIN, twoJumpMinimum } from './helpers/jumpReach';

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
    //  "there is time to land and go again" there used to be a band of
    //  spacings that could not be cleared at all - not by playing better, not
    //  at any speed - and level six shipped two hurdles inside it.
    //
    //  The jump buffer closed that band. Leaving the ground again on the frame
    //  the drop lands is now something a player can ask for in advance rather
    //  than something they have to hit exactly, so the spacings that needed it
    //  are reachable. This is the guard that the band really is closed, and it
    //  is written as a scan rather than as one sample: a band that reopened
    //  anywhere would be just as unfinishable as the old one.
    it('leaves no spacing between the two ways through that cannot be cleared', () => {

        for (let gap = 0; gap <= JUMP_SPAN * 2; gap += 1)
        {
            expect(canClear(gap), `hurdles ${gap} apart`).toBe(true);
        }

    });

    //  And why it is closed, which is the part that could quietly stop being
    //  true. The band is gone because the two ways through now overlap: the
    //  closest spacing that can be taken as two jumps is nearer than the
    //  furthest that fits under one. Shortening the arc or raising the height
    //  needed to clear a hurdle would pull them apart again and reopen it,
    //  and this is the guard that would say so.
    it('closes it by overlapping the two ways through, not by luck', () => {

        expect(twoJumpMinimum(), 'the closest spacing two jumps can take')
            .toBeLessThanOrEqual(oneJumpWindow());

    });

    //  The check would pass everything if the second threshold collapsed to
    //  zero, so this is the guard that it is a real threshold.
    it('still needs the drop to have climbed by the second one', () => {

        expect(twoJumpMinimum()).toBeGreaterThan(0);

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

    //  Comfort rather than possibility. Since the buffer, two groups only
    //  eighty-odd pixels apart can be taken as two jumps - but barely possible
    //  is not the same as worth playing, and a full span between groups is
    //  what gives the drop time to land, settle and be sent again. The levels
    //  are held to the comfortable figure on purpose.
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

describe('a jump asked for just before landing', () => {

    it('is honoured, and from the landing rather than from the frame', () => {

        //  Asked for a little before touchdown: the second arc starts exactly
        //  where the first ended, not wherever the frame happened to notice.
        expect(bufferedTakeoff(1000, 1000 - (JUMP_BUFFER / 2))).toBe(1000);
        expect(bufferedTakeoff(1000, 1000)).toBe(1000);

    });

    it('is dropped when it was asked for too long ago', () => {

        expect(bufferedTakeoff(1000, 1000 - JUMP_BUFFER - 1)).toBeNull();
        expect(bufferedTakeoff(1000, 0)).toBeNull();

    });

    it('does nothing at all when none was asked for', () => {

        expect(bufferedTakeoff(1000, null)).toBeNull();

    });

    //  The reason the buffer exists, stated as the case it was added for. Two
    //  groups of hurdles sit a span apart plus the authoring margin. A player
    //  who left the ground as late as the arc allows lands with only that
    //  margin of road left to ask for the next jump - so the buffer has to
    //  cover the margin, or the latest possible jump is punished for being
    //  legal.
    it('covers the window left by taking off as late as the arc allows', () => {

        const clearedFrom = (JUMP_SPAN - oneJumpWindow()) / 2;

        //  Hurdle at 0, taking off as late as still clears it.
        const latest = -clearedFrom;
        const landed = latest + JUMP_SPAN;

        //  The next group, and the last moment a jump can start and still
        //  clear it.
        const next = JUMP_SPAN + ROW_MARGIN;
        const mustLeaveBy = next - clearedFrom;

        const window = mustLeaveBy - landed;

        expect(window, 'the window this exists to cover').toBeLessThan(JUMP_BUFFER);
        expect(window, 'and it is a real window, not a negative one').toBeGreaterThan(0);

    });

});
