import { WorldSpec } from '../config/worlds';
import { mixColor } from '../utils/color';
import {
    BEAD_BANDS,
    BEAD_GROUND_LINE,
    BEAD_HALO_ALPHA,
    BEAD_HALO_LAYERS,
    BEAD_HALO_SPREAD,
    BEAD_LOCKED_MUTE,
    BEAD_RING_WIDTH,
    BEAD_SHEEN_ALPHA
} from '../config/constants';
import { MENU_SKY_TOP } from '../config/menuTheme';

/**
 * A level's stop on the route, drawn as a window onto the world it leads to.
 *
 * The stops used to be flat discs in a single colour taken from the level's
 * palette, which made ten worlds read as ten hues. A world is a sky over a
 * ground with a horizon between them, and that is a picture small enough to
 * fit inside a bead - so the route now shows what the game actually looks like
 * where it is going, and the eye reads the journey before it reads a number.
 *
 * Everything is drawn from shapes, like the rest of the game. A circle cannot
 * be filled with a gradient, so the sky is laid in horizontal bands whose width
 * is the circle's own chord at that height, which is what keeps the fill inside
 * the disc without a mask.
 */

/** Half the width of a circle of `radius` at `dy` from its centre. */
function chord (radius: number, dy: number): number
{
    const inside = (radius * radius) - (dy * dy);

    return inside > 0 ? Math.sqrt(inside) : 0;
}

/**
 * @param locked Drawn washed out towards the menu's own sky, so a locked stop
 *               still previews its world without offering to start it.
 */
export function drawWorldBead (
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    world: WorldSpec,
    locked: boolean
): void
{
    const mute = (color: number): number =>
        locked ? mixColor(color, MENU_SKY_TOP, BEAD_LOCKED_MUTE) : color;

    const skyTop = mute(world.skyTop);
    const skyLow = mute(world.skyBottom);
    const ground = mute(world.groundColor ?? world.track);
    const edge = mute(world.trackEdge);

    //  A halo in the world's own edge colour. Only for the ones that can be
    //  played: it is most of what separates a reached stop from a locked one
    //  before either is read.
    if (!locked)
    {
        for (let layer = BEAD_HALO_LAYERS; layer > 0; layer--)
        {
            gfx.fillStyle(edge, BEAD_HALO_ALPHA);
            gfx.fillCircle(x, y, radius + (BEAD_HALO_SPREAD * (layer / BEAD_HALO_LAYERS)));
        }
    }

    //  The sky, in bands the width of the disc at each height.
    const horizon = radius * BEAD_GROUND_LINE;

    for (let band = 0; band < BEAD_BANDS; band++)
    {
        const dy = -radius + ((radius * 2) * (band / BEAD_BANDS));
        const next = -radius + ((radius * 2) * ((band + 1) / BEAD_BANDS));

        //  Below the horizon it is ground rather than sky, which is what turns
        //  a gradient into a place.
        const color = dy >= horizon
            ? ground
            : mixColor(skyTop, skyLow, (dy + radius) / (horizon + radius));

        const half = Math.max(chord(radius, dy), chord(radius, next));

        gfx.fillStyle(color, 1);
        gfx.fillRect(x - half, y + dy, half * 2, (next - dy) + 1);
    }

    //  A light cap across the top, the same one light the whole game is lit by,
    //  so a stop reads as a bead rather than as a sticker.
    gfx.fillStyle(0xffffff, locked ? BEAD_SHEEN_ALPHA * 0.35 : BEAD_SHEEN_ALPHA);
    gfx.fillEllipse(x, y - (radius * 0.42), radius * 1.05, radius * 0.5);

    gfx.lineStyle(BEAD_RING_WIDTH, edge, locked ? 0.35 : 0.95);
    gfx.strokeCircle(x, y, radius);
}

/**
 * A padlock, for the stops that are not open yet.
 *
 * Drawn rather than written. The old screen put the word LOCKED beside every
 * stop that was not reachable, which on a fresh save is nine identical words
 * down the side of the screen - repetition the eye has to wade through to find
 * the one line that actually says something. A shape says it once, in the place
 * the number would have been, and says nothing at all the rest of the time.
 */
export function drawPadlock (
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    color: number,
    alpha: number
): void
{
    const bodyWidth = size;
    const bodyHeight = size * 0.72;
    const bodyTop = y - (bodyHeight * 0.16);

    //  The shackle first, so the body sits over its feet.
    const shackleRadius = size * 0.32;
    const shackleY = bodyTop - (shackleRadius * 0.2);

    gfx.lineStyle(Math.max(1.5, size * 0.15), color, alpha);
    gfx.beginPath();
    gfx.arc(x, shackleY, shackleRadius, Math.PI, 0);
    gfx.strokePath();

    gfx.fillStyle(color, alpha);
    gfx.fillRoundedRect(x - (bodyWidth / 2), bodyTop, bodyWidth, bodyHeight, size * 0.18);
}
