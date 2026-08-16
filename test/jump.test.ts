import { describe, expect, it } from 'vitest';
import {
    DIVE_SPAN,
    JUMP_CLEAR_HEIGHT,
    JUMP_SPAN,
    SWIPE_DOWN_THRESHOLD,
    SWIPE_UP_THRESHOLD
} from '../src/game/config/constants';
import { isBlockedBy } from '../src/game/systems/contact';
import { divingHeight, hasDived, hasLanded, jumpHeight } from '../src/game/systems/jump';
import { evaluateDrag } from '../src/game/systems/swipe';

describe('the jump arc', () => {

    it('starts and ends on the road', () => {

        expect(jumpHeight(1000, 1000)).toBe(0);
        expect(jumpHeight(1000 + JUMP_SPAN, 1000)).toBe(0);

    });

    it('peaks in the middle', () => {

        expect(jumpHeight(1000 + (JUMP_SPAN / 2), 1000)).toBeCloseTo(1, 10);

    });

    it('is on the road whenever nothing has been jumped', () => {

        for (let travelled = 0; travelled < 5000; travelled += 137)
        {
            expect(jumpHeight(travelled, null)).toBe(0);
        }

    });

    //  Total in both directions. A caller that asks about a distance outside
    //  the arc gets an answer rather than a negative height, which would put
    //  the drop underground and read as an unrecoverable glitch.
    it('never goes below the road, at any distance', () => {

        for (let travelled = -3000; travelled < 6000; travelled += 41)
        {
            const height = jumpHeight(travelled, 1000);

            expect(height).toBeGreaterThanOrEqual(0);
            expect(height).toBeLessThanOrEqual(1);
        }

    });

    //  Zero height happens twice - at takeoff and at landing - so height alone
    //  cannot tell a caller whether the jump is over.
    it('reports landing separately from height', () => {

        expect(hasLanded(1000, 1000)).toBe(false);
        expect(hasLanded(1000 + (JUMP_SPAN / 2), 1000)).toBe(false);
        expect(hasLanded(1000 + JUMP_SPAN, 1000)).toBe(true);
        expect(hasLanded(0, null)).toBe(true);

    });

    //  The whole reason the arc is measured in distance. A jump timed in
    //  seconds would clear a different length of road on every level, so a
    //  hurdle clearable on level 1 could be unclearable on level 10 purely
    //  because the road moves faster.
    it('clears the same length of road whatever the speed', () => {

        const clearedFrom = (takeoff: number) => {

            let first = null;
            let last = null;

            for (let d = takeoff; d <= takeoff + JUMP_SPAN; d += 1)
            {
                if (jumpHeight(d, takeoff) >= JUMP_CLEAR_HEIGHT)
                {
                    if (first === null) { first = d; }

                    last = d;
                }
            }

            return (last ?? 0) - (first ?? 0);
        };

        expect(clearedFrom(0)).toBe(clearedFrom(50000));

    });

});

describe('a low barrier', () => {

    it('blocks a drop on the road', () => {

        expect(isBlockedBy(240, 240, 30, 0, 'low')).toBe(true);

    });

    it('is cleared by a drop high enough', () => {

        expect(isBlockedBy(240, 240, 30, JUMP_CLEAR_HEIGHT, 'low')).toBe(false);
        expect(isBlockedBy(240, 240, 30, 1, 'low')).toBe(false);

    });

    it('still blocks a drop that has barely left the ground', () => {

        expect(isBlockedBy(240, 240, 30, JUMP_CLEAR_HEIGHT - 0.01, 'low')).toBe(true);

    });

});

describe('a full-height barrier', () => {

    //  The regression that matters. Every level in the game was built before
    //  jumping existed, and none of them contains a low barrier - so if a full
    //  barrier ever stopped blocking a jumping drop, all ten would change.
    it('cannot be jumped, at any height', () => {

        for (let height = 0; height <= 1; height += 0.05)
        {
            expect(isBlockedBy(240, 240, 30, height, 'full'), `height ${height}`).toBe(true);
        }

    });

    //  Called with neither argument by anything written before the jump.
    it('behaves exactly as it did before height existed', () => {

        for (const [ dropX, obstacleX, half ] of [ [ 240, 240, 30 ], [ 240, 300, 30 ], [ 100, 240, 80 ] ])
        {
            expect(isBlockedBy(dropX, obstacleX, half))
                .toBe(isBlockedBy(dropX, obstacleX, half, 0, 'full'));
        }

    });

});

