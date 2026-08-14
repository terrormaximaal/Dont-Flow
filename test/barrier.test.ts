import { beforeEach, describe, expect, it } from 'vitest';
import {
    DROP_CONTACT_RADIUS,
    FORWARD_SPEED,
    LANE_CHANGE_SPEED,
    OBSTACLE_HALF_WIDTH,
    ORB_CATCH_RADIUS,
    SLIDER_PERIOD,
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
                //  A row made entirely of hurdles or holes has no free lane on
                //  purpose: the way through it is over it. That the row is
                //  entirely jumpable is checked in level.test.
                if (obstacles.every((o) => o.profile !== 'full'))
                {
                    continue;
                }

                //  Worst case is carrying a colour none of them match, so none
                //  of them can be passed through.
                const free = [];

                for (let lane = 0; lane < laneCount(); lane++)
                {
                    if (obstacles.every((o) => isClear(lane, o.kind, o.lane, distance) || o.profile !== 'full'))
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

            //  Per section, not per level. The old version took the level's
            //  tightest spacing and its fastest zone and put them together -
            //  but those live in different movements and never co-occur, so it
            //  was rejecting levels for a stretch of road that does not exist.
            for (const section of spec.sections)
            {
                const spacing = section.rowSpacing ?? spec.rowSpacing ?? ORB_ROW_SPACING;
                const speed = (spec.forwardSpeed ?? FORWARD_SPEED) * (section.speed ?? 1);
                const available = (spacing / speed) * 1000;

                expect(available, `level ${spec.name}, a section, separate swipes`).toBeGreaterThan(crossing);
                expect(available, `level ${spec.name}, a section, one drag`).toBeGreaterThan(dragged);
            }

            const spacing = spec.rowSpacing ?? ORB_ROW_SPACING;
            const speed = spec.forwardSpeed ?? FORWARD_SPEED;
            const available = (spacing / speed) * 1000;

            expect(available, `level ${spec.name}, separate swipes`).toBeGreaterThan(crossing);
            expect(available, `level ${spec.name}, one drag`).toBeGreaterThan(dragged);
        }

    });

    //  Every slider in the game runs off one clock, so they all sway the same
    //  way at the same moment. Two on a row therefore do not leave a gap that
    //  moves between them - they leave one that closes, because the one on the
    //  left comes in while the one on the right goes out.
    //
    //  The row-by-row check above does catch this, but only where a row happens
    //  to land: the same pair a few hundred pixels along passes. That makes it
    //  a trap rather than a rule, so the rule is stated here.
    it('never puts two sliders on the same row', () => {

        for (const spec of LEVELS)
        {
            for (const section of spec.sections)
            {
                if (section.obstacles !== 'slider')
                {
                    continue;
                }

                for (const row of section.rows)
                {
                    //  Full-height sliders only. A sliding hurdle is answered
                    //  by leaving the ground rather than by finding the lane
                    //  between them, so a row of those is not relying on a gap
                    //  and cannot be robbed of one.
                    const sliders = [ ...row ].filter((c) => 'abcde'.includes(c)).length;

                    expect(sliders, `level ${spec.name} row "${row}"`).toBeLessThanOrEqual(1);
                }
            }
        }

    });

    it('closes the lane between two sliders somewhere in their sway', () => {

        useLanes(DEFAULT_LANES);

        //  The claim the rule above rests on, checked rather than asserted:
        //  there is a point in the sway where a drop in the middle lane is
        //  inside one of a pair standing either side of it.
        let closed = false;

        for (let distance = 0; distance < SLIDER_PERIOD; distance += 7)
        {
            const trapped = [ 0, 2 ].some(
                (lane) => !isClear(1, 'slider', lane, distance)
            );

            closed ||= trapped;
        }

        expect(closed).toBe(true);

    });

});
