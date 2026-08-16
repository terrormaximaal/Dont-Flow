import {
    SWIPE_DOMINANCE,
    SWIPE_DOWN_THRESHOLD,
    SWIPE_UP_THRESHOLD,
    SWIPE_REANCHOR_DISTANCE,
    SWIPE_REPEAT_DELAY,
    SWIPE_THRESHOLD
} from '../config/constants';

/** -1 = one lane left, +1 = one lane right. */
export type LaneIntent = -1 | 1;

export interface DragAnchor
{
    x: number;
    y: number;
}

export interface DragResult
{
    /** 0 when the drag has not asked for anything yet. */
    intent: LaneIntent | 0;

    /** True when this drag has just asked for a jump. */
    jump: boolean;

    /** True when it has just asked to come back down from one. */
    dive: boolean;

    /** Where the next movement should be measured from. */
    anchor: DragAnchor;
}

/**
 * Decides what a drag is asking for, given where it was last measured from.
 *
 * Kept pure and separate from the input plumbing so the gesture rules can be
 * tested without a scene, a pointer or a browser.
 *
 * Two things reset the anchor:
 *
 * - firing, so one long drag can cross several lanes without lifting a finger;
 * - wandering vertically, so a gesture that starts as a downward drag is judged
 *   on where it goes next rather than being permanently disqualified by
 *   distance it covered earlier.
 *
 * Sideways is tested before upwards. A diagonal flick is far more likely to be
 * a hurried lane change than a jump, and steering is the thing the player does
 * constantly - it gets the benefit of the doubt.
 */
export function evaluateDrag (anchor: DragAnchor, x: number, y: number): DragResult
{
    const dx = x - anchor.x;
    const dy = y - anchor.y;

    const farEnough = Math.abs(dx) >= SWIPE_THRESHOLD;
    const horizontalEnough = Math.abs(dx) >= Math.abs(dy) * SWIPE_DOMINANCE;

    if (farEnough && horizontalEnough)
    {
        return { intent: dx > 0 ? 1 : -1, jump: false, dive: false, anchor: { x, y } };
    }

    const verticalEnough = Math.abs(dy) >= Math.abs(dx) * SWIPE_DOMINANCE;

    //  Upwards, and clearly more up than across. Checked before the reanchor
    //  below, which would otherwise swallow the very gesture it is measuring.
    if (dy <= -SWIPE_UP_THRESHOLD && verticalEnough)
    {
        return { intent: 0, jump: true, dive: false, anchor: { x, y } };
    }

    //  And downwards, which asks a drop already in the air to come back to the
    //  road. Held to a longer throw than the jump: down is the direction a
    //  finger wanders in while it is reaching for the next lane change, and
    //  the reanchor below exists because of exactly that. A dive has to be
    //  meant.
    if (dy >= SWIPE_DOWN_THRESHOLD && verticalEnough)
    {
        return { intent: 0, jump: false, dive: true, anchor: { x, y } };
    }

    if (Math.abs(dy) >= SWIPE_REANCHOR_DISTANCE)
    {
        return { intent: 0, jump: false, dive: false, anchor: { x, y } };
    }

    return { intent: 0, jump: false, dive: false, anchor };
}

/**
 * Whether a lane change is following too soon after the last one.
 *
 * Distance alone does not pace a gesture: a fast flick clears several
 * thresholds' worth of screen inside a few frames, and the drop would cross the
 * whole track before the player has seen the first lane change land. Held apart
 * from `evaluateDrag` because this is the only rule that needs a clock.
 */
export function isRepeatTooSoon (now: number, lastFireTime: number): boolean
{
    return now - lastFireTime < SWIPE_REPEAT_DELAY;
}
