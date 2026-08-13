import { ColorId, GATE_SWAP_SPAN, GATE_SWAP_START } from '../config/constants';

/**
 * A gate that trades its two colours on the way in.
 *
 * The purest twist this game has available to it. Everything else on the road
 * is a thing to steer around or jump; the gate is the one object that asks a
 * question, and a gate that changes its answer while you are still travelling
 * towards it turns a choice made early into a choice that has to be watched.
 *
 * Kept honest by being early and loud. The swap happens a long way out, takes a
 * fixed span of road to complete, and then holds - so there is always more road
 * left afterwards than it takes to cross the track, whatever level it is on.
 * `test/gates.test.ts` holds that against the fastest level in the game rather
 * than against a number written down here.
 *
 * Measured in distance rather than seconds, like everything else that has to
 * survive a paused run and mean the same thing at every level speed.
 */

/** How far through the swap a gate is at a given point on the course. 0 to 1. */
export function gateSwapProgress (distance: number, travelled: number, swap: boolean): number
{
    if (!swap)
    {
        return 0;
    }

    const from = distance - GATE_SWAP_START;
    const along = (travelled - from) / GATE_SWAP_SPAN;

    return Math.min(1, Math.max(0, along));
}

/**
 * Which colour is on which side, right now.
 *
 * The single source of truth for both the drawing and the collision. They read
 * it at different moments - the gate is drawn every frame and the colour is
 * taken once, at contact - so a gate whose picture and whose answer came from
 * two different places could disagree, which is the one thing a mechanic built
 * on deception must never actually do.
 */
export function gateColorsAt (
    colors: [ ColorId, ColorId ],
    distance: number,
    travelled: number,
    swap: boolean
): [ ColorId, ColorId ]
{
    //  Swapped at the halfway point rather than at the end, so the moment the
    //  answer changes is the moment the picture is most obviously mid-change.
    //  Changing it at the end would mean a gate that still looks like its old
    //  self is already its new self, which is a lie rather than a twist.
    return gateSwapProgress(distance, travelled, swap) >= 0.5
        ? [ colors[1], colors[0] ]
        : colors;
}

/**
 * How hard the gate is flashing, 0 to 1.
 *
 * Peaks exactly where the colours change hands. A crossfade on its own is
 * something a player looking at the road can miss entirely; a flash at the
 * moment of the swap is what makes them look back at it.
 */
export function gateSwapFlash (distance: number, travelled: number, swap: boolean): number
{
    const progress = gateSwapProgress(distance, travelled, swap);

    if (progress <= 0 || progress >= 1)
    {
        return 0;
    }

    //  A single hump: up to the halfway point and back down.
    return Math.sin(progress * Math.PI);
}

/**
 * How much road is left to react in after the swap has finished.
 *
 * The number that decides whether the mechanic is fair, so it is derived here
 * rather than assumed anywhere: a swap that completes with less road left than
 * it takes to cross the track is a gate nobody can answer.
 */
export const GATE_SWAP_REACTION = GATE_SWAP_START - GATE_SWAP_SPAN;
