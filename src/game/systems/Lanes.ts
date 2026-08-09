import { LANE_COUNT, LANE_WIDTH, TRACK_LEFT } from '../config/constants';

//  Pure lane maths. Anything that needs to know where a lane *is* on screen
//  goes through here, so the track layout is defined in exactly one place.

/**
 * Screen x of the centre of a lane. Lane 0 is the left-most lane.
 */
export function laneCenterX (lane: number): number
{
    return TRACK_LEFT + (lane * LANE_WIDTH) + (LANE_WIDTH / 2);
}

/**
 * Keeps a lane index inside the track. Swiping at the edge is a no-op rather
 * than an error.
 */
export function clampLane (lane: number): number
{
    return Math.max(0, Math.min(LANE_COUNT - 1, lane));
}
