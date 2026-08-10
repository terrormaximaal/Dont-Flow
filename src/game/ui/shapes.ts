import {
    COLOR_DROP_HIGHLIGHT,
    DROP_GLOW_ALPHA,
    DROP_GLOW_LAYERS,
    DROP_GLOW_SPREAD,
    DROP_SHADE_ALPHA,
    DROP_SHADE_DROP,
    DROP_SHADE_HEIGHT,
    DROP_SHADE_LAYERS,
    DROP_SHADE_STEP,
    DROP_SHADE_WIDTH,
    DROP_SHADOW_ALPHA,
    DROP_SHADOW_DROP,
    DROP_SHADOW_SQUASH,
    DROP_SLOSH
} from '../config/constants';
import { Point } from '../entities/drop-surface';

/**
 * Fills a closed shape from a set of points, in whatever style is already set.
 *
 * Walked by hand rather than handed to fillPoints, which wants Phaser's own
 * Vector2 - building those every frame would mean allocating the whole outline
 * again just to satisfy a type.
 */
export function fillOutline (gfx: Phaser.GameObjects.Graphics, outline: Point[]): void
{
    gfx.beginPath();
    gfx.moveTo(outline[0].x, outline[0].y);

    for (let i = 1; i < outline.length; i++)
    {
        gfx.lineTo(outline[i].x, outline[i].y);
    }

    gfx.closePath();
    gfx.fillPath();
}

/**
 * Draws the drop into a Graphics object, around a local origin at the centre of
 * the bulb.
 *
 * The outline is passed in rather than worked out here, so the shape and the
 * painting of it stay separable: `drop-surface` decides what a drop looks like
 * this frame, this decides how it is lit.
 *
 * Shared so the title screen's logo is the same drop as the player, rather than
 * a second drawing that has to be kept in step by hand.
 *
 * @param outline  Points around the edge, from `waterOutline`.
 * @param radius   The resting radius those points were built from, which the
 *                 shading and the shadow are sized against.
 * @param lean     Sideways tilt, -1 to 1. Slides the inside against the move.
 * @param grounded Whether to lay a shadow and a halo down as well, which the
 *                 player needs to sit on the road and the logo does not.
 */
export function drawWaterDrop (
    gfx: Phaser.GameObjects.Graphics,
    outline: Point[],
    radius: number,
    color: number,
    lean = 0,
    grounded = false
): void
{
    gfx.clear();

    if (grounded)
    {
        //  A flattened shadow on the road below. Without it the drop reads as
        //  stuck to the glass rather than travelling over a surface.
        gfx.fillStyle(0x000000, DROP_SHADOW_ALPHA);
        gfx.fillEllipse(0, DROP_SHADOW_DROP, radius * 2.1, radius * 2 * DROP_SHADOW_SQUASH);

        //  A halo in the drop's own colour, so it stays visible against every
        //  world without being outlined. Left as circles rather than copies of
        //  the outline: it is four barely-there layers, and nobody can see that
        //  a glow this soft is not rippling with the edge it sits behind.
        for (let layer = DROP_GLOW_LAYERS; layer > 0; layer--)
        {
            gfx.fillStyle(color, DROP_GLOW_ALPHA);
            gfx.fillCircle(0, 0, radius + (DROP_GLOW_SPREAD * (layer / DROP_GLOW_LAYERS)));
        }
    }

    gfx.fillStyle(color, 1);
    fillOutline(gfx, outline);

    //  The inside of the drop lags behind the outside on a sideways move, which
    //  is most of what sells it as full of something rather than solid.
    const slosh = -lean * radius * DROP_SLOSH;

    //  A darker underside, which turns a flat disc into something rounded. Each
    //  pass sits inside the last, so it fades out towards its edge rather than
    //  stopping at one.
    for (let layer = 0; layer < DROP_SHADE_LAYERS; layer++)
    {
        const inset = 1 - ((layer / DROP_SHADE_LAYERS) * DROP_SHADE_STEP * DROP_SHADE_LAYERS);

        gfx.fillStyle(0x000000, DROP_SHADE_ALPHA / DROP_SHADE_LAYERS);
        gfx.fillEllipse(
            slosh * 0.6,
            radius * DROP_SHADE_DROP,
            radius * DROP_SHADE_WIDTH * inset,
            radius * DROP_SHADE_HEIGHT * inset
        );
    }

    //  Offset highlight, so the drop reads as a volume and its rotation is
    //  actually visible.
    gfx.fillStyle(COLOR_DROP_HIGHLIGHT, 0.32);
    gfx.fillCircle((-radius * 0.3) + slosh, -radius * 0.32, radius * 0.34);

    gfx.fillStyle(COLOR_DROP_HIGHLIGHT, 0.55);
    gfx.fillCircle((-radius * 0.34) + slosh, -radius * 0.42, radius * 0.15);
}
