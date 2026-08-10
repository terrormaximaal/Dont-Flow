import { describe, expect, it } from 'vitest';
import {
    GAME_WIDTH,
    PROJECTION_PIVOT_Y,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../src/game/config/constants';
import { laneCenterX } from '../src/game/systems/Lanes';
import { depthScale, project, projectX } from '../src/game/systems/Projection';

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

    it('leans the far end one way and the near end the other', () => {

        const x = GAME_WIDTH / 2;

        expect(projectX(x, PROJECTION_PIVOT_Y - 200)).toBeLessThan(x);
        expect(projectX(x, PROJECTION_PIVOT_Y + 200)).toBeGreaterThan(x);

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

    //  A corridor that left the screen would hide oncoming orbs, which is the
    //  one thing the tilt must not cost.
    it('keeps the whole corridor on screen at the top of the view', () => {

        const left = projectX(TRACK_LEFT, 0);
        const right = projectX(TRACK_LEFT + TRACK_WIDTH, 0);

        expect(left).toBeGreaterThanOrEqual(0);
        expect(right).toBeLessThanOrEqual(GAME_WIDTH);

    });

});
