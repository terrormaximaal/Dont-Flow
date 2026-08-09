import { COLOR_DROP_HIGHLIGHT } from '../config/constants';

/**
 * Draws the drop's teardrop into a Graphics object, around a local origin at
 * the centre of the bulb.
 *
 * Shared so the title screen's logo is the same shape as the player, rather
 * than a second drawing that has to be kept in step by hand.
 */
export function drawTeardrop (gfx: Phaser.GameObjects.Graphics, radius: number, color: number): void
{
    gfx.clear();

    gfx.fillStyle(color, 1);
    gfx.fillTriangle(-radius * 0.62, -radius * 0.62, 0, -radius * 2.05, radius * 0.62, -radius * 0.62);
    gfx.fillCircle(0, 0, radius);

    //  Offset highlight, so the drop reads as a volume and its rotation is
    //  actually visible.
    gfx.fillStyle(COLOR_DROP_HIGHLIGHT, 0.28);
    gfx.fillCircle(-radius * 0.3, -radius * 0.3, radius * 0.34);
}
