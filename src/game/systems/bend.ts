import { PERSPECTIVE_DEPTH, RIVER_HEADINGS, RIVER_PERIODS } from '../config/constants';

//  The river winding, as a picture and only as a picture.
//
//  Nothing here is ever consulted by a rule. The course is authored on a
//  straight road - a lane gives an x, a distance gives a depth, and a hit is
//  `travelled >= distance` - and this bends what is drawn without moving any of
//  that. The alternative, a course laid out along a real curve, would put the
//  bend into collision, into the level data, and into every guarantee the game
//  makes about fairness, to buy a picture it can have for nothing.
//
//  The one property that makes this safe is at the bottom of the file: the
//  swing is exactly zero at the player's own position, so however far the road
//  leans in the distance, it is telling the truth by the time anything reaches
//  the drop.

/** One turn of a wave, so periods can be written as distances. */
const TURN = Math.PI * 2;

/**
 * The river's heading at a point along it, in radians from straight ahead.
 *
 * A sum of slow waves whose periods do not divide into each other, which is
 * what keeps it from settling into a rhythm - the bend has to feel like it
 * wanders rather than like it repeats, and three primes-apart periods will not
 * come back round together inside any run.
 *
 * Zero mean by construction, so the river has no net drift: it wanders about
 * straight ahead rather than gradually leaving.
 */
export function headingAt (distance: number, phases: number[]): number
{
    let heading = 0;

    for (let i = 0; i < RIVER_PERIODS.length; i++)
    {
        heading += RIVER_HEADINGS[i] * Math.sin(((TURN * distance) / RIVER_PERIODS[i]) + phases[i]);
    }

    return heading;
}

/** What the camera needs to know, worked out once a frame rather than per note. */
export interface River
{
    /** Where the player is along it, which is where the view is taken from. */
    travelled: number;

    phases: number[];

    /** The heading under the player, which is what the far bank swings by. */
    heading: number;

    /** cos of each wave at the player, the half of the integral that is fixed. */
    anchors: number[];
}

/**
 * The river as seen from one point on it.
 *
 * The heading and the near half of the integral below depend only on where the
 * player is, so they are worked out once a frame. What is left per point is
 * three cosines, and this is asked for every object and every strip of road on
 * screen.
 */
export function riverAt (travelled: number, phases: number[]): River
{
    const anchors: number[] = [];

    for (let i = 0; i < RIVER_PERIODS.length; i++)
    {
        //  Written exactly as the swing writes it, rate first. The two have to
        //  cancel to a bit-exact zero at the player - four things in the game
        //  hand a track x straight to a screen draw on the strength of it - and
        //  `(TURN * d) / P` and `(TURN / P) * d` are not the same number.
        anchors.push(Math.cos(((TURN / RIVER_PERIODS[i]) * travelled) + phases[i]));
    }

    return { travelled, phases, heading: headingAt(travelled, phases), anchors };
}

/**
 * How far the river has swung sideways at a given depth, in track pixels.
 *
 * The road is a curve on flat ground and the view is taken from a point on it,
 * looking along its heading there. A point `ahead` further on sits off to one
 * side by however much the road has turned in between, which is the integral of
 * the heading - and the part of that which is simply "the road was already
 * pointing this way when we started" has to come off, or the whole view would
 * lean whenever the player happened to be on a bend.
 *
 * The integral is written out rather than stepped, because a sum of sines
 * integrates to a sum of cosines and there is no reason to walk a curve the
 * algebra already knows the answer to.
 *
 * Two things fall out of this, and both are what makes the picture read:
 *
 *  - At the player it is exactly zero. The road passes under the drop wherever
 *    the bend is, and an orb is where it looks by the time it can be caught.
 *  - Far off it settles at the depth of the projection times the heading. The
 *    road's far end sits to one side of the vanishing point rather than on it,
 *    which is the difference between a road that bends and a road that is
 *    straight but drawn crooked.
 */
export function swingAt (river: River, ahead: number): number
{
    let swing = 0;

    for (let i = 0; i < RIVER_PERIODS.length; i++)
    {
        const rate = TURN / RIVER_PERIODS[i];
        const at = Math.cos((rate * (river.travelled + ahead)) + river.phases[i]);

        swing += (RIVER_HEADINGS[i] / rate) * (river.anchors[i] - at);
    }

    return swing - (ahead * river.heading);
}

