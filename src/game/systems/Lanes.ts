import { DEFAULT_LANES, TRACK_LEFT, TRACK_WIDTH } from '../config/constants';

//  Pure lane maths. Anything that needs to know where a lane *is* on screen
//  goes through here, so the track layout is defined in exactly one place.
//
//  How many lanes the track carries belongs to the level being played, not to
//  the game: the early ones are two lanes wide so there is only ever one way to
//  go, and the rest are three. The road itself never changes width, so fewer
//  lanes simply means wider ones - which is most of why a two-lane level plays
//  gently without anything else being slowed down.
//
//  That count is held here rather than passed to every one of these functions,
//  because it is read from a dozen places and changes exactly once per level.
//  `useLanes` is called as a level is built, before anything that draws or
//  collides exists.

let lanes = DEFAULT_LANES;

/**
 * Lay the track out for this many lanes. Called once, as a level or a menu's
 * backdrop is built.
 */
export function useLanes (count: number): void
{
    lanes = count;
}

/** How many lanes the track currently carries. */
export function laneCount (): number
{
    return lanes;
}

/** How wide each of them is. */
export function laneWidth (): number
{
    return TRACK_WIDTH / lanes;
}

/**
 * Track x of the centre of a lane. Lane 0 is the left-most lane.
 *
 * Track space, not screen space, and the distinction now matters: the road is
 * drawn along a river that winds, so where a lane appears moves with depth
 * while this does not move at all. Every rule in the game is settled on these
 * numbers, and nothing that decides anything may ever be handed a projected one.
 */
export function laneCenterX (lane: number): number
{
    const width = laneWidth();

    return TRACK_LEFT + (lane * width) + (width / 2);
}

/**
 * Keeps a lane index inside the track. Swiping at the edge is a no-op rather
 * than an error.
 */
export function clampLane (lane: number): number
{
    return Math.max(0, Math.min(lanes - 1, lane));
}

/**
 * Where the drop starts: the middle lane of three, or the left of two.
 *
 * Derived rather than fixed, because "the middle" is not a lane when there is
 * an even number of them.
 */
export function startLane (): number
{
    return Math.floor((lanes - 1) / 2);
}
