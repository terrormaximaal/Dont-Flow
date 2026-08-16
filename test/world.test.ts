import { describe, expect, it } from 'vitest';
import {
    BEHIND_RATE,
    DRAW_DISTANCE,
    DROP_SCREEN_Y,
    FADE_IN_DISTANCE,
    GAME_HEIGHT,
    HORIZON_Y,
    PERSPECTIVE_DEPTH
} from '../src/game/config/constants';
import { depthScale, project, projectX, VANISH_X } from '../src/game/systems/Projection';
import { drawStrength, screenYFor } from '../src/game/systems/World';

//  The one place distance becomes a picture.
//
//  Nothing here decides a hit - collision is a comparison of track coordinates
//  and never consults any of this - but everything the player reads is drawn
//  through it, and it had no guards at all. A camera that can be raised or
//  flattened without a gameplay consequence is only worth having if the raising
//  cannot quietly break what the player sees.

describe('where a thing on the road is drawn', () => {

    //  The one fixed point the whole game is built on: an object is on the drop
    //  at the moment its distance is reached, which is also the moment it
    //  counts as hit. If these two ever disagree, the game is lying about what
    //  it just did to the player.
    it('puts an object on the drop exactly when it is reached', () => {

        expect(screenYFor(1000, 1000)).toBeCloseTo(DROP_SCREEN_Y, 6);
        expect(screenYFor(0, 0)).toBeCloseTo(DROP_SCREEN_Y, 6);

    });

    it('never lets anything ahead reach the horizon', () => {

        for (const ahead of [ 1, 100, DRAW_DISTANCE, 1e6 ])
        {
            expect(screenYFor(ahead, 0), `${ahead} away`).toBeGreaterThan(HORIZON_Y);
        }

    });

    it('brings everything closer as the run goes on, and never back', () => {

        let last = -Infinity;

        for (let travelled = 0; travelled <= 2000; travelled += 25)
        {
            const y = screenYFor(2000, travelled);

            expect(y, `at ${travelled}`).toBeGreaterThanOrEqual(last);

            last = y;
        }

    });

    //  Distance is not linear on screen, which is the whole reason the road
    //  reads as depth rather than as a list going past. The far half of what
    //  can be seen has to take up much less of the screen than the near half.
    it('bunches the far field and spreads the near one', () => {

        const near = screenYFor(PERSPECTIVE_DEPTH, 0) - screenYFor(0, 0);
        const far = screenYFor(DRAW_DISTANCE, 0) - screenYFor(DRAW_DISTANCE - PERSPECTIVE_DEPTH, 0);

        expect(Math.abs(far), 'the same length of road, far away').toBeLessThan(Math.abs(near) / 4);

    });

    //  Behind the player it is a straight line, because there is no depth left
    //  to show. What matters is that it keeps going: an object that stopped
    //  moving once it passed would sit on the screen for ever.
    it('carries something past the drop and out of the bottom', () => {

        expect(screenYFor(0, 1)).toBeCloseTo(DROP_SCREEN_Y + BEHIND_RATE, 6);

        const gone = screenYFor(0, 10000);

        expect(gone, 'well past the bottom of the screen').toBeGreaterThan(GAME_HEIGHT);

    });

    it('has an answer at every distance, including the impossible ones', () => {

        for (const [ distance, travelled ] of [ [ 0, 0 ], [ -500, 0 ], [ 1e9, 0 ], [ 0, 1e9 ] ])
        {
            expect(Number.isFinite(screenYFor(distance, travelled)), `${distance} at ${travelled}`).toBe(true);
        }

    });

});

describe('how strongly a thing is drawn', () => {

    it('is nothing beyond the draw distance and everything well inside it', () => {

        expect(drawStrength(DRAW_DISTANCE, 0)).toBe(0);
        expect(drawStrength(DRAW_DISTANCE + 5000, 0)).toBe(0);
        expect(drawStrength(0, 0)).toBe(1);
        expect(drawStrength(DRAW_DISTANCE - FADE_IN_DISTANCE, 0)).toBe(1);

    });

    //  Nothing pops into existence on the horizon, which is the only thing this
    //  is for. That means it has to climb without a step in it.
    it('fades up rather than appearing', () => {

        let last = 0;

        for (let ahead = DRAW_DISTANCE; ahead >= 0; ahead -= 25)
        {
            const now = drawStrength(ahead, 0);

            expect(now, `${ahead} away`).toBeGreaterThanOrEqual(last);
            expect(now).toBeLessThanOrEqual(1);

            last = now;
        }

    });

    it('is already faintly there when it first appears', () => {

        //  Just inside the draw distance, rather than exactly on it, since that
        //  edge is defined as nothing.
        expect(drawStrength(DRAW_DISTANCE - 1, 0)).toBeGreaterThan(0);

    });

});

describe('the sideways half of the same picture', () => {

    it('leaves the vanishing point alone at every depth', () => {

        for (const y of [ HORIZON_Y, DROP_SCREEN_Y, GAME_HEIGHT ])
        {
            expect(projectX(VANISH_X, y), `at ${y}`).toBeCloseTo(VANISH_X, 6);
        }

    });

    //  The drop's own line is where the projection pivots: a lane there is
    //  drawn exactly where the lane maths says it is, which is what lets
    //  collision ignore all of this.
    it('draws a lane where it really is, at the drop', () => {

        expect(projectX(100, DROP_SCREEN_Y)).toBeCloseTo(100, 6);
        expect(depthScale(DROP_SCREEN_Y)).toBeCloseTo(1, 6);

    });

    it('pulls everything to a point at the horizon', () => {

        expect(projectX(0, HORIZON_Y)).toBeCloseTo(VANISH_X, 6);
        expect(projectX(GAME_HEIGHT, HORIZON_Y)).toBeCloseTo(VANISH_X, 6);

    });

    //  Straight lines in the world stay straight on screen, which is what makes
    //  a lane edge a lane edge rather than a curve. It holds because the rule
    //  is linear in screen y - and it is the property a change here would break
    //  first.
    it('keeps a straight edge straight', () => {

        const a = project(120, HORIZON_Y + 40);
        const b = project(120, HORIZON_Y + 200);
        const c = project(120, HORIZON_Y + 360);

        const first = (b.x - a.x) / (b.y - a.y);
        const second = (c.x - b.x) / (c.y - b.y);

        expect(first).toBeCloseTo(second, 6);

    });

    it('spreads things outwards as they come past, rather than inwards', () => {

        const at = (y: number) => Math.abs(projectX(60, y) - VANISH_X);

        expect(at(DROP_SCREEN_Y + 100)).toBeGreaterThan(at(DROP_SCREEN_Y));
        expect(at(DROP_SCREEN_Y)).toBeGreaterThan(at(HORIZON_Y + 20));

    });

});
