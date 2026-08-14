import { JUMP_CLEAR_HEIGHT, JUMP_SPAN } from '../../src/game/config/constants';
import { jumpHeight } from '../../src/game/systems/jump';

//  What a jump can actually reach, worked out from the arc rather than written
//  down beside it.
//
//  The arc is a parabola and the clearance is a threshold on it, so a jump is
//  only *above* a hurdle for the middle part of its span. That middle part is
//  shorter than the jump itself, which is the fact every level has to be
//  authored around and the fact that is easiest to forget.

/**
 * Where in an arc the drop is high enough to clear something, from takeoff.
 *
 * Scanned rather than solved, so this stays honest if the arc stops being a
 * parabola. A pixel of resolution is far finer than any row spacing.
 */
function clearingRange (): { from: number; to: number }
{
    let first: number | null = null;
    let last = 0;

    for (let d = 0; d <= JUMP_SPAN; d++)
    {
        if (jumpHeight(d, 0) >= JUMP_CLEAR_HEIGHT)
        {
            first ??= d;
            last = d;
        }
    }

    return first === null ? { from: 0, to: 0 } : { from: first, to: last };
}

/** How far apart two hurdles can be and still both fit under one arc. */
export function oneJumpWindow (): number
{
    const { from, to } = clearingRange();

    return to - from;
}

/**
 * The closest two hurdles can be and still be taken as two separate jumps.
 *
 * The drop has to clear the first, come down, and be high enough again by the
 * second. Landing is a full span after takeoff, so the most road that can be
 * put between the landing and the second hurdle is won by clearing the first
 * one as late as the arc allows - and even then the second still has to be far
 * enough past the landing for the drop to have climbed.
 *
 * This is only reachable because a jump can be asked for before the landing
 * and honoured at it. Without that buffer the player had to swipe on the exact
 * frame of touchdown, so nothing under a full span could be relied on.
 */
export function twoJumpMinimum (): number
{
    const { from, to } = clearingRange();

    return (JUMP_SPAN - to) + from;
}

/**
 * Whether two things that must both be jumped can both be jumped, given the
 * distance between them.
 *
 * Two ways through: one arc covers both, or the drop clears the first, lands,
 * and leaves again for the second. Anything past the second threshold is
 * clearable however far away it is, because a grounded drop can wait for the
 * right moment to go.
 */
export function canClear (gap: number): boolean
{
    return gap <= oneJumpWindow() || gap >= twoJumpMinimum();
}

/**
 * How much room to leave either side of the two limits when authoring.
 *
 * Sitting exactly on a boundary is a level that needs a pixel-perfect input,
 * which is not a level anybody enjoys.
 */
export const ROW_MARGIN = 40;
