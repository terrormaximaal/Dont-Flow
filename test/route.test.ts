import { describe, expect, it } from 'vitest';
import {
    BUTTON_HEIGHT,
    GAME_HEIGHT,
    GAME_WIDTH,
    MENU_HEADING_Y,
    MENU_KICKER_Y,
    MENU_PROGRESS_Y,
    ROUTE_DETAIL_OFFSET,
    ROUTE_ENTER_MS,
    ROUTE_ENTER_STAGGER,
    ROUTE_FADE_BAND,
    ROUTE_FIRST_Y,
    ROUTE_LAST_Y,
    ROUTE_NODE_RADIUS,
    ROUTE_SWING,
    ROUTE_VIEW_BOTTOM,
    ROUTE_VIEW_TOP
} from '../src/game/config/constants';
import { LEVELS } from '../src/game/config/levels';
import {
    edgeFade,
    isReached,
    isStartable,
    ROUTE_BACK_Y,
    routePoint,
    routeScrollRange,
    scrollToShow,
    stopAt,
    stopState
} from '../src/game/ui/route';

const STOPS = LEVELS.map((_, index) => stopAt(index, LEVELS.length));

/** How far apart two points are. */
function apart (a: { x: number; y: number }, b: { x: number; y: number }): number
{
    return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('the route the stops sit on', () => {

    it('starts at the first stop and ends at the last', () => {

        expect(routePoint(0).y).toBeCloseTo(ROUTE_FIRST_Y, 5);
        expect(routePoint(1).y).toBeCloseTo(ROUTE_LAST_Y, 5);

    });

    it('runs downwards the whole way, never back up', () => {

        for (let t = 0; t < 1; t += 0.01)
        {
            expect(routePoint(t + 0.01).y, `at ${t.toFixed(2)}`)
                .toBeGreaterThan(routePoint(t).y);
        }

    });

    it('stays inside the screen', () => {

        for (let t = 0; t <= 1; t += 0.005)
        {
            const point = routePoint(t);

            expect(point.x, `at ${t.toFixed(3)}`).toBeGreaterThan(ROUTE_NODE_RADIUS);
            expect(point.x, `at ${t.toFixed(3)}`).toBeLessThan(GAME_WIDTH - ROUTE_NODE_RADIUS);
        }

    });

    //  The stops are placed on the curve and the line is drawn from the same
    //  curve, so a stop that is near the line rather than on it would be a
    //  drawing bug rather than a layout one - this is the guard that the two
    //  cannot drift apart.
    it('passes exactly through every stop', () => {

        STOPS.forEach((stop, index) => {

            const on = routePoint(index / (STOPS.length - 1));

            expect(apart(stop, on), `stop ${index + 1}`).toBeLessThan(0.001);

        });

    });

});

describe('the stops on it', () => {

    //  Two beads that touch read as one shape. The wave's cycle count and phase
    //  were chosen by searching for the value that maximises exactly this
    //  number, which is a fact worth keeping true rather than rediscovering.
    it('never let two beads touch, whichever pair is closest', () => {

        for (let i = 1; i < STOPS.length; i++)
        {
            expect(apart(STOPS[i - 1], STOPS[i]), `stops ${i} and ${i + 1}`)
                .toBeGreaterThan((ROUTE_NODE_RADIUS * 2) + 8);
        }

    });

    //  Not only adjacent ones: a wave can bring a stop back round to sit beside
    //  one several places earlier, which looks like a mistake even though the
    //  route between them is long.
    it('never let any two beads overlap, however far apart on the route', () => {

        for (let i = 0; i < STOPS.length; i++)
        {
            for (let j = i + 2; j < STOPS.length; j++)
            {
                expect(apart(STOPS[i], STOPS[j]), `stops ${i + 1} and ${j + 1}`)
                    .toBeGreaterThan(ROUTE_NODE_RADIUS * 2);
            }
        }

    });

    it('leans every label away from the middle, where the route runs', () => {

        for (const stop of STOPS)
        {
            expect(stop.side).toBe(stop.x < GAME_WIDTH / 2 ? -1 : 1);
        }

    });

    //  A score set beside a stop grows outwards. It must have somewhere to grow
    //  into, or it runs off the side of a phone.
    it('leaves room for a score beside every stop', () => {

        for (const stop of STOPS)
        {
            const anchor = stop.x + (stop.side * ROUTE_DETAIL_OFFSET);

            //  Enough for a five-figure score at the detail size.
            expect(stop.side < 0 ? anchor : GAME_WIDTH - anchor).toBeGreaterThan(46);
        }

    });

    it('uses enough of the width to read as a journey', () => {

        const xs = STOPS.map((stop) => stop.x);

        //  A route that barely leaves the centre line is a column with a wiggle.
        expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(ROUTE_SWING);

    });

});

describe('the screen the route sits on', () => {

    it('stacks the heading above the route without touching it', () => {

        expect(MENU_KICKER_Y).toBeLessThan(MENU_HEADING_Y);
        expect(MENU_HEADING_Y).toBeLessThan(MENU_PROGRESS_Y);
        expect(MENU_PROGRESS_Y + 20).toBeLessThan(ROUTE_FIRST_Y - ROUTE_NODE_RADIUS);

    });

    //  A screen a touch device cannot leave is the worst bug this layout can
    //  have, and it has happened here once already with the grid this replaces.
    //  The route is longer than the screen now, so the way out cannot sit
    //  under the last stop - it is fixed to the frame while the route moves
    //  behind it. What matters is that it is on the screen and clear of the
    //  band the route is seen through.
    it('keeps the way out on the screen, clear of the route', () => {

        const backY = ROUTE_BACK_Y;

        expect(backY - (BUTTON_HEIGHT / 2)).toBeGreaterThanOrEqual(ROUTE_VIEW_BOTTOM);
        expect(backY + (BUTTON_HEIGHT / 2)).toBeLessThan(GAME_HEIGHT);

    });

    it('starts with the first stop in view', () => {

        expect(ROUTE_FIRST_Y - ROUTE_NODE_RADIUS).toBeGreaterThan(ROUTE_VIEW_TOP - ROUTE_NODE_RADIUS);
        expect(ROUTE_FIRST_Y + ROUTE_NODE_RADIUS).toBeLessThan(ROUTE_VIEW_BOTTOM);

    });

    //  A route that runs past the frame has to be reachable, and the scroll is
    //  what makes it so - the range must actually cover the overhang.
    it('scrolls far enough to reach the last stop', () => {

        const overhang = (ROUTE_LAST_Y + ROUTE_NODE_RADIUS) - ROUTE_VIEW_BOTTOM;

        expect(overhang, 'the route runs past the frame').toBeGreaterThan(0);
        expect(routeScrollRange(), 'the scroll covers it').toBeGreaterThanOrEqual(overhang);

    });

    //  Ten stops arriving one after another is a screen that assembles itself
    //  in front of the player. Pleasant at forty milliseconds a stop; a wait at
    //  four hundred.
    it('finishes arriving before anyone could get bored', () => {

        expect(((LEVELS.length - 1) * ROUTE_ENTER_STAGGER) + ROUTE_ENTER_MS)
            .toBeLessThanOrEqual(1000);

    });


});

describe('what a stop is', () => {

    //  The most important rule on this screen. A locked stop is built with no
    //  hit area at all rather than a live one that refuses, so there is no
    //  state in which it can start a level - and this is the function that
    //  decides which stops get one.
    it('locks everything past the furthest level reached', () => {

        for (let furthest = 0; furthest < LEVELS.length; furthest++)
        {
            for (let index = 0; index < LEVELS.length; index++)
            {
                const state = stopState(index, furthest, true);

                expect(state === 'locked', `stop ${index} at furthest ${furthest}`)
                    .toBe(index > furthest);
            }
        }

    });

    it('never lets a locked stop be started', () => {

        for (let furthest = 0; furthest < LEVELS.length; furthest++)
        {
            for (const canPlay of [ true, false ])
            {
                for (let index = furthest + 1; index < LEVELS.length; index++)
                {
                    expect(isStartable(stopState(index, furthest, canPlay)), `stop ${index}`)
                        .toBe(false);
                }
            }
        }

    });

    it('marks exactly one stop as the one to play next', () => {

        for (let furthest = 0; furthest < LEVELS.length; furthest++)
        {
            const next = LEVELS
                .map((_, index) => stopState(index, furthest, true))
                .filter((state) => state === 'next');

            expect(next, `furthest ${furthest}`).toHaveLength(1);
        }

    });

    it('puts the next one at the furthest level reached', () => {

        for (let furthest = 0; furthest < LEVELS.length; furthest++)
        {
            expect(stopState(furthest, furthest, true)).toBe('next');
        }

    });

    //  Out of energy, every reached stop is inert. The meter is what explains
    //  the wait; a stop that also changed how it looked would be saying the
    //  same thing twice, in a worse place.
    it('makes every stop unpressable with no energy, without locking any', () => {

        for (let index = 0; index < LEVELS.length; index++)
        {
            const state = stopState(index, LEVELS.length - 1, false);

            expect(state, `stop ${index}`).toBe('waiting');
            expect(isStartable(state), `stop ${index}`).toBe(false);
            expect(isReached(state), `stop ${index}`).toBe(true);
        }

    });

    it('shows a number on every stop that has been reached, and a lock on the rest', () => {

        for (let furthest = 0; furthest < LEVELS.length; furthest++)
        {
            for (let index = 0; index < LEVELS.length; index++)
            {
                expect(isReached(stopState(index, furthest, true)), `stop ${index}`)
                    .toBe(index <= furthest);
            }
        }

    });

});

describe('a stop reaching the edge of the view', () => {

    //  The heading and the BACK button own the screen outside the band. The
    //  clip enforces that, but the clip is a Phaser object and cannot be
    //  checked here - what can be checked is that nothing is asked to be drawn
    //  out there in the first place.
    it('is invisible outside the band the route is seen through', () => {

        expect(edgeFade(ROUTE_VIEW_TOP), 'at the top edge').toBe(0);
        expect(edgeFade(ROUTE_VIEW_TOP - 40), 'above it').toBe(0);
        expect(edgeFade(ROUTE_VIEW_BOTTOM), 'at the bottom edge').toBe(0);
        expect(edgeFade(ROUTE_VIEW_BOTTOM + 40), 'below it').toBe(0);

    });

    it('is fully drawn through the middle of it', () => {

        const middle = (ROUTE_VIEW_TOP + ROUTE_VIEW_BOTTOM) / 2;

        expect(edgeFade(middle)).toBe(1);

    });

    //  The whole point of the band: a bead is a disc, and a disc that meets the
    //  clip with anything left to clip is sliced flat against open sky. The
    //  fade has to be finished before the bead's near edge reaches the cut.
    it('has finished fading before a bead can be sliced', () => {

        expect(ROUTE_FADE_BAND).toBeGreaterThan(ROUTE_NODE_RADIUS * 2);

        for (const edge of [ ROUTE_VIEW_TOP, ROUTE_VIEW_BOTTOM ])
        {
            const towards = edge === ROUTE_VIEW_TOP ? 1 : -1;

            //  The furthest the centre can be from the edge while any of the
            //  bead is over it.
            const touching = edge + (towards * ROUTE_NODE_RADIUS);

            expect(edgeFade(touching), `edge at ${edge}`).toBeLessThan(0.5);
        }

    });

    it('never jumps, so the fade is read as a fade', () => {

        let last = edgeFade(0);

        for (let y = 0; y <= GAME_HEIGHT; y++)
        {
            const now = edgeFade(y);

            expect(Math.abs(now - last), `at ${y}`).toBeLessThan(0.05);
            last = now;
        }

    });

});

describe('the two ends of the route', () => {

    //  The stops most likely to be got wrong, because they are the only two
    //  that sit against a limit rather than in open space. Both were: the last
    //  one settled half faded into the bottom edge, and the first one sat
    //  inside the top band and opened dimmed.
    it('are at full strength when the route is scrolled to reach them', () => {

        const first = stopAt(0, LEVELS.length);
        const last = stopAt(LEVELS.length - 1, LEVELS.length);

        //  Scrolled to the top is scroll 0; scrolled to the bottom is the full
        //  range, which moves the route up by that much.
        expect(edgeFade(first.y), 'the first stop').toBe(1);
        expect(edgeFade(last.y - routeScrollRange()), 'the last stop').toBe(1);

    });

    it('can both be brought into view from where the screen opens', () => {

        for (const index of [ 0, LEVELS.length - 1 ])
        {
            const stop = stopAt(index, LEVELS.length);
            const seen = edgeFade(stop.y - scrollToShow(index, LEVELS.length));

            expect(seen, `stop ${index}`).toBe(1);
        }

    });

});
