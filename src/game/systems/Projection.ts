import {
    GAME_WIDTH,
    PROJECTION_DEPTH,
    PROJECTION_PIVOT_Y,
    PROJECTION_SHEAR,
    PROJECTION_TAPER
} from '../config/constants';

//  Track space to screen space.
//
//  Everything in the game is authored on a straight vertical track: a lane
//  gives an x, a distance gives a y. This is the only place that turns those
//  into where something is actually drawn, and it is the only thing that knows
//  the world looks diagonal.
//
//  Collision detection never calls any of this. Hits are decided on track
//  coordinates - `travelled >= distance`, and lane-space x against a catch
//  radius - so the corridor can be leaned, tapered or straightened again
//  without a single gameplay consequence. That separation is the whole point:
//  a projection that fed back into collision would have to be kept in sync by
//  hand, and would drift.

export interface Projected
{
    x: number;
    y: number;

    /** Width multiplier at this depth, for objects that should shrink away. */
    scale: number;
}

/**
 * How much narrower the corridor is at a given screen y.
 *
 * 1 at the drop's own line, falling towards the horizon and growing slightly
 * past it, so objects swell as they arrive rather than popping.
 */
export function depthScale (screenY: number): number
{
    const depth = (PROJECTION_PIVOT_Y - screenY) / PROJECTION_DEPTH;

    return 1 - (depth * PROJECTION_TAPER);
}

/**
 * Projects a point on the straight track onto the diagonal corridor.
 *
 * @param trackX  Lane-space x, as laneCenterX gives it.
 * @param screenY Depth down the screen, as screenYFor gives it.
 */
export function project (trackX: number, screenY: number): Projected
{
    const scale = depthScale(screenY);

    //  Shear about the drop's line, so the lane the player is in never shifts
    //  under them as the world tilts.
    const lean = (PROJECTION_PIVOT_Y - screenY) * PROJECTION_SHEAR;

    //  Taper about the centre of the track, so both edges close in together.
    const centred = (trackX - (GAME_WIDTH / 2)) * scale;

    return {
        x: (GAME_WIDTH / 2) + centred - lean,
        y: screenY,
        scale
    };
}

/**
 * Fills the projected quad spanning two track-space x values between two
 * depths - the shape every flat surface in the corridor turns into.
 *
 * Drawn as two triangles rather than fillPoints, which wants Phaser Vector2
 * instances; the Phaser global is types-only under the ESM build, so building
 * them would mean importing the class purely to satisfy a signature.
 *
 * The caller sets the fill style.
 */
export function fillProjectedQuad (
    gfx: Phaser.GameObjects.Graphics,
    left: number,
    right: number,
    farY: number,
    nearY: number
): void
{
    const leftFar = projectX(left, farY);
    const rightFar = projectX(right, farY);
    const leftNear = projectX(left, nearY);
    const rightNear = projectX(right, nearY);

    gfx.fillTriangle(leftFar, farY, rightFar, farY, rightNear, nearY);
    gfx.fillTriangle(leftFar, farY, rightNear, nearY, leftNear, nearY);
}

/**
 * The projected x of a point, when the y is already known and the scale is not
 * needed. Same maths, without building an object per call.
 */
export function projectX (trackX: number, screenY: number): number
{
    return (GAME_WIDTH / 2)
        + ((trackX - (GAME_WIDTH / 2)) * depthScale(screenY))
        - ((PROJECTION_PIVOT_Y - screenY) * PROJECTION_SHEAR);
}
