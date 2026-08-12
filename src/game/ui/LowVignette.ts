import { Scene } from 'phaser';
import {
    COLOR_FAIL_FLASH,
    GAME_HEIGHT,
    GAME_WIDTH,
    LOW_PULSE_DEPTH,
    LOW_PULSE_MS,
    LOW_VIGNETTE_ALPHA,
    LOW_VIGNETTE_BANDS,
    LOW_VIGNETTE_FADE_MS,
    VIGNETTE_DEPTH
} from '../config/constants';
import { vignetteBands } from './vignetteBands';

/**
 * The edges of the screen closing in while the run is nearly out.
 *
 * The score is at the top of the screen and the player is not looking at it -
 * they are looking at the road, which is in the middle. So the warning has to
 * arrive somewhere the eye already is, or near enough to it that no glance is
 * needed, and the edges of the frame are the only place that qualifies.
 *
 * Built the same way as the plain vignette: nested outlines, each a hair
 * stronger than the one inside it, because Graphics has no radial gradient.
 * Drawn once and then only faded, so being on screen costs nothing per frame.
 */
export class LowVignette
{
    private readonly scene: Scene;
    private readonly gfx: Phaser.GameObjects.Graphics;

    /** The tween holding the breath in and out, so it can be stopped cleanly. */
    private pulse: Phaser.Tweens.Tween | null = null;

    private shown = false;

    constructor (scene: Scene)
    {
        this.scene = scene;

        this.gfx = scene.add.graphics();

        //  Above the plain vignette, so the two stack rather than one replacing
        //  the other - the ordinary darkening stays exactly as it was and this
        //  is laid over the top of it.
        this.gfx.setDepth(VIGNETTE_DEPTH + 1);
        this.gfx.setAlpha(0);

        //  Reaching further in than the plain one. A warning that only touches
        //  the last few pixels of the frame is a warning nobody sees.
        const reach = GAME_WIDTH / 3.4;

        for (const band of vignetteBands(reach, LOW_VIGNETTE_BANDS, LOW_VIGNETTE_ALPHA))
        {
            this.gfx.lineStyle(band.width, COLOR_FAIL_FLASH, band.alpha);
            this.gfx.strokeRect(
                band.inset,
                band.inset,
                GAME_WIDTH - (band.inset * 2),
                GAME_HEIGHT - (band.inset * 2)
            );
        }
    }

    /**
     * Whether the run is currently in trouble.
     *
     * Idempotent: called every time the score changes, and does nothing at all
     * unless the answer is different from last time. Without that the pulse
     * would be restarted from the top on every orb, which reads as a flicker
     * rather than as a breath.
     */
    setLow (low: boolean): void
    {
        if (low === this.shown)
        {
            return;
        }

        this.shown = low;

        this.scene.tweens.killTweensOf(this.gfx);

        this.pulse?.stop();
        this.pulse = null;

        if (!low)
        {
            //  Faded rather than hidden. Climbing back out of trouble is worth
            //  something, and a warning that simply vanishes does not say so.
            this.scene.tweens.add({
                targets: this.gfx,
                alpha: 0,
                duration: LOW_VIGNETTE_FADE_MS,
                ease: 'Quad.Out'
            });

            return;
        }

        this.scene.tweens.add({
            targets: this.gfx,
            alpha: 1,
            duration: LOW_VIGNETTE_FADE_MS,
            ease: 'Quad.Out',
            onComplete: () => {

                //  Only once it has arrived, and only if it is still wanted -
                //  a fade that was interrupted by the player recovering must
                //  not start breathing on the way out.
                if (!this.shown)
                {
                    return;
                }

                this.pulse = this.scene.tweens.add({
                    targets: this.gfx,
                    alpha: 1 - LOW_PULSE_DEPTH,
                    duration: LOW_PULSE_MS,
                    ease: 'Sine.InOut',
                    yoyo: true,
                    repeat: -1
                });

            }
        });
    }

    /**
     * Taken off the screen for good, without a fade.
     *
     * For the moment the run actually ends: what follows is much louder, and a
     * warning still breathing underneath it would be describing a run that is
     * already over.
     */
    clear (): void
    {
        this.shown = false;

        this.scene.tweens.killTweensOf(this.gfx);

        this.pulse?.stop();
        this.pulse = null;

        this.gfx.setAlpha(0);
    }
}
