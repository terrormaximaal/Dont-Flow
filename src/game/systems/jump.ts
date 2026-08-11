import { JUMP_SPAN } from '../config/constants';

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
