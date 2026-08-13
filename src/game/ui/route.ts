import {
    GAME_WIDTH,
    ROUTE_CYCLES,
    ROUTE_FIRST_Y,
    ROUTE_LAST_Y,
    ROUTE_PHASE,
    ROUTE_SWING
} from '../config/constants';

//  Where the stops on the level route are.
//
//  Pure geometry, kept out of the scene so the layout can be checked without a
//  browser - a screen whose last stop or whose way out falls off the bottom is
//  a screen a touch device cannot leave, and that has happened here once
//  already with the grid this replaces.

const TAU = Math.PI * 2;

export interface Stop
{
    x: number;
    y: number;

    /** -1 when the stop sits left of centre, +1 when it sits right. */
    side: -1 | 1;
}

/**
 * A point on the route, `t` running 0 at the first stop to 1 at the last.
 *
 * A wave rather than a zig-zag between two fixed extremes. Stops that
 * alternate between the same two x values sit far apart horizontally and close
 * together vertically, so the line between them is nearly flat and the whole
 * thing reads as a row of struts. On a wave every stop sits at its own point on
 * a curve, the line is the curve, and it flows - which is the one thing this
 * game is named after.
 */
export function routePoint (t: number): { x: number; y: number }
{
    return {
        x: (GAME_WIDTH / 2) + (Math.sin((t * TAU * ROUTE_CYCLES) + ROUTE_PHASE) * ROUTE_SWING),
        y: ROUTE_FIRST_Y + ((ROUTE_LAST_Y - ROUTE_FIRST_Y) * t)
    };
}

/**
 * The stop for one level.
 *
 * @param index How far down the list, from 0.
 * @param count How many levels there are in total.
 */
export function stopAt (index: number, count: number): Stop
{
    //  A single-level list would divide by zero; it sits at the top.
    const t = count > 1 ? index / (count - 1) : 0;
    const point = routePoint(t);

    return {
        x: point.x,
        y: point.y,
        //  Which way its label leans: outwards, away from the middle, where the
        //  route itself runs.
        side: point.x < GAME_WIDTH / 2 ? -1 : 1
    };
}

/**
 * What a stop is, from the player's point of view.
 *
 * Four states, and the scene draws all four differently, so they are named
 * rather than left as three booleans that have to be read together. It is a
 * short function guarding the most important rule on the screen - that a level
 * which has not been reached cannot be started - and a short function is
 * exactly the kind that gets an extra condition bolted onto it later.
 */
export type StopState =
    /** Not reached yet. Wears a padlock, and is built with no hit area at all. */
    | 'locked'
    /** Reached and played past. Shows its number and its best score. */
    | 'open'
    /** Reached, and the furthest one. Breathes, so the screen says "here". */
    | 'next'
    /**
     * Reached, but there is no energy to start it with.
     *
     * Drawn exactly like an open one and pressable by nothing. The meter is
     * what explains the wait; a stop that looked different for this reason
     * would be saying the same thing a second time in a worse place.
     */
    | 'waiting';

/**
 * @param furthest The furthest level reached, as an index.
 * @param canPlay  Whether there is energy to start a level at all.
 */
export function stopState (index: number, furthest: number, canPlay: boolean): StopState
{
    if (index > furthest)
    {
        return 'locked';
    }

    if (!canPlay)
    {
        return 'waiting';
    }

    return index === furthest ? 'next' : 'open';
}

/** Whether a stop in this state may start its level. */
export function isStartable (state: StopState): boolean
{
    return state === 'next' || state === 'open';
}

/** Whether a stop in this state shows its number and score rather than a lock. */
export function isReached (state: StopState): boolean
{
    return state !== 'locked';
}
