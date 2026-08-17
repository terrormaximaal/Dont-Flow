import { CHIP_HEIGHT, CHIP_TOUCH_PAD, CHIP_WIDTH } from '../config/constants';

/**
 * How much Phaser adds to a point before testing it against a Container's hit
 * area, in each axis.
 *
 * A Container's display origin is hard-coded to half its own size - it is not
 * settable, and it is added to the translated point before the shape is asked
 * whether it contains it. So a rectangle handed to `setInteractive` is measured
 * from a point half the container up and to the left of where the container
 * actually sits, and anything drawn from the container's position outwards is
 * half itself away from where it looks like it should be.
 */
const CONTAINER_ORIGIN = 0.5;

/**
 * Where a chip's hit area goes, as Phaser wants it: x, y, width, height.
 *
 * Kept out of the file that builds the chip, and free of Phaser, so that the
 * arithmetic can be checked without standing a browser up. It has been got
 * wrong in both directions - once centred on the container, once at its corner
 * - and both times the only thing that caught it was clicking the real game.
 *
 * Measured on the running game, a rectangle at (0, 0, 150, 46) answered over
 * x 237-387 while the pill stood at 312-462: a quarter of the switch responded,
 * and the rest of what answered was empty sky to the left of it. That is a
 * switch that misses when you aim at it and fires when you do not, and it is
 * the likeliest reason the sound switch in the pause overlay was reported as
 * doing nothing.
 */
export function chipHitArea (): [ number, number, number, number ]
{
    return [
        (CHIP_WIDTH * CONTAINER_ORIGIN) - CHIP_TOUCH_PAD,
        (CHIP_HEIGHT * CONTAINER_ORIGIN) - CHIP_TOUCH_PAD,
        CHIP_WIDTH + (CHIP_TOUCH_PAD * 2),
        CHIP_HEIGHT + (CHIP_TOUCH_PAD * 2)
    ];
}

/**
 * The stretch of screen a chip at `chipY` actually answers over, worked out the
 * way Phaser works it out.
 *
 * The chip is hung off the right margin by its own right edge, which is how
 * every screen places it.
 */
export function chipAnswersOver (screenWidth: number, margin: number, chipY: number): {
    left: number;
    right: number;
    top: number;
    bottom: number;
}
{
    const [ x, y, width, height ] = chipHitArea();
    const left = screenWidth - margin - CHIP_WIDTH;

    return {
        left: left + x - (CHIP_WIDTH * CONTAINER_ORIGIN),
        right: left + x - (CHIP_WIDTH * CONTAINER_ORIGIN) + width,
        top: chipY + y - (CHIP_HEIGHT * CONTAINER_ORIGIN),
        bottom: chipY + y - (CHIP_HEIGHT * CONTAINER_ORIGIN) + height
    };
}