/**
 * How far ahead a point on screen is, from how far down the screen it is.
 *
 * The inverse of what puts it there. Depth is not carried through the drawing
 * code - a caller hands over a screen y and a lane, and by then the distance
 * that produced the y is gone - so the projection reads it back out. Beyond the
 * player this is exactly the inverse; behind, the two disagree by a little, and
 * it does not matter: the only thing back there is the road under the drop, and
 * a bend that continues smoothly is all that is asked of it.
 */
export function aheadOf (depth: number): number
{
    return depth <= 0 ? Infinity : PERSPECTIVE_DEPTH * ((1 / depth) - 1);
}

/**
 * The swing as it lands on the glass, in screen pixels.
 *
 * Worked out here rather than by scaling `swingAt`, because at the horizon that
 * product is infinity times zero. The road is infinitely far away there and has
 * swung infinitely far sideways, and those two cancel to something perfectly
 * ordinary - but only if the cancelling is done in algebra rather than in
 * floating point, which is where the first version of this put a NaN in the
 * one place the road most needed a number.
 *
 * The part of the swing that grows without bound is `ahead` times the heading
 * under the player, and `ahead` times the depth scale is exactly the depth of
 * the projection times one minus that scale. So that half is written out in a
 * form with no infinity in it, and what is left is the wandering, which is
 * bounded and simply fades out with everything else.
 *
 * At the horizon this leaves the depth of the projection times the heading -
 * around fifty pixels at its fullest. That is the whole trick: the road's far
 * end sits *beside* the vanishing point rather than on it, which is what tells
 * an eye the road is turning rather than merely drawn crooked.
 */
export function swingOnScreen (river: River, depth: number): number
{
    //  Nothing at the drop's line, and nothing behind it.
    //
    //  Ahead of the player the swing is what the road has turned by since; at
    //  the player there is nothing to have turned in, so it is zero. Behind, the
    //  same algebra keeps going and runs the wrong way - the near scale is
    //  almost two at the bottom of the screen, and squaring it turned the
    //  damping into a gain. Measured, the road slid a hundred and forty pixels
    //  off the left of the screen down there.
    //
    //  Held at zero instead, which is continuous with the line above it rather
    //  than a kink: the road behind the drop is the road it has just come down,
    //  and it is drawn where the drop actually is.
    const near = Math.min(depth, 1);

    //  Bounded however far off it is, so this half can be scaled honestly.
    let wander = 0;

    if (near > 0)
    {
        const ahead = aheadOf(near);

        for (let i = 0; i < RIVER_PERIODS.length; i++)
        {
            const rate = TURN / RIVER_PERIODS[i];
            const at = Math.cos((rate * (river.travelled + ahead)) + river.phases[i]);

            wander += (RIVER_HEADINGS[i] / rate) * (river.anchors[i] - at);
        }
    }

    //  The wander is held to the near field, and it has to be.
    //
    //  Perspective crushes the whole rest of the road into the last few pixels
    //  above the horizon, so a wave with a fixed length in the world arrives
    //  there faster than the screen has pixels to draw it in: measured, half a
    //  wavelength passes inside one screen pixel of the horizon. Scaled by depth
    //  alone the far road came out as a shivering zigzag rather than a bend -
    //  subdividing it further did not help, because there was nothing smooth
    //  there to find.
    //
    //  Falling off as the square of the depth is what an eye does anyway: you
    //  cannot pick out the individual kinks of a road a mile off, only which way
    //  it is going. So the near half keeps its wandering and the far half is
    //  carried by the heading below, which is smooth by construction.
    return (wander * near * near) - (PERSPECTIVE_DEPTH * (1 - near) * river.heading);
}

/**
 * Phases for one level, so no two rivers wind the same way.
 *
 * Spread by an irrational turn of the circle rather than by a hash: it fills
 * the circle evenly however many levels there are, so neighbouring levels never
 * land on nearly the same river the way a small hash can.
 */
export function phasesFor (seed: number): number[]
{
    const golden = TURN * 0.618033988749895;

    return RIVER_PERIODS.map((_, i) => (seed + 1) * golden * (i + 1));
}
