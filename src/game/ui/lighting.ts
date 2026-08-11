import { LIGHT_FALLOFF, LIGHT_X, LIGHT_Y } from '../config/constants';

//  One light, for the whole game.
//
//  Everything that looks lit - the drop's rim, the sheen down the road, the
//  highlight on a gate - is lit from the same direction, because a scene lit
//  from two places at once is the single clearest sign of a prototype. This is
//  where that direction lives, and the only maths behind it.
//
//  Pure functions: no Phaser, no state. The drawing code decides what to do
//  with an intensity; this only says how strongly a surface faces the light.

/** Length of the light vector, for normalising dot products against it. */
const LIGHT_LENGTH = Math.sqrt((LIGHT_X * LIGHT_X) + (LIGHT_Y * LIGHT_Y));

/**
 * How strongly a surface faces the light, 0 to 1.
 *
 * Takes a direction pointing out of the surface - for a blob, simply the offset
 * from its centre, which need not be normalised. Anything facing away is 0
 * rather than negative, so a caller can multiply by it without checking.
 *
 * The falloff exponent tightens the lit band into something that reads as a
 * glancing highlight rather than a whole lit hemisphere.
 */
export function facing (x: number, y: number): number
{
    const length = Math.sqrt((x * x) + (y * y));

    if (length === 0 || LIGHT_LENGTH === 0)
    {
        return 0;
    }

    const dot = ((x * LIGHT_X) + (y * LIGHT_Y)) / (length * LIGHT_LENGTH);

    return dot <= 0 ? 0 : Math.pow(dot, LIGHT_FALLOFF);
}

/**
 * The same, for the light bouncing back up off the road.
 *
 * Weaker and broader than the key light, and from directly below: it is the
 * ground returning light, not a second lamp. This is what stops the underside
 * of the drop going to a flat dark edge.
 */
export function bounced (x: number, y: number): number
{
    const length = Math.sqrt((x * x) + (y * y));

    if (length === 0)
    {
        return 0;
    }

    //  Straight down is (0, 1) in screen space.
    const dot = y / length;

    return dot <= 0 ? 0 : dot * dot;
}
