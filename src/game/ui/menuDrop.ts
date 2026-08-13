import { COLOR_VALUES } from '../config/constants';
import { mixColor } from '../utils/color';

/**
 * The colours the home screen's drop wanders through.
 *
 * Drawn from the game's own palette rather than invented, so the first thing a
 * player sees is the actual vocabulary of the game. Ordered around the wheel
 * rather than in palette order, because a cycle that jumps from cyan to red and
 * back reads as flickering, and one that travels reads as flowing.
 */
const CYCLE = [
    COLOR_VALUES.cyan,
    COLOR_VALUES.blue,
    COLOR_VALUES.purple,
    COLOR_VALUES.magenta,
    COLOR_VALUES.pink,
    COLOR_VALUES.orange,
    COLOR_VALUES.yellow,
    COLOR_VALUES.green
];

/** Seconds spent travelling from one colour to the next. */
export const MENU_DROP_DWELL = 2.6;

/**
 * What colour the menu drop is at a given moment.
 *
 * Pure, and total: any time has an answer, including a negative one, because
 * the caller hands it whatever its clock says and a menu that has been open all
 * day must not run out of colours.
 *
 * The game is about carrying a colour and changing it. A drop that sits white
 * on the home screen says the opposite, and a drop that snaps between colours
 * says the change is free - so it eases, and never quite settles.
 */
export function menuDropColor (seconds: number): number
{
    const position = seconds / MENU_DROP_DWELL;

    //  Floored rather than truncated, so a negative clock walks backwards
    //  through the cycle instead of bouncing at zero.
    const index = Math.floor(position);
    const t = position - index;

    const from = CYCLE[((index % CYCLE.length) + CYCLE.length) % CYCLE.length];
    const to = CYCLE[(((index + 1) % CYCLE.length) + CYCLE.length) % CYCLE.length];

    //  Smoothstep, so each colour is held for a moment at both ends of its
    //  span rather than being passed through at constant speed. A linear blend
    //  spends most of its time in the muddle between two colours, which is
    //  exactly where the palette looks worst.
    return mixColor(from, to, t * t * (3 - (2 * t)));
}

/** The colours it visits, for anything that needs to know the whole set. */
export const MENU_DROP_CYCLE = CYCLE;
