import {
    OBSTACLE_HALF_WIDTH,
    PULSE_AMOUNT,
    PULSE_PERIOD,
    SLIDER_AMPLITUDE,
    SLIDER_PERIOD,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { ObstacleKind } from '../config/level';
import { laneCenterX } from './Lanes';
import { clamp } from '../utils/math';

const TAU = Math.PI * 2;

//  Where a barrier is, as pure functions of distance travelled.
//
//  Kept out of the entity that draws it for the same reason the swipe rules and
//  the contact rules are: what a barrier does to the player is a rule, and a
//  rule that can only be exercised by standing a scene up is a rule nobody
//  checks. The levels are held to these by test.
//
//  Both phases run off distance travelled rather than off how far the barrier
//  still has to come. Measured from the barrier's own distance the phase was
//  always zero at the moment of contact, so a slider was home in its lane and a
//  pulse at its resting width exactly when it mattered - the movement was real
//  on screen and absent from the rules.

/**
 * Half the width a barrier presents at a given point on the course. Only a
 * pulsing barrier varies.
 */
export function barrierHalfWidth (kind: ObstacleKind, travelled: number): number
{
    if (kind !== 'pulse')
    {
        return OBSTACLE_HALF_WIDTH;
    }

    return OBSTACLE_HALF_WIDTH * (1 + (Math.sin((travelled / PULSE_PERIOD) * TAU) * PULSE_AMOUNT));
}

/**
 * Track-space centre of a barrier at a given point on the course.
 *
 * Every slider shares one clock, so they sway together rather than each to its
 * own rhythm: one pattern for the player to read instead of several.
 */
export function barrierCentre (kind: ObstacleKind, lane: number, travelled: number): number
{
    const home = laneCenterX(lane);

    if (kind !== 'slider')
    {
        return home;
    }

    const half = barrierHalfWidth(kind, travelled);

    //  Kept inside the track, so a slider never leaves the playable width and
    //  can always be gone round.
    return clamp(
        home + (Math.sin((travelled / SLIDER_PERIOD) * TAU) * SLIDER_AMPLITUDE),
        TRACK_LEFT + half,
        TRACK_LEFT + TRACK_WIDTH - half
    );
}
