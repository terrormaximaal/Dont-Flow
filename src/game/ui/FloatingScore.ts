import { Scene } from 'phaser';
import {
    COLOR_HUD_STROKE,
    COLOR_SCORE_GAIN,
    COLOR_SCORE_LOSS,
    DEPTH_FX,
    FLOAT_SCORE_DURATION,
    FLOAT_SCORE_PENALTY_SIZE,
    FLOAT_SCORE_RISE,
    FLOAT_SCORE_SIZE,
    HUD_FONT,
    HUD_STROKE_THICKNESS_SMALL
} from '../config/constants';

/**
 * The points won or lost, rising from where it happened and fading out.
 *
 * Deliberately at the point of contact rather than on the HUD: what matters is
 * which object caused it, and a number that appears on the orb you just touched
 * says that without any text explaining the rule.
 */
export function showFloatingScore (scene: Scene, x: number, y: number, amount: number): void
{
    const gained = amount > 0;

    const label = scene.add.text(x, y, gained ? `+${amount}` : String(amount), {
        fontFamily: HUD_FONT,
        fontSize: gained ? FLOAT_SCORE_SIZE : FLOAT_SCORE_PENALTY_SIZE,
        color: gained ? COLOR_SCORE_GAIN : COLOR_SCORE_LOSS,
        stroke: COLOR_HUD_STROKE,
        strokeThickness: HUD_STROKE_THICKNESS_SMALL
    });

    label.setOrigin(0.5);
    label.setDepth(DEPTH_FX);

    scene.tweens.add({
        targets: label,
        y: y - FLOAT_SCORE_RISE,
        alpha: 0,
        duration: FLOAT_SCORE_DURATION,
        ease: 'Cubic.Out',
        onComplete: () => label.destroy()
    });
}
