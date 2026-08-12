/**
 * A vignette, as a list of rings.
 *
 * Phaser's Graphics has no radial gradient, so every soft edge in this game is
 * built the same way: nested rectangle outlines, each a little stronger than
 * the one inside it, close enough together that the steps are not steps. Both
 * vignettes wanted that loop, and a loop written twice is a loop that drifts.
 *
 * Pure, and returns the rings rather than drawing them, so how strong a
 * vignette actually is becomes something a test can ask about. That is the
 * whole reason this is not just a shared draw function: "is the warning
 * visible" is a real question with a real answer, and it was previously
 * answerable only by looking at it.
 */
export interface VignetteBand
{
    /** How far in from each edge this ring sits. */
    inset: number;

    /** Stroke width, sized so consecutive rings meet rather than stripe. */
    width: number;

    /** 0 to 1. Strongest at the edge, falling to nothing at the reach. */
    alpha: number;
}

/**
 * @param reach How far in from the edge the vignette fades over.
 * @param count How many rings to build it from.
 * @param edge  The alpha of the outermost ring - the strength of the effect.
 */
export function vignetteBands (reach: number, count: number, edge: number): VignetteBand[]
{
    const bands: VignetteBand[] = [];

    for (let band = 0; band < count; band++)
    {
        const fade = 1 - (band / count);

        bands.push({
            inset: (band / count) * reach,

            //  A pixel wider than the spacing, so consecutive rings overlap by
            //  a hair instead of leaving a seam between them.
            width: (reach / count) + 1,

            //  Squared, so it falls away from the edge rather than ramping
            //  evenly - an even ramp reads as a grey border rather than as a
            //  vignette.
            alpha: edge * fade * fade
        });
    }

    return bands;
}
