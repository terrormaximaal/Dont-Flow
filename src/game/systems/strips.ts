import { HORIZON_Y, STRIP_LENGTH, STRIP_SPACING } from '../config/constants';
import { depthScale } from './Projection';
import { screenYFor } from './World';

/**
 * Shortest a strip can appear on screen and still be worth two quads.
 *
 * Culling on brightness instead looks reasonable and does almost nothing: the
 * depth curve keeps a strip 11,000px away at around 7% strength, comfortably
 * above any sane alpha cutoff, so every strip in the budget kept drawing.
 * Length is the honest measure - a strip squeezed into two pixels at the
 * horizon is not dim, it is invisible.
 */
const MIN_STRIP_PIXELS = 4;

/**
 * How many strips are considered per frame before the walk gives up.
 *
 * A hard stop rather than a "walk until off screen": perspective packs strips
 * ever more tightly towards the horizon, so without a limit the loop's length
 * would depend on how the depth curve is tuned - and a change to
 * PERSPECTIVE_DEPTH could quietly turn a dozen quads into hundreds.
 */
const STRIP_BUDGET = 24;

export interface Strip
{
    /** Screen y of the strip's leading edge, and of its tail. */
    y: number;
    tailY: number;

    /** How near it is, 0 at the horizon: fades it out with distance. */
    strength: number;
}

/**
 * Which light strips are worth drawing at this distance.
 *
 * Separated from the drawing so the count is something that can be reasoned
 * about and held to a budget, rather than whatever the loop happens to emit.
 *
 * @param travelled How far the player has come, in track pixels.
 * @param near      Screen y past which a strip has gone by.
 */
export function visibleStrips (travelled: number, near: number): Strip[]
{
    const strips: Strip[] = [];

    //  Start at the last strip already behind the player and walk away.
    let index = Math.floor(travelled / STRIP_SPACING);

    for (let i = 0; i < STRIP_BUDGET; i++, index++)
    {
        const head = index * STRIP_SPACING;

        const y = screenYFor(head, travelled);
        const tailY = screenYFor(head - STRIP_LENGTH, travelled);

        if (y > near || tailY < HORIZON_Y)
        {
            continue;
        }

        //  Behind the player the head is the lower of the two, so measure the
        //  span rather than assuming which end is which.
        if (Math.abs(y - tailY) < MIN_STRIP_PIXELS)
        {
            continue;
        }

        strips.push({ y, tailY, strength: depthScale(y) });
    }

    return strips;
}

export { STRIP_BUDGET };
