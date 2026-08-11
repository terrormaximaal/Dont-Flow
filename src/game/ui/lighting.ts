import { LIGHT_FALLOFF, LIGHT_X, LIGHT_Y, PROP_FOG } from '../config/constants';

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

/**
 * How far a thing at this depth has faded into the world's air, 0 to 1.
 *
 * Scaled by the world's own haze strength, not applied flat. A world names a
 * haze colour and how thickly it lays it on, and both matter: the forest names
 * a pale mint but uses it at 0.16, so fogging its near black pines by the
 * colour alone turned them ghostly white.
 *
 * @param scale      Depth scale, 1 at the player's line and 0 at the horizon.
 * @param hazeAlpha  How thick this world's air is.
 */
export function fogAt (scale: number, hazeAlpha: number): number
{
    const depth = Math.min(1, Math.max(0, 1 - scale));

    return Math.min(1, depth * PROP_FOG * hazeAlpha);
}
