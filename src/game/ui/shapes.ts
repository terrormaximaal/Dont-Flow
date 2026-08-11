import {
    COLOR_DROP_HIGHLIGHT,
    DROP_BOUNCE_ALPHA,
    DROP_BOUNCE_THICKNESS,
    DROP_CORE_ALPHA,
    DROP_FLOOD_FROM,
    DROP_FLOOD_TO,
    DROP_GLINT_LENGTH,
    DROP_GLINT_STEPS,
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
    DROP_RIM_ALPHA,
    DROP_RIM_THICKNESS,
    DROP_SLOSH,
    LIGHT_X,
    LIGHT_Y
} from '../config/constants';
import { clipAbove, Point } from '../entities/drop-surface';
import { bounced, facing } from './lighting';

/**
 * Fills a closed shape from a set of points, in whatever style is already set.
 *
 * Walked by hand rather than handed to fillPoints, which wants Phaser's own
 * Vector2 - building those every frame would mean allocating the whole outline
 * again just to satisfy a type.
 */
export function fillOutline (gfx: Phaser.GameObjects.Graphics, outline: Point[], count = outline.length): void
{
    if (count < 3)
    {
        return;
    }

    gfx.beginPath();
    gfx.moveTo(outline[0].x, outline[0].y);

    for (let i = 1; i < count; i++)
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
 */
export interface DropPaint
{
    /** Points around the edge, from `waterOutline`. */
    outline: Point[];

    /**
     * The resting radius those points were built from, which the shading, the
     * shadow and the flood line are all sized against.
     */
    radius: number;

    color: number;

    /** Sideways tilt, -1 to 1. Slides the inside against the move. */
    lean?: number;

    /**
     * Whether to lay a shadow and a halo down as well, which the player needs to
     * sit on the road and the logo does not.
     */
    grounded?: boolean;

    /**
     * The colour being replaced, and how far down the new one has reached, 0 to
     * 1. Together these paint a gate as the colour flooding through the drop
     * rather than the drop being swapped. Leave them out for a settled drop.
     */
    from?: number;
    flood?: number;
}

export function drawWaterDrop (gfx: Phaser.GameObjects.Graphics, paint: DropPaint): void
{
    const { outline, radius, color } = paint;
    const lean = paint.lean ?? 0;
    const grounded = paint.grounded ?? false;
    const flood = paint.flood ?? 1;

    gfx.clear();

    //  Mid-change the halo follows whichever colour has most of the body, so it
    //  cannot sit there in the new colour around a drop that is still the old
    //  one - which reads as a light around it rather than a light from it.
    const halo = paint.from !== undefined && flood < 0.5 ? paint.from : color;

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
            gfx.fillStyle(halo, DROP_GLOW_ALPHA);
            gfx.fillCircle(0, 0, radius + (DROP_GLOW_SPREAD * (layer / DROP_GLOW_LAYERS)));
        }
    }

    //  Mid-change, the body is painted twice: the colour being left behind
    //  everywhere, then the new one over everything above a line that sweeps
    //  down from above the tip to below the belly.
    const flooding = paint.from !== undefined && flood < 1;

    gfx.fillStyle(flooding ? paint.from! : color, 1);
    fillOutline(gfx, outline);

    if (flooding)
    {
        const cut = radius * (DROP_FLOOD_FROM + ((DROP_FLOOD_TO - DROP_FLOOD_FROM) * flood));
        const top = clipAbove(outline, cut);

        gfx.fillStyle(color, 1);
        fillOutline(gfx, top.points, top.count);
    }

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

    //  A soft core, lighter than the body and offset towards the light. Reads
    //  as light making it through the drop rather than stopping at the surface.
    gfx.fillStyle(COLOR_DROP_HIGHLIGHT, DROP_CORE_ALPHA);
    gfx.fillEllipse(slosh * 0.4, -radius * 0.1, radius * 1.25, radius * 1.05);

    //  Offset highlight, so the drop reads as a volume and its rotation is
    //  actually visible.
    gfx.fillStyle(COLOR_DROP_HIGHLIGHT, 0.32);
    gfx.fillCircle((-radius * 0.3) + slosh, -radius * 0.32, radius * 0.34);

    gfx.fillStyle(COLOR_DROP_HIGHLIGHT, 0.55);
    gfx.fillCircle((-radius * 0.34) + slosh, -radius * 0.42, radius * 0.15);

    glint(gfx, radius, slosh);
    rimLight(gfx, outline, halo);
}

/**
 * The tight specular glint: a run of shrinking circles laid along the light's
 * own direction, which gives an elongated streak without needing a rotated
 * ellipse - and so without touching the canvas transform.
 */
function glint (gfx: Phaser.GameObjects.Graphics, radius: number, slosh: number): void
{
    const startX = (-radius * 0.34) + slosh;
    const startY = -radius * 0.44;

    for (let step = 0; step < DROP_GLINT_STEPS; step++)
    {
        const along = (step / DROP_GLINT_STEPS) * radius * DROP_GLINT_LENGTH;
        const fade = 1 - (step / DROP_GLINT_STEPS);

        gfx.fillStyle(COLOR_DROP_HIGHLIGHT, 0.5 * fade);
        gfx.fillCircle(
            startX + (LIGHT_X * along),
            startY + (LIGHT_Y * along),
            radius * 0.1 * fade
        );
    }
}

/**
 * Light along the drop's edge: bright where it turns towards the key light,
 * and a weaker, broader return from the road underneath it.
 *
 * Drawn segment by segment with its own alpha rather than as one stroked path,
 * so the light falls off around the curve instead of starting and stopping.
 * Both passes walk the outline that was already built for the body, so the rim
 * ripples with the surface for free.
 */
function rimLight (gfx: Phaser.GameObjects.Graphics, outline: Point[], color: number): void
{
    for (let i = 0; i < outline.length; i++)
    {
        const a = outline[i];
        const b = outline[(i + 1) % outline.length];

        //  The outline is built around the origin, so a point's own offset is
        //  the direction the surface faces there.
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;

        const key = facing(midX, midY);

        if (key > 0.01)
        {
            gfx.lineStyle(DROP_RIM_THICKNESS, COLOR_DROP_HIGHLIGHT, DROP_RIM_ALPHA * key);
            gfx.lineBetween(a.x, a.y, b.x, b.y);
        }

        const bounce = bounced(midX, midY);

        if (bounce > 0.01)
        {
            //  In the drop's own colour: it is the road returning the light the
            //  drop is throwing down onto it.
            gfx.lineStyle(DROP_BOUNCE_THICKNESS, color, DROP_BOUNCE_ALPHA * bounce);
            gfx.lineBetween(a.x, a.y, b.x, b.y);
        }
    }
}
