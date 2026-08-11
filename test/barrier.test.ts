import { beforeEach, describe, expect, it } from 'vitest';
import {
    DROP_CONTACT_RADIUS,
    FORWARD_SPEED,
    LANE_CHANGE_SPEED,
    OBSTACLE_HALF_WIDTH,
    ORB_CATCH_RADIUS,
    SWIPE_REPEAT_DELAY,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../src/game/config/constants';
import { buildLevel, ORB_ROW_SPACING } from '../src/game/config/level';
import { DEFAULT_LANES } from '../src/game/config/constants';
import { LEVELS } from '../src/game/config/levels';
import { barrierCentre, barrierHalfWidth } from '../src/game/systems/barrier';
import { laneCenterX, laneCount, laneWidth, useLanes } from '../src/game/systems/Lanes';

describe('a moving barrier', () => {

    beforeEach(() => useLanes(DEFAULT_LANES));

    it('is somewhere different when it is reached, depending on where it sits', () => {

        //  The whole point of the kind. Sampled across a course's worth of
        //  distance, a slider must actually be found away from its lane - the
        //  phase used to be measured from the barrier's own distance, which put
        //  every one of them back home at the exact moment of contact.
        const homes = [];

        for (let distance = 0; distance < 4000; distance += 137)
        {
            homes.push(barrierCentre('slider', 1, distance) - laneCenterX(1));
        }

        expect(Math.max(...homes.map(Math.abs))).toBeGreaterThan(laneWidth() / 2);

    });

    it('never leaves the track', () => {

        for (let distance = 0; distance < 4000; distance += 53)
        {
            for (let lane = 0; lane < laneCount(); lane++)
            {
                const half = barrierHalfWidth('slider', distance);
                const centre = barrierCentre('slider', lane, distance);

                expect(centre - half).toBeGreaterThanOrEqual(TRACK_LEFT - 0.001);
                expect(centre + half).toBeLessThanOrEqual(TRACK_LEFT + TRACK_WIDTH + 0.001);
            }
        }

    });

    it('holds its lane when it is not a slider', () => {

        for (let distance = 0; distance < 2000; distance += 91)
        {
            expect(barrierCentre('static', 2, distance)).toBe(laneCenterX(2));
            expect(barrierCentre('pulse', 2, distance)).toBe(laneCenterX(2));
            expect(barrierHalfWidth('static', distance)).toBe(OBSTACLE_HALF_WIDTH);
        }

    });

});

/**
 * Whether the drop, sitting in the centre of `lane`, is clear of a barrier.
 *
 * The same rule the game collides with, which is what makes this worth
 * asserting: a level that fails here is one a player cannot get through.
 */
function isClear (lane: number, kind: 'static' | 'slider' | 'pulse', barrierLane: number, distance: number): boolean
{
    const gap = Math.abs(laneCenterX(lane) - barrierCentre(kind, barrierLane, distance));

    return gap >= barrierHalfWidth(kind, distance) + DROP_CONTACT_RADIUS;
}

describe('every level', () => {

    it('leaves a lane free of barriers on every row, whatever colour is carried', () => {

        for (const spec of LEVELS)
        {
            //  Lane positions depend on how many the level asked for.
            useLanes(spec.lanes ?? DEFAULT_LANES);

            const level = buildLevel(spec);

            //  Barriers grouped by the row they stand in, since it is the row
            //  as a whole that has to leave a way through.
            const rows = new Map<number, typeof level.obstacles>();

            for (const obstacle of level.obstacles)
            {
                rows.set(obstacle.distance, [ ...(rows.get(obstacle.distance) ?? []), obstacle ]);
            }

            for (const [ distance, obstacles ] of rows)
            {
                //  A row made entirely of hurdles has no free lane on purpose:
                //  the way through it is over it. Checked separately below.
                if (obstacles.every((o) => o.profile === 'low'))
                {
                    continue;
                }

                //  Worst case is carrying a colour none of them match, so none
                //  of them can be passed through.
                const free = [];

                for (let lane = 0; lane < laneCount(); lane++)
                {
                    if (obstacles.every((o) => isClear(lane, o.kind, o.lane, distance) || o.profile === 'low'))
                    {
                        free.push(lane);
                    }
                }

                expect(free.length, `level ${spec.name}, row at ${distance}`).toBeGreaterThan(0);
            }
        }

    });

    it('gives enough time between rows to reach any lane', () => {

        //  A free lane is only fair if the player can get to it. Worst case is
        //  crossing the whole track, asked for in one drag - which the repeat
        //  delay paces before the drop has a lane's width left to cover.
        for (const spec of LEVELS)
        {
            useLanes(spec.lanes ?? DEFAULT_LANES);

            const crossing = (Math.log(((laneCount() - 1) * laneWidth()) / ORB_CATCH_RADIUS) / LANE_CHANGE_SPEED) * 1000;
            const dragged = SWIPE_REPEAT_DELAY + ((Math.log(laneWidth() / ORB_CATCH_RADIUS) / LANE_CHANGE_SPEED) * 1000);

            const available = ((spec.rowSpacing ?? ORB_ROW_SPACING) / (spec.forwardSpeed ?? FORWARD_SPEED)) * 1000;

            expect(available, `level ${spec.name}, separate swipes`).toBeGreaterThan(crossing);
            expect(available, `level ${spec.name}, one drag`).toBeGreaterThan(dragged);
        }

    });

});
