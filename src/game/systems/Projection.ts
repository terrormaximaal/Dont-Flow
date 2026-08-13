import {
    GAME_WIDTH,
    HORIZON_Y,
    PROJECTION_PIVOT_Y,
    VANISH_OFFSET
} from '../config/constants';

//  Track space to screen space.
//
//  Everything in the game is authored on a straight, flat road: a lane gives an
//  x, a distance gives a depth. This is the only place that turns those into
//  where something is actually drawn, and the only thing that knows the world
//  is seen in perspective.
//
//  Collision detection never calls any of this. Hits are decided on track
//  coordinates - `travelled >= distance`, and lane-space x against a catch
//  radius - so the camera can be raised, lowered or straightened without a
//  single gameplay consequence. A projection that fed back into collision would
//  have to be kept in sync by hand, and would drift.

/** Where the road converges: everything ahead runs towards this point. */
export const VANISH_X = (GAME_WIDTH / 2) - VANISH_OFFSET;

const SPAN = PROJECTION_PIVOT_Y - HORIZON_Y;

export interface Projected
{
    x: number;
    y: number;

    /** Width multiplier at this depth, for objects that should shrink away. */
    scale: number;
}

/**
 * How large the world is at a given screen depth.
 *
 * 1 at the player's own line, falling to 0 at the horizon and growing past 1
 * below, so things swell as they arrive rather than popping into place.
 */
export function depthScale (screenY: number): number
{
    return (screenY - HORIZON_Y) / SPAN;
}

/**
 * Projects a point on the flat road into the view.
 *
 * Everything is simply pulled towards the vanishing point in proportion to its
 * depth. That single rule gives both convergence and the narrowing of the road
 * at once - and because it is linear in screen y, straight lines in the world
 * stay straight on screen.
 *
 * @param trackX  Lane-space x, as laneCenterX gives it.
 * @param screenY Depth down the screen, as screenYFor gives it.
 */
export function projectX (trackX: number, screenY: number): number
{
    return VANISH_X + ((trackX - VANISH_X) * depthScale(screenY));
}

export function project (trackX: number, screenY: number): Projected
{
    const scale = depthScale(screenY);

    return {
        x: VANISH_X + ((trackX - VANISH_X) * scale),
        y: screenY,
        scale
    };
}

/**
 * Fills the projected quad spanning two track-space x values between two
 * depths - the shape every flat surface on the road turns into.
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
