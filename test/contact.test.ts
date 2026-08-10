import { describe, expect, it } from 'vitest';
import {
    DROP_RADIUS,
    ORB_CATCH_RADIUS,
    ORB_RADIUS,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../src/game/config/constants';
import { gateSideAt, gateSplitX, isWithinCatchRange } from '../src/game/systems/contact';
import { laneCenterX, laneCount, laneWidth, useLanes } from '../src/game/systems/Lanes';

//  Gate splits sit on a lane boundary, so these all assume the standard road.
useLanes(3);

describe('gate sides', () => {

    it('meet on a lane boundary, never inside a lane', () => {

        //  The whole reason the split is expressed as a lane index: a boundary
        //  inside a lane would make that lane's colour a coin flip.
        for (const split of [ 0, 1 ] as const)
        {
            const x = gateSplitX(split);
            const offsetIntoTrack = x - TRACK_LEFT;

            expect(offsetIntoTrack % laneWidth()).toBe(0);
        }

    });

    it('put every lane unambiguously in one gate or the other', () => {

        //  Split after lane 0: lane 0 left, lanes 1 and 2 right.
        expect(gateSideAt(laneCenterX(0), 0)).toBe(0);
        expect(gateSideAt(laneCenterX(1), 0)).toBe(1);
        expect(gateSideAt(laneCenterX(2), 0)).toBe(1);

        //  Split after lane 1: lanes 0 and 1 left, lane 2 right.
        expect(gateSideAt(laneCenterX(0), 1)).toBe(0);
        expect(gateSideAt(laneCenterX(1), 1)).toBe(0);
        expect(gateSideAt(laneCenterX(2), 1)).toBe(1);

    });

    it('together span the whole track', () => {

        for (const split of [ 0, 1 ] as const)
        {
            expect(gateSideAt(TRACK_LEFT, split)).toBe(0);
            expect(gateSideAt(TRACK_LEFT + TRACK_WIDTH - 1, split)).toBe(1);
        }

    });

    it('assign the boundary itself to the right-hand gate', () => {

        for (const split of [ 0, 1 ] as const)
        {
            const x = gateSplitX(split);

            expect(gateSideAt(x - 0.001, split)).toBe(0);
            expect(gateSideAt(x, split)).toBe(1);
        }

    });

});

describe('catching an orb', () => {

    it('counts when the drop is in the orb\'s lane', () => {

        for (let lane = 0; lane < laneCount(); lane++)
        {
            expect(isWithinCatchRange(laneCenterX(lane), laneCenterX(lane))).toBe(true);
        }

    });

    it('does not reach into the neighbouring lane', () => {

        //  Sitting in one lane must never collect the orb beside it, or a clean
        //  line through the level would break a combo by accident.
        expect(isWithinCatchRange(laneCenterX(0), laneCenterX(1))).toBe(false);
        expect(isWithinCatchRange(laneCenterX(1), laneCenterX(0))).toBe(false);
        expect(isWithinCatchRange(laneCenterX(1), laneCenterX(2))).toBe(false);
        expect(isWithinCatchRange(laneCenterX(2), laneCenterX(1))).toBe(false);

    });

    //  A property the tuning has to keep: two catch zones must not overlap, or a
    //  drop between lanes could collect both orbs of a row at once - including
    //  the one it was steering around.
    it('cannot reach two lanes at once, whatever the tuning', () => {

        expect(ORB_CATCH_RADIUS * 2).toBeLessThan(laneWidth());

    });

    //  And the other side of it: the zone must be at least the two radii, or a
    //  visibly overlapping orb would pass through the drop uncollected.
    it('covers the two shapes actually touching', () => {

        expect(ORB_CATCH_RADIUS).toBeGreaterThanOrEqual(DROP_RADIUS + ORB_RADIUS);

    });

    it('is symmetric', () => {

        const a = laneCenterX(1);
        const b = a + ORB_CATCH_RADIUS - 1;

        expect(isWithinCatchRange(a, b)).toBe(isWithinCatchRange(b, a));

    });

    it('excludes the boundary itself', () => {

        const a = laneCenterX(1);

        expect(isWithinCatchRange(a, a + ORB_CATCH_RADIUS - 0.001)).toBe(true);
        expect(isWithinCatchRange(a, a + ORB_CATCH_RADIUS)).toBe(false);

    });

});
