import { LEVEL_COUNT } from '../config/levels';
import {
    GAME_HEIGHT,
    GAME_WIDTH,
    ROUTE_CYCLES_PER_LEVEL,
    ROUTE_FADE_BAND,
    ROUTE_FIRST_Y as ROUTE_FIRST,
    ROUTE_STEP_Y,
    ROUTE_ENTER_BUDGET,
    ROUTE_ENTER_MS,
    ROUTE_ENTER_STAGGER_MAX,
    ROUTE_PHASE,
    ROUTE_SWING,
    ROUTE_VIEW_BOTTOM,
    ROUTE_VIEW_TOP
} from '../config/constants';

//  Where the stops on the level route are.
//
//  Pure geometry, kept out of the scene so the layout can be checked without a
//  browser - a screen whose last stop or whose way out falls off the bottom is
//  a screen a touch device cannot leave, and that has happened here once
//  already with the grid this replaces.

const TAU = Math.PI * 2;

/** Kept, so the rest of this file reads as it did. */
const ROUTE_FIRST_Y = ROUTE_FIRST;

/**
 * How many times the route swings across the screen.
 *
 * Per level rather than per route. Fixed at 4.75 while there were twenty
 * levels, it put fifty stops through the same number of swings - which left
 * pairs of beads sitting almost directly above one another, and a route that
 * has stopped moving sideways has stopped being a journey.
 */
const ROUTE_CYCLES = ROUTE_CYCLES_PER_LEVEL * Math.max(1, LEVEL_COUNT - 1);

/**
 * Where the last stop sits.
 *
 * One step per level rather than a fixed length. It was pinned to nineteen
 * steps while there were twenty levels, which meant adding thirty more crammed
 * fifty beads into the same stretch of road and left them overlapping - the
 * route stops being a journey the moment two stops touch.
 */
export const ROUTE_LAST_Y = ROUTE_FIRST_Y + (ROUTE_STEP_Y * Math.max(1, LEVEL_COUNT - 1));

/**
 * How long each stop waits behind the one before it as the route arrives.
 *
 * Derived rather than fixed, because the whole entrance has to finish before a
 * player could get bored of watching it - and a fixed stagger that read well
 * across twenty stops took over a second and a half across fifty. Held to the
 * same budget whatever the route's length, so adding levels lengthens the road
 * and not the wait.
 */
export const ROUTE_ENTER_STAGGER = Math.min(
    ROUTE_ENTER_STAGGER_MAX,
    (ROUTE_ENTER_BUDGET - ROUTE_ENTER_MS) / Math.max(1, LEVEL_COUNT - 1)
);

/**
 * Where the way out sits.
 *
 * Fixed to the frame rather than to the end of the route, because the route is
 * longer than the screen and scrolls behind it. A BACK button that scrolled
 * away with the levels would be a screen a phone cannot leave.
 */
export const ROUTE_BACK_Y = (ROUTE_VIEW_BOTTOM + GAME_HEIGHT) / 2;

/**
 * How far the route can be dragged.
 *
 * Exactly the overhang and no further: scrolling past the last stop into empty
 * space is the clearest way to make a list feel broken.
 */
export function routeScrollRange (): number
{
    //  Far enough that the last stop clears the fade band rather than settling
    //  half dissolved into the bottom edge. The first stop is given the same
    //  clearance at the other end, by where ROUTE_FIRST_Y is put.
    return Math.max(0, ROUTE_LAST_Y - (ROUTE_VIEW_BOTTOM - ROUTE_FADE_BAND));
}

/**
 * How far to scroll so a given stop is in the middle of the view.
 *
 * The screen opens on the level the player is up to rather than on the first
 * one, which after fifteen levels is a long way from where they are.
 */
export function scrollToShow (index: number, count: number): number
{
    const middle = (ROUTE_VIEW_TOP + ROUTE_VIEW_BOTTOM) / 2;

    return Math.max(0, Math.min(routeScrollRange(), stopAt(index, count).y - middle));
}

/**
 * How visible a stop is at a given position on screen.
 *
 * 1 through the middle of the view, easing to 0 as it approaches either edge of
 * the band, and 0 outside it. Takes a screen position rather than a route
 * position, so it is the scrolled `y` that goes in, not the stop's own.
 *
 * This is the whole of how the route is kept off the heading and off the way
 * out. A mask would have been the obvious way, and was tried: setMask is a
 * no-op on a Container in this build of Phaser, and it fails silently, so the
 * route simply carried on straight over the word SELECT. Fading each piece by
 * where it sits needs no mask, and is better anyway - a hard clip through a
 * disc leaves a bead sliced flat against open sky, since the heading has no
 * bar behind it for the route to disappear under.
 */
export function edgeFade (screenY: number): number
{
    const into = Math.min(screenY - ROUTE_VIEW_TOP, ROUTE_VIEW_BOTTOM - screenY);

    return Math.max(0, Math.min(1, into / ROUTE_FADE_BAND));
}

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
