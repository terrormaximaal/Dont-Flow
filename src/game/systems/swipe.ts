import {
    SWIPE_DOMINANCE,
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
 */
export function evaluateDrag (anchor: DragAnchor, x: number, y: number): DragResult
{
    const dx = x - anchor.x;
    const dy = y - anchor.y;

    const farEnough = Math.abs(dx) >= SWIPE_THRESHOLD;
    const horizontalEnough = Math.abs(dx) >= Math.abs(dy) * SWIPE_DOMINANCE;

    if (farEnough && horizontalEnough)
    {
        return { intent: dx > 0 ? 1 : -1, anchor: { x, y } };
    }

    if (Math.abs(dy) >= SWIPE_REANCHOR_DISTANCE)
    {
        return { intent: 0, anchor: { x, y } };
    }

    return { intent: 0, anchor };
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
