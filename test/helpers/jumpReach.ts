import { JUMP_CLEAR_HEIGHT, JUMP_SPAN } from '../../src/game/config/constants';
import { jumpHeight } from '../../src/game/systems/jump';

//  What a jump can actually reach, worked out from the arc rather than written
//  down beside it.
//
//  The arc is a parabola and the clearance is a threshold on it, so a jump is
//  only *above* a hurdle for the middle part of its span. That middle part is
//  shorter than the jump itself, which is the fact every level has to be
//  authored around and the fact that is easiest to forget.

/** How far apart two hurdles can be and still both fit under one arc. */
export function oneJumpWindow (): number
{
    //  Scanned rather than solved, so this stays honest if the arc stops being
    //  a parabola. A pixel of resolution is far finer than any row spacing.
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

    return first === null ? 0 : last - first;
}

/**
 * Whether two things that must both be jumped can both be jumped, given the
 * distance between them.
 *
 * True in two separate cases, and false between them:
 *   - one arc covers both, when they are closer together than the window;
 *   - there is room to land and take off again, when they are a full span
 *     apart or more.
 */
export function canClear (gap: number): boolean
{
    return gap <= oneJumpWindow() || gap >= JUMP_SPAN;
}

/**
 * How much room to leave either side of the two limits when authoring.
 *
 * Sitting exactly on a boundary is a level that needs a pixel-perfect input,
 * which is not a level anybody enjoys.
 */
export const ROW_MARGIN = 40;
