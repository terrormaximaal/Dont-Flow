import { COLOR_VALUES, ColorId } from '../config/constants';

//  Colour arithmetic. Packed 24-bit values in, packed values out.

/** Mixes two packed RGB colours, `t` running 0 at `from` to 1 at `to`. */
export function mixColor (from: number, to: number, t: number): number
{
    const r = Math.round(((from >> 16) & 0xff) + ((((to >> 16) & 0xff) - ((from >> 16) & 0xff)) * t));
    const g = Math.round(((from >> 8) & 0xff) + ((((to >> 8) & 0xff) - ((from >> 8) & 0xff)) * t));
    const b = Math.round((from & 0xff) + (((to & 0xff) - (from & 0xff)) * t));

    return (r << 16) | (g << 8) | b;
}

const WHEEL = Object.keys(COLOR_VALUES) as ColorId[];

/**
 * A point on a loop through every colour the game has, blended rather than
 * stepped so it reads as one thing changing instead of a slideshow.
 *
 * @param phase Whole numbers are exact colours; the fraction is the blend on
 *              the way to the next. Any value works, including negatives.
 */
export function rainbowAt (phase: number): number
{
    const wrapped = ((phase % WHEEL.length) + WHEEL.length) % WHEEL.length;
    const index = Math.floor(wrapped);

    return mixColor(
        COLOR_VALUES[WHEEL[index]],
        COLOR_VALUES[WHEEL[(index + 1) % WHEEL.length]],
        wrapped - index
    );
}
