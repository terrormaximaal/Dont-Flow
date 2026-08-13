import {
    DROP_CONTACT_RADIUS,
    JUMP_CLEAR_HEIGHT,
    ORB_CATCH_RADIUS,
    TRACK_LEFT
} from '../config/constants';
import { ObstacleProfile } from '../config/level';
import { laneWidth } from './Lanes';

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
    return TRACK_LEFT + ((splitAfterLane + 1) * laneWidth());
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

/**
 * Whether an orb counts as touched.
 *
 * Being close is not enough on its own, on either axis.
 *
 * Across the track, the drop also has to be heading for the orb's lane. Crossing
 * two lanes puts it straight through the middle one, and without this a swipe
 * across the track would sweep up - or be punished by - every orb it passed over
 * on the way. Sliding through a lane is travel; only the lane the drop is
 * settling into is somewhere it has actually been.
 *
 * And an orb is on the road, so a drop in the air goes over it, exactly as it
 * goes over a low barrier. Jumping a row of the wrong colour costs the right
 * ones in it, which is the whole decision.
 *
 * @param dropX      Where the drop is right now, mid-slide.
 * @param targetX    Centre of the lane it is heading for.
 * @param dropHeight 0 on the road, 1 at the top of a jump.
 */
export function isOrbTouched (
    dropX: number,
    targetX: number,
    orbX: number,
    dropHeight = 0
): boolean
{
    if (dropHeight >= JUMP_CLEAR_HEIGHT)
    {
        return false;
    }

    return isWithinCatchRange(dropX, orbX) && Math.abs(targetX - orbX) < laneWidth() / 2;
}

/**
 * Whether the drop is inside a barrier.
 *
 * Takes the barrier's current centre and half-width rather than reading them
 * itself, because a moving barrier's position is a function of distance
 * travelled - the caller has that, and passing it keeps the drawn barrier and
 * the collided barrier the same barrier.
 *
 * Height is the same idea one axis up: a low barrier or a hole is cleared by
 * being above it, and a full-height one cannot be jumped at all. A grounded
 * drop against a full-height barrier is exactly the test this has always been,
 * so every level built before jumping existed plays unchanged.
 *
 * Whether colour saves you is the caller's question, not this one's - and for
 * a gap the answer is no, which is why the caller has to ask it separately.
 *
 * @param dropHeight 0 on the road, 1 at the top of a jump.
 * @param profile    Whether this barrier can be cleared from above.
 */
export function isBlockedBy (
    dropX: number,
    obstacleX: number,
    obstacleHalfWidth: number,
    dropHeight = 0,
    profile: ObstacleProfile = 'full'
): boolean
{
    if (profile !== 'full' && dropHeight >= JUMP_CLEAR_HEIGHT)
    {
        return false;
    }

    return Math.abs(dropX - obstacleX) < obstacleHalfWidth + DROP_CONTACT_RADIUS;
}
