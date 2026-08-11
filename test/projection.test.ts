import { describe, expect, it } from 'vitest';
import {
    DEFAULT_LANES,
    GAME_WIDTH,
    HORIZON_Y,
    PROJECTION_PIVOT_Y,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../src/game/config/constants';
import { laneCenterX, useLanes } from '../src/game/systems/Lanes';
import { depthScale, project, projectX, VANISH_X } from '../src/game/systems/Projection';

describe('the projection', () => {

    //  The property that makes the tilt safe: at the drop's own depth the world
    //  is exactly where it was authored, so the lane the player is steering in
    //  never shifts under them, and collision - which works in track space -
    //  agrees with what is drawn.
    it('is identity at the drop\'s line', () => {

        for (let lane = 0; lane < 3; lane++)
        {
            const x = laneCenterX(lane);

            expect(projectX(x, PROJECTION_PIVOT_Y)).toBeCloseTo(x, 10);
        }

        expect(depthScale(PROJECTION_PIVOT_Y)).toBeCloseTo(1, 10);

    });

    it('pulls the far end towards the vanishing point and the near end away', () => {

        //  Taken off the centreline, since a point already on the vanishing
        //  point's own column has nowhere to converge to.
        const x = TRACK_LEFT;

        //  Further off is closer to the middle; nearer is further out.
        expect(projectX(x, PROJECTION_PIVOT_Y - 200)).toBeGreaterThan(x);
        expect(projectX(x, PROJECTION_PIVOT_Y + 200)).toBeLessThan(x);

    });

    it('narrows with distance and widens as things arrive', () => {

        expect(depthScale(PROJECTION_PIVOT_Y - 300)).toBeLessThan(1);
        expect(depthScale(PROJECTION_PIVOT_Y + 100)).toBeGreaterThan(1);

    });

    it('keeps the corridor centred on itself as it narrows', () => {

        //  The two edges close in together rather than one sliding across the
        //  other, so the middle lane stays the middle lane at every depth.
        const y = PROJECTION_PIVOT_Y - 400;

        const left = projectX(TRACK_LEFT, y);
        const right = projectX(TRACK_LEFT + TRACK_WIDTH, y);
        const middle = projectX(TRACK_LEFT + (TRACK_WIDTH / 2), y);

        expect(middle).toBeCloseTo((left + right) / 2, 10);

    });

    //  Everything in the corridor is drawn by projecting only the two ends of a
    //  line. That is only correct because the projection is affine - if it were
    //  not, lane dividers would have to be drawn as curves.
    it('is affine, so straight lines stay straight', () => {

        const x = TRACK_LEFT + 40;
        const near = PROJECTION_PIVOT_Y + 200;
        const far = PROJECTION_PIVOT_Y - 500;
        const middle = (near + far) / 2;

        const projectedMidpoint = projectX(x, middle);
        const midpointOfProjection = (projectX(x, near) + projectX(x, far)) / 2;

        expect(projectedMidpoint).toBeCloseTo(midpointOfProjection, 10);

    });

    it('reports a matching x and scale from either entry point', () => {

        const y = PROJECTION_PIVOT_Y - 250;
        const x = laneCenterX(2);
        const projected = project(x, y);

        expect(projected.x).toBeCloseTo(projectX(x, y), 10);
        expect(projected.scale).toBeCloseTo(depthScale(y), 10);
        expect(projected.y).toBe(y);

    });

    it('collapses the road to the vanishing point at the horizon', () => {

        expect(depthScale(HORIZON_Y)).toBeCloseTo(0, 10);
        expect(projectX(TRACK_LEFT, HORIZON_Y)).toBeCloseTo(VANISH_X, 10);
        expect(projectX(TRACK_LEFT + TRACK_WIDTH, HORIZON_Y)).toBeCloseTo(VANISH_X, 10);

    });

    //  A road that left the screen would hide oncoming objects, which is the
    //  one thing the perspective must not cost. Everything between the horizon
    //  and the player has to stay in view.
    it('keeps the road on screen for its whole visible length', () => {

        for (let y = HORIZON_Y; y <= PROJECTION_PIVOT_Y; y += 10)
        {
            const left = projectX(TRACK_LEFT, y);
            const right = projectX(TRACK_LEFT + TRACK_WIDTH, y);

            expect(left, `left edge at y=${Math.round(y)}`).toBeGreaterThanOrEqual(0);
            expect(right, `right edge at y=${Math.round(y)}`).toBeLessThanOrEqual(GAME_WIDTH);
        }

    });

    //  The road used to converge left of centre, which swung its far end to one
    //  side while the near end stayed under the player: the whole world read as
    //  skewed across the screen rather than running away from the camera. These
    //  four hold it straight. They are about yaw only - HORIZON_Y still sets the
    //  pitch, and none of them constrains how deep the view is.
    it('puts the vanishing point dead centre', () => {

        expect(VANISH_X).toBeCloseTo(GAME_WIDTH / 2, 10);

    });

    it('runs the road\'s centreline straight up the middle', () => {

        const centre = TRACK_LEFT + (TRACK_WIDTH / 2);

        for (let y = HORIZON_Y; y <= PROJECTION_PIVOT_Y; y += 10)
        {
            expect(projectX(centre, y), `centreline at y=${Math.round(y)}`)
                .toBeCloseTo(GAME_WIDTH / 2, 10);
        }

    });

    it('balances the road\'s two edges about the centre at every depth', () => {

        const right = TRACK_LEFT + TRACK_WIDTH;

        for (let y = HORIZON_Y; y <= PROJECTION_PIVOT_Y; y += 10)
        {
            const fromLeft = (GAME_WIDTH / 2) - projectX(TRACK_LEFT, y);
            const fromRight = projectX(right, y) - (GAME_WIDTH / 2);

            expect(fromLeft, `edges at y=${Math.round(y)}`).toBeCloseTo(fromRight, 10);
        }

    });

    it('mirrors the outer lanes about the centre', () => {

        for (const count of [ 2, 3 ])
        {
            useLanes(count);

            for (let y = HORIZON_Y; y <= PROJECTION_PIVOT_Y; y += 20)
            {
                const first = projectX(laneCenterX(0), y);
                const last = projectX(laneCenterX(count - 1), y);

                expect((first + last) / 2, `${count} lanes at y=${Math.round(y)}`)
                    .toBeCloseTo(GAME_WIDTH / 2, 10);
            }
        }

        useLanes(DEFAULT_LANES);

    });

});
