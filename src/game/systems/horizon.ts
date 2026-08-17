import { GAME_HEIGHT, GAME_WIDTH, HORIZON_Y } from '../config/constants';
import { WorldSpec } from '../config/worlds';
import { mixColor } from '../utils/color';

/**
 * How far below the horizon the ground is still mostly air, in pixels.
 *
 * Deep enough that the fade is gradual rather than a second edge a little lower
 * down, and no deeper. At a sixth of the screen it washed the whole far half of
 * the road out to nothing, which trades one complaint for another - the road is
 * meant to be coloured in the whole way, not to disappear into fog. The road
 * has a fade of its own along its length for the sense of distance; all this
 * has to do is take the last few pixels to air.
 */
const HAZE_FALL = GAME_HEIGHT * 0.075;

/** Bands, enough that the step between two of them is not a line across the road. */
const HAZE_BANDS = 20;

/**
 * The colour of the sky where it meets the ground.
 *
 * The sky is a gradient down the whole screen and the world's air is laid over
 * it, so this is what is actually on screen a pixel above the horizon - worked
 * out rather than picked, because the whole point is that the two sides match.
 */
export function airAtHorizon (world: WorldSpec): number
{
    const sky = mixColor(world.skyTop, world.skyBottom, HORIZON_Y / GAME_HEIGHT);

    return mixColor(sky, world.hazeColor, world.hazeAlpha);
}

/**
 * The ground and the road going to air as they reach the horizon.
 *
 * There was a haze band for this already, behind everything, and it could not
 * work: the ground is painted from the horizon down over the top of it, so only
 * the half above the line was ever visible. The ground met the sky on a hard
 * edge the full width of the screen - most obvious in the worlds where a pale
 * ground runs up against a dark sky.
 *
 * Drawn in front of the ground, the scenery and the road, and towards the sky's
 * own colour at the horizon rather than towards the world's haze. That is what
 * makes the join disappear instead of merely softening: at the line itself the
 * ground is the colour the sky already is, so there is nothing left to see a
 * step in.
 *
 * Behind the gates and the orbs, which must stay readable wherever they are.
 */
export function hazeHorizon (gfx: Phaser.GameObjects.Graphics, air: number): void
{
    for (let band = 0; band < HAZE_BANDS; band++)
    {
        const t = band / HAZE_BANDS;

        //  Squared, so it lets go of the ground quickly and then trails off,
        //  rather than laying an even veil over the whole band.
        const strength = (1 - t) * (1 - t);

        gfx.fillStyle(air, strength);
        gfx.fillRect(0, HORIZON_Y + (t * HAZE_FALL), GAME_WIDTH, (HAZE_FALL / HAZE_BANDS) + 1);
    }
}
