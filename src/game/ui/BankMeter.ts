import { Scene } from 'phaser';
import {
    BANK_METER_FADE_MS,
    BANK_METER_GAP,
    BANK_METER_HEIGHT,
    BANK_METER_TRACK_ALPHA,
    BANK_METER_WIDTH,
    COLOR_SCORE_LOSS,
    DEPTH_HUD,
    GAME_WIDTH
} from '../config/constants';
import { BANK_SEGMENTS, bankUrgency, mistakesLeft } from '../systems/bank';
import { fromCss, mixColor } from '../utils/color';

/**
 * How many mistakes there is still room for, drawn under the score.
 *
 * One segment per mistake, so it is a count rather than a gauge - a player
 * glancing at it learns "three more" rather than "about half", and three more
 * is the thing that actually changes how they play the next stretch of road.
 *
 * Hidden while the bank is full and fading in as it empties, so it is never
 * furniture: its appearing is itself the first warning, and it arrives well
 * before the score turns red.
 */
export class BankMeter
{
    private readonly gfx: Phaser.GameObjects.Graphics;
    private readonly scene: Scene;

    /** The world's own text colour, which a full segment is drawn in. */
    private readonly full: number;

    private shown = -1;
    private urgency = 0;

    constructor (scene: Scene, y: number, textColor: string)
    {
        this.scene = scene;
        this.full = fromCss(textColor);

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_HUD);
        this.gfx.setPosition(GAME_WIDTH / 2, y);
        this.gfx.setAlpha(0);
    }

    /**
     * Redrawn only when the count changes, since that is the only thing on it
     * that can move - the alpha is tweened separately and does not need the
     * shapes laid down again.
     */
    setScore (score: number): void
    {
        const left = mistakesLeft(score);
        const urgency = bankUrgency(score);

        if (urgency !== this.urgency)
        {
            this.urgency = urgency;

            this.scene.tweens.killTweensOf(this.gfx);

            this.scene.tweens.add({
                targets: this.gfx,
                alpha: urgency,
                duration: BANK_METER_FADE_MS,
                ease: 'Quad.Out'
            });
        }

        if (left === this.shown)
        {
            return;
        }

        this.shown = left;
        this.draw(left);
    }

    private draw (left: number): void
    {
        const gfx = this.gfx;

        gfx.clear();

        const step = BANK_METER_WIDTH / BANK_SEGMENTS;
        const width = step - BANK_METER_GAP;
        const start = -BANK_METER_WIDTH / 2;
        const radius = BANK_METER_HEIGHT / 2;

        for (let i = 0; i < BANK_SEGMENTS; i++)
        {
            const x = start + (i * step);

            //  Every segment has a track, so the ones already spent still show
            //  where they were - a meter that simply gets shorter says how much
            //  is left but not how much has gone, and two lit dashes on their
            //  own do not say two out of six.
            //
            //  Drawn in the world's own text colour rather than in black. Black
            //  at a low alpha is invisible on the six dark worlds, which is
            //  exactly where it was tested and exactly the case it failed; the
            //  text colour is the one tone each world is already guaranteed to
            //  show a readout in.
            gfx.fillStyle(this.full, BANK_METER_TRACK_ALPHA);
            gfx.fillRoundedRect(x, -radius, width, BANK_METER_HEIGHT, radius);

            if (i >= left)
            {
                continue;
            }

            //  The last one left is the loss colour outright, and they warm
            //  towards it as they are spent - so the meter says how close the
            //  end is by colour as well as by count.
            const heat = BANK_SEGMENTS > 1 ? 1 - (i / (BANK_SEGMENTS - 1)) : 1;

            gfx.fillStyle(mixColor(this.full, fromCss(COLOR_SCORE_LOSS), heat * heat), 1);
            gfx.fillRoundedRect(x, -radius, width, BANK_METER_HEIGHT, radius);
        }
    }

    setVisible (visible: boolean): void
    {
        this.gfx.setVisible(visible);
    }
}
