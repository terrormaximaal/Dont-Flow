import { HORIZON_Y, GAME_HEIGHT } from '../config/constants';
import { WorldSpec } from '../config/worlds';

/**
 * Paints the page behind the canvas to match the world being shown.
 *
 * The game is authored at one fixed portrait size and letterboxed to fit, so on
 * anything not exactly 480:854 there are bars around it - and on a modern tall
 * phone that is a lot of screen. A 390x844 phone shows the game at 390x694,
 * leaving 18% of the display as bars. Left as flat near-black they read as dead
 * space, and against a bright world like the sky level they read as damage.
 *
 * Filling them with the world's own sky above the horizon and its ground below
 * turns the bars into a continuation of the picture instead. The split is put at
 * the same fraction of the page as the horizon is of the game, so on a screen
 * wide enough to letterbox at the sides the two line up exactly.
 */
export function paintPageBackdrop (world: WorldSpec): void
{
    if (typeof document === 'undefined')
    {
        return;
    }

    const horizon = (HORIZON_Y / GAME_HEIGHT) * 100;

    const skyTop = css(world.skyTop);

    //  The canvas lays a haze band over its own horizon, so the sky it actually
    //  shows there is not skyBottom but skyBottom seen through that haze. Match
    //  it, or the bars meet the canvas on a visible seam.
    const skyBottom = css(mix(world.skyBottom, world.hazeColor, world.hazeAlpha));

    const ground = css(world.groundColor ?? world.track);

    document.body.style.background =
        `linear-gradient(to bottom, ${skyTop} 0%, ${skyBottom} ${horizon}%, ${ground} ${horizon}%, ${ground} 100%)`;
}

/**
 * Paints the bars in two flat colours, for a screen that is not a world.
 *
 * The menu has no horizon and no ground, so there is nothing for the world
 * version below to measure against - it just needs the bars to carry the top
 * and bottom of whatever is on screen.
 */
export function paintPageColors (top: number, bottom: number): void
{
    if (typeof document === 'undefined')
    {
        return;
    }

    document.body.style.background = `linear-gradient(to bottom, ${css(top)} 0%, ${css(bottom)} 100%)`;
}

function css (color: number): string
{
    return `#${color.toString(16).padStart(6, '0')}`;
}

/** `amount` of `over` painted on top of `base`, per channel. */
function mix (base: number, over: number, amount: number): number
{
    const blend = (shift: number) => {

        const a = (base >> shift) & 0xff;
        const b = (over >> shift) & 0xff;

        return Math.round(a + ((b - a) * amount)) & 0xff;
    };

    return (blend(16) << 16) | (blend(8) << 8) | blend(0);
}
