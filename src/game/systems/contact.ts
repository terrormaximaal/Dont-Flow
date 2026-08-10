import { LANE_WIDTH, ORB_CATCH_RADIUS, TRACK_LEFT } from '../config/constants';

//  What the drop is touching, as pure geometry.
//
//  These two rules decide the whole scoring loop - which colour a gate hands
//  over, and whether an orb counts as collected - so they are kept out of the
//  entities that draw them and testable on their own.

/**
 * Screen x where a pair's two gates meet.
 */
export function gateSplitX (splitAfterLane: number): number
{
    return TRACK_LEFT + ((splitAfterLane + 1) * LANE_WIDTH);
}

/**
 * Which gate of a pair a given x falls inside: 0 for the left, 1 for the right.
 *
 * The boundary itself belongs to the right-hand gate. Nothing can sit exactly on
 * it in practice - the split is on a lane edge and the drop rests at a lane
 * centre - but the rule is defined rather than left to chance.
 */
export function gateSideAt (x: number, splitAfterLane: number): 0 | 1
{
    return x < gateSplitX(splitAfterLane) ? 0 : 1;
}

/**
 * Whether the drop is close enough across the track to collect an orb.
 *
 * Reaching an orb's distance is only half of a hit; this is the other half.
 */
export function isWithinCatchRange (dropX: number, orbX: number): boolean
{
    return Math.abs(dropX - orbX) < ORB_CATCH_RADIUS;
}
