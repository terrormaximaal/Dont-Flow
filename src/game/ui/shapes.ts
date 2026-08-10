import {
    COLOR_DROP_HIGHLIGHT,
    DROP_GLOW_ALPHA,
    DROP_GLOW_LAYERS,
    DROP_GLOW_SPREAD,
    DROP_SHADOW_ALPHA,
    DROP_SHADOW_DROP,
    DROP_SHADOW_SQUASH
} from '../config/constants';

/**
 * Draws the drop's teardrop into a Graphics object, around a local origin at
 * the centre of the bulb.
 *
 * Shared so the title screen's logo is the same shape as the player, rather
 * than a second drawing that has to be kept in step by hand.
 */
export function drawTeardrop (
    gfx: Phaser.GameObjects.Graphics,
    radius: number,
    color: number,
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
        //  world without being outlined.
        for (let layer = DROP_GLOW_LAYERS; layer > 0; layer--)
        {
            gfx.fillStyle(color, DROP_GLOW_ALPHA);
            gfx.fillCircle(0, 0, radius + (DROP_GLOW_SPREAD * (layer / DROP_GLOW_LAYERS)));
        }
    }

    gfx.fillStyle(color, 1);
    gfx.fillTriangle(-radius * 0.62, -radius * 0.62, 0, -radius * 2.05, radius * 0.62, -radius * 0.62);
    gfx.fillCircle(0, 0, radius);

    //  A darker underside, which turns a flat disc into something rounded.
    gfx.fillStyle(0x000000, 0.16);
    gfx.fillEllipse(0, radius * 0.42, radius * 1.5, radius * 0.85);

    //  Offset highlight, so the drop reads as a volume and its rotation is
    //  actually visible.
    gfx.fillStyle(COLOR_DROP_HIGHLIGHT, 0.32);
    gfx.fillCircle(-radius * 0.3, -radius * 0.32, radius * 0.34);

    gfx.fillStyle(COLOR_DROP_HIGHLIGHT, 0.55);
    gfx.fillCircle(-radius * 0.34, -radius * 0.42, radius * 0.15);
}
