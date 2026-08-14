import { JUMP_BUFFER, JUMP_SPAN } from '../config/constants';

//  The jump, as pure maths.
//
//  Measured against distance travelled rather than seconds, like everything
//  else that has to survive a paused run and an uneven frame rate. It also
//  makes a jump mean the same thing on every level: the arc covers a fixed
//  length of road, so an obstacle that can be cleared on the slowest level can
//  be cleared on the fastest.

/**
 * How high the drop is, 0 on the road and 1 at the top of the arc.
 *
 * A parabola rather than a sine, because a parabola is what a thing thrown
 * upwards actually does: it leaves the ground fast, hangs at the top, and
 * comes back fast. A sine spends too long near the ground at both ends and
 * reads as floating.
 *
 * @param travelled Distance the run has covered.
 * @param takeoff   Distance at which the jump began, or null if grounded.
 */
export function jumpHeight (travelled: number, takeoff: number | null): number
{
    if (takeoff === null)
    {
        return 0;
    }

    const u = (travelled - takeoff) / JUMP_SPAN;

    //  Outside the arc in either direction is simply on the ground. Guarding
    //  both ends rather than assuming the caller has already landed the drop
    //  keeps this total: any distance has an answer.
    if (u <= 0 || u >= 1)
    {
        return 0;
    }

    return 4 * u * (1 - u);
}

/**
 * Whether a jump begun at `takeoff` has finished by `travelled`.
 *
 * Separate from the height, because a height of zero happens twice - at the
 * start of the arc and at the end - and only one of them means "landed".
 */
export function hasLanded (travelled: number, takeoff: number | null): boolean
{
    return takeoff === null || travelled - takeoff >= JUMP_SPAN;
}

/**
 * Where a jump asked for in mid-air lands, or null if it is too old to honour.
 *
 * The answer is the landing point rather than the frame the landing was
 * noticed on. A frame can overrun the landing by any amount - fourteen pixels
 * at thirty frames a second, more on a stalled one - and taking off from where
 * the drop actually touched down keeps the second arc in the same place
 * whatever the frame rate did, which is the rule the rest of the game is built
 * on.
 *
 * @param landedAt    Distance at which the first jump ended.
 * @param requestedAt Distance at which the player asked, or null if they did not.
 */
export function bufferedTakeoff (landedAt: number, requestedAt: number | null): number | null
{
    if (requestedAt === null || landedAt - requestedAt > JUMP_BUFFER)
    {
        return null;
    }

    return landedAt;
}
