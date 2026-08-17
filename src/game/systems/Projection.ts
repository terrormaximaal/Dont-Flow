import {
    GAME_WIDTH,
    HORIZON_Y,
    PROJECTION_PIVOT_Y,
    RIVER_STRIP,
    RIVER_STRIP_LIMIT,
    VANISH_OFFSET
} from '../config/constants';
import { River, riverAt, swingOnScreen } from './bend';

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

/**
 * The river the view is currently taken along, if the road is winding.
 *
 * State in a module that is otherwise a pure function of its arguments, and
 * deliberately: it is the camera. A caller hands over a lane and a screen depth
 * and has no idea how far the player has come, so threading it through would
 * mean changing forty-seven call sites to carry a number none of them cares
 * about - and missing one would leave a single object hanging off the side of
 * the road, which is exactly the bug this arrangement cannot have.
 *
 * Null on the menus, and null in every test that has not asked for a river, so
 * a straight road stays bit-for-bit the straight road it was.
 */
let river: River | null = null;

/**
 * Point the view along the river at where the player has got to.
 *
 * Called once a frame, before anything is drawn. What it works out is the half
 * of the swing that depends only on the player's own position, so the drawing
 * that follows pays three cosines a point instead of a dozen.
 */
export function lookAlong (travelled: number, phases: number[]): void
{
    river = riverAt(travelled, phases);
}

/** Straighten it again, which is what a menu and an unasked test both want. */
export function lookStraight (): void
{
    river = null;
}

/**
 * How far the road has swung sideways by the time it is this far down screen,
 * in screen pixels - so it is added after the projection has narrowed things
 * rather than before.
 */
function swing (depth: number): number
{
    return river === null ? 0 : swingOnScreen(river, depth);
}

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
    const scale = depthScale(screenY);

    return VANISH_X + ((trackX - VANISH_X) * scale) + swing(scale);
}

export function project (trackX: number, screenY: number): Projected
{
    const scale = depthScale(screenY);

    return {
        x: VANISH_X + ((trackX - VANISH_X) * scale) + swing(scale),
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
    const steps = stepsFor(farY, nearY);

    let topLeft = projectX(left, farY);
    let topRight = projectX(right, farY);
    let topY = farY;

    for (let step = 1; step <= steps; step++)
    {
        const y = farY + ((nearY - farY) * (step / steps));
        const bottomLeft = projectX(left, y);
        const bottomRight = projectX(right, y);

        gfx.fillTriangle(topLeft, topY, topRight, topY, bottomRight, y);
        gfx.fillTriangle(topLeft, topY, bottomRight, y, bottomLeft, y);

        topLeft = bottomLeft;
        topRight = bottomRight;
        topY = y;
    }
}

/**
 * A line running down the road at a fixed lane position - a divider, an edge.
 *
 * Two points on a straight road, and a chain of them on a winding one. The
 * caller sets the stroke.
 */
export function strokeProjectedLine (
    gfx: Phaser.GameObjects.Graphics,
    trackX: number,
    farY: number,
    nearY: number
): void
{
    const steps = stepsFor(farY, nearY);

    let fromX = projectX(trackX, farY);
    let fromY = farY;

    for (let step = 1; step <= steps; step++)
    {
        const y = farY + ((nearY - farY) * (step / steps));
        const x = projectX(trackX, y);

        gfx.lineBetween(fromX, fromY, x, y);

        fromX = x;
        fromY = y;
    }
}

/**
 * How many pieces a surface running from one depth to another is drawn in.
 *
 * One, on a straight road: two points define a straight line and the projection
 * is linear in screen y, so there is nothing in between to get wrong. That is
 * the whole reason the road was ever two triangles.
 *
 * A winding road is not linear in screen y, so a shape drawn as one piece comes
 * out as a straight thing at an angle rather than as a curve. Cut by how much
 * screen it covers rather than by a fixed count, so the road pays for its
 * length and a gate two hundred pixels deep still costs one quad. Measured
 * against the real curve, the road in one piece is sixteen pixels out at worst
 * and in pieces this size under one.
 */
function stepsFor (farY: number, nearY: number): number
{
    if (river === null) { return 1; }

    const across = Math.abs(nearY - farY) / RIVER_STRIP;

    return Math.max(1, Math.min(RIVER_STRIP_LIMIT, Math.round(across)));
}