describe('the jump gesture', () => {

    const anchor = { x: 200, y: 600 };

    it('reads a clear upward flick as a jump', () => {

        const result = evaluateDrag(anchor, 200, 600 - 60);

        expect(result.jump).toBe(true);
        expect(result.intent).toBe(0);

    });

    it('does not jump on a downward drag', () => {

        expect(evaluateDrag(anchor, 200, 600 + 60).jump).toBe(false);

    });

    //  Steering is what the player does constantly, so a diagonal gets read as
    //  a hurried lane change rather than as a jump.
    it('prefers steering when a flick is both up and across', () => {

        const result = evaluateDrag(anchor, 200 + 70, 600 - 40);

        expect(result.intent).toBe(1);
        expect(result.jump).toBe(false);

    });

    it('ignores an upward twitch too small to be meant', () => {

        expect(evaluateDrag(anchor, 200, 600 - 8).jump).toBe(false);

    });

    //  A jump has to re-anchor, or one flick keeps reporting itself on every
    //  further pointer move and the drop jumps continuously.
    it('measures the next move from where the jump was asked for', () => {

        const result = evaluateDrag(anchor, 205, 600 - 60);

        expect(result.anchor).toEqual({ x: 205, y: 540 });

    });

});


describe('the gesture that asks for the ground', () => {

    const from = { x: 100, y: 300 };

    it('reads a clear downward flick as a dive', () => {

        const result = evaluateDrag(from, 100, 300 + SWIPE_DOWN_THRESHOLD);

        expect(result.dive).toBe(true);
        expect(result.jump, 'and never as a jump').toBe(false);
        expect(result.intent, 'and never as a lane change').toBe(0);

    });

    //  Down is the direction a finger wanders in between lane changes, which is
    //  why the drag rules re-anchor on it. A dive has to be meant.
    it('ignores a downward drift too small to be meant', () => {

        expect(evaluateDrag(from, 100, 300 + SWIPE_DOWN_THRESHOLD - 1).dive).toBe(false);

    });

    it('takes more of a throw than a jump does', () => {

        expect(SWIPE_DOWN_THRESHOLD).toBeGreaterThan(SWIPE_UP_THRESHOLD);

    });

    //  The same rule the jump is held to: steering is what a player does
    //  constantly, so a flick that is both down and clearly across is read as
    //  a lane change.
    it('prefers steering when a flick is both down and across', () => {

        const result = evaluateDrag(from, 100 + 110, 300 + SWIPE_DOWN_THRESHOLD);

        expect(result.dive).toBe(false);
        expect(result.intent).toBe(1);

    });

    //  And one that is neither clearly down nor clearly across asks for
    //  nothing at all, rather than guessing.
    it('does nothing with a flick that commits to neither', () => {

        const result = evaluateDrag(from, 100 + 60, 300 + SWIPE_DOWN_THRESHOLD);

        expect(result.dive).toBe(false);
        expect(result.intent).toBe(0);

    });

});

describe('coming back down on purpose', () => {

    //  Asked for by name: a swipe up leaves the road, and a swipe down while
    //  still in the air should get the drop back to it sooner than the arc
    //  would have.
    it('starts from exactly where the drop was', () => {

        //  Nothing may jump at the moment the gesture lands. A dive that began
        //  by snapping the drop to some other height would read as a glitch,
        //  however quickly it then fell.
        expect(divingHeight(400, 400, 0.8)).toBeCloseTo(0.8, 6);
        expect(divingHeight(399, 400, 0.8)).toBeCloseTo(0.8, 6);

    });

    it('reaches the road, and stays there', () => {

        const from = 400;
        const height = 0.8;

        expect(divingHeight(from + (DIVE_SPAN * height), from, height)).toBe(0);
        expect(divingHeight(from + 10000, from, height)).toBe(0);

    });

    it('never rises on the way', () => {

        let last = 1;

        for (let moved = 0; moved <= DIVE_SPAN; moved += 5)
        {
            const now = divingHeight(400 + moved, 400, 1);

            expect(now).toBeLessThanOrEqual(last);

            last = now;
        }

    });

    //  One speed, wherever it was asked for. A fixed span instead would make a
    //  dive from the top of the arc quick and one from just above the road a
    //  slow float, which is backwards - the higher you are, the further there
    //  is to fall.
    it('comes down at the same rate from any height', () => {

        const rate = (height: number) => {

            const half = divingHeight(400 + (DIVE_SPAN * height * 0.5), 400, height);

            return (height - half) / (DIVE_SPAN * height * 0.5);
        };

        expect(rate(1)).toBeCloseTo(rate(0.25), 6);

    });

    it('takes less road from lower down', () => {

        expect(hasDived(400 + 40, 400, 1), 'from the top').toBe(false);
        expect(hasDived(400 + 40, 400, 0.2), 'from just above the road').toBe(true);

    });

    //  A dive that beat the arc it replaced would be a way of asking for a
    //  shorter jump rather than for the ground.
    it('is quicker than the fall it replaces', () => {

        expect(DIVE_SPAN).toBeLessThan(JUMP_SPAN / 2);

    });

});
