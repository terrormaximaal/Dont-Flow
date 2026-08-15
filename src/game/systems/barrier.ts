import {
    BLINK_OPEN,
    BLINK_PERIOD,
    OBSTACLE_HALF_WIDTH,
    PULSE_AMOUNT,
    PULSE_PERIOD,
    ROTOR_PERIOD,
    ROTOR_REACH,
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
 * Half the width a barrier presents at a given point on the course.
 *
 * A pulse breathes around its resting width; a rotor opens and closes across a
 * far wider range as it turns. Everything else is the width it was built at.
 */
export function barrierHalfWidth (kind: ObstacleKind, travelled: number): number
{
    if (kind === 'pulse')
    {
        return OBSTACLE_HALF_WIDTH * (1 + (Math.sin((travelled / PULSE_PERIOD) * TAU) * PULSE_AMOUNT));
    }

    //  A bar turning about its lane, seen from above: its width across the road
    //  is its length foreshortened by how far round it has turned. Broadside it
    //  reaches ROTOR_REACH either side, edge-on it is the post it pivots on.
    if (kind === 'rotor')
    {
        return ROTOR_REACH * Math.abs(Math.cos((travelled / ROTOR_PERIOD) * TAU));
    }

    return OBSTACLE_HALF_WIDTH;
}

/**
 * Whether a barrier is there at all at a given point on the course.
 *
 * Only a disappearing floor is ever absent, and when it is absent the road is
 * simply road. Kept as its own question rather than folded into the width,
 * because a width of nothing is not the same as nothing being there: the drop
 * has a body, so it would still be caught standing exactly on a hole of zero
 * width.
 *
 * A square wave rather than a smooth one. A floor is there or it is not, and
 * the player has to be able to read which from a glance rather than judge how
 * far through a fade it is.
 */
export function barrierPresent (kind: ObstacleKind, travelled: number): boolean
{
    if (kind !== 'blinker')
    {
        return true;
    }

    //  Positive modulo, so the phase is the same on either side of zero.
    const phase = (((travelled / BLINK_PERIOD) % 1) + 1) % 1;

    return phase < BLINK_OPEN;
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
