import { afterEach, describe, expect, it } from 'vitest';
import {
    DROP_SCREEN_Y,
    GAME_HEIGHT,
    GAME_WIDTH,
    HORIZON_Y,
    PERSPECTIVE_DEPTH,
    RIVER_HEADINGS,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../src/game/config/constants';
import { headingAt, phasesFor, riverAt, swingOnScreen } from '../src/game/systems/bend';
import { depthScale, lookAlong, lookStraight, projectX, VANISH_X } from '../src/game/systems/Projection';
import { laneWidth } from '../src/game/systems/Lanes';
import { LEVELS } from '../src/game/config/levels';
import { buildLevel } from '../src/game/config/level';

//  The river winding is a picture and only a picture. These are the guards that
//  keep it one.

/** Every level's river, sampled the length of that level. */
function everyRiver (step = 613): Array<{ level: number; travelled: number; phases: number[] }> {

    const out = [];

    for (let level = 0; level < LEVELS.length; level++)
    {
        const phases = phasesFor(level);
        const finish = buildLevel(LEVELS[level]).finishDistance;

        for (let travelled = 0; travelled <= finish; travelled += step)
        {
            out.push({ level, travelled, phases });
        }
    }

    return out;
}

/** Down the screen from the horizon to well past the drop, as the road is drawn. */
function everyDepth (step = 7): number[] {

    const out = [];

    for (let y = HORIZON_Y; y <= GAME_HEIGHT + 260; y += step) { out.push(y); }

    return out;
}

describe('the river winding', () => {

    //  In an afterEach rather than at the end of a test body: the projection
    //  holds the river in module state, so a test that throws halfway would
    //  otherwise leave every test after it drawing through a bend.
    afterEach(() => { lookStraight(); });

    //  The one that everything else rests on.
    //
    //  Four things in the game hand a track-space x straight to a screen-space
    //  draw and get away with it: the drop and its shadow, the bloom when a gate
    //  repaints it, the burst when an orb is taken, and the floating score. All
    //  of them are drawn at the drop's own line, and all of them are correct
    //  only while the projection is the identity there.
    //
    //  It is exact rather than close, and by construction rather than by tuning:
    //  the swing is an integral from the player to the point being drawn, and at
    //  the player there is nothing to integrate over.
    it('does not move the road at all under the drop', () => {

        for (const { level, travelled, phases } of everyRiver())
        {
            lookAlong(travelled, phases);

            for (const trackX of [ 0, 100, TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH, GAME_WIDTH ])
            {
                expect(projectX(trackX, DROP_SCREEN_Y), `level ${level} at ${travelled}, x ${trackX}`).toBe(trackX);
            }
        }

    });

    //  The same promise said the other way round, and the reason a bend can
    //  never be unfair: however far the road leans in the distance, an orb is
    //  where it looks by the time it can be caught. The swing does not merely
    //  reach zero at the drop, it approaches it - so the nearer a thing gets,
    //  the more honest the picture is.
    it('tells less of a story the closer a thing gets', () => {

        //  Not strictly, and it does not need to be: the wandering can tick a
        //  hundredth of a pixel the wrong way. What matters is that it is spent
        //  by the time anything is near enough to be reacted to.
        let worstNear = 0;
        let worstFar = 0;

        for (const { travelled, phases } of everyRiver(997))
        {
            const river = riverAt(travelled, phases);

            for (let step = 0; step <= 100; step++)
            {
                const depth = step / 100;
                const off = Math.abs(swingOnScreen(river, depth));

                if (depth >= 0.75) { worstNear = Math.max(worstNear, off); }

                worstFar = Math.max(worstFar, off);
            }
        }

        //  A quarter of a lane over the last stretch of road: less than the
        //  width of the orb it is drawing, so it can never be the difference
        //  between reaching one and missing it.
        expect(worstNear, 'swing over the last stretch').toBeLessThan(laneWidth() / 4);

        //  And in the distance it is a real bend and not a rounding error.
        expect(worstFar, 'swing in the distance').toBeGreaterThan(TRACK_WIDTH / 8);

    });

    //  A road that leans off the side of the screen is worse than a straight
    //  one. Checked over every level's whole length, at every depth the road is
    //  drawn at, on both edges - not at a few sampled points.
    //
    //  Against the straight road rather than against the screen edge, because
    //  the road is deliberately drawn past the bottom of the screen so its near
    //  end is never seen, and down there it runs off both sides on its own. The
    //  claim that means something is that the bend never takes it off an edge
    //  the straight road was inside of.
    it('never leans the road off the screen', () => {

        let worst = 0;

        for (const { level, travelled, phases } of everyRiver(1013))
        {
            lookAlong(travelled, phases);

            for (const y of everyDepth(11))
            {
                const scale = depthScale(y);

                for (const x of [ TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH ])
                {
                    const straight = VANISH_X + ((x - VANISH_X) * scale);
                    const bent = projectX(x, y);
                    const where = `level ${level} at ${travelled}, y ${y.toFixed(0)}`;

                    expect(Number.isFinite(bent), where).toBe(true);

                    if (straight >= 0 && straight <= GAME_WIDTH)
                    {
                        expect(bent, `${where} stays on screen`).toBeGreaterThanOrEqual(0);
                        expect(bent, `${where} stays on screen`).toBeLessThanOrEqual(GAME_WIDTH);
                    }

                    worst = Math.max(worst, Math.abs(bent - straight));
                }
            }

            lookStraight();
        }

        //  Under a third of the road's own width, over every level, at every
        //  depth it is drawn at. A bend, not a slalom.
        expect(worst, 'furthest the bend ever moves an edge').toBeLessThan(TRACK_WIDTH / 3);

    });

    //  The horizon is where the inverse of the projection blows up - the road is
    //  infinitely far away and has swung infinitely far sideways - and it is
    //  also where every long span the game draws begins. The first version put a
    //  NaN there, which would have taken the whole road with it.
    it('gives a real number at the horizon, where every span starts', () => {

        for (const { travelled, phases } of everyRiver(1471))
        {
            lookAlong(travelled, phases);

            const tip = projectX(TRACK_LEFT + (TRACK_WIDTH / 2), HORIZON_Y);

            expect(Number.isFinite(tip), `at ${travelled}`).toBe(true);

            //  And it is beside the vanishing point rather than on it, which is
            //  the whole difference between a road that bends and a road that is
            //  straight but drawn crooked.
            expect(Math.abs(tip - VANISH_X)).toBeLessThanOrEqual(reach() + 1e-6);
        }

    });

    //  How far the far end may ever swing, from the numbers rather than from a
    //  screenshot: the depth of the projection times the sharpest the river
    //  turns. Everything else about the bend is bounded by this.
    it('keeps the far end within a fifth of the road width of centre', () => {

        let sharpest = 0;

        for (const { travelled, phases } of everyRiver(101))
        {
            sharpest = Math.max(sharpest, Math.abs(headingAt(travelled, phases)));
        }

        expect(sharpest * PERSPECTIVE_DEPTH, 'furthest the vanishing point moves').toBeLessThan(TRACK_WIDTH / 4);

    });

    it('winds differently on every level', () => {

        const shapes = new Set(LEVELS.map((_, level) => phasesFor(level).join()));

        expect(shapes.size).toBe(LEVELS.length);

    });

    //  Straight is the default and has to stay bit-for-bit what it was: the
    //  menus draw through this, and so does every test that never asked for a
    //  river.
    it('leaves a straight road exactly straight', () => {

        lookAlong(4000, phasesFor(3));
        lookStraight();

        const middle = TRACK_LEFT + (TRACK_WIDTH / 2);

        for (const y of everyDepth(29))
        {
            expect(projectX(middle, y)).toBeCloseTo(VANISH_X + ((middle - VANISH_X) * depthScale(y)), 12);
        }

    });

});

/** The furthest the vanishing point can move, from the headings themselves. */
function reach (): number
{
    return PERSPECTIVE_DEPTH * RIVER_HEADINGS.reduce((sum, turn) => sum + turn, 0);
}
