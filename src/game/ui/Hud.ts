import { Scene } from 'phaser';
import {
    COLOR_HUD_DIM,
    COLOR_HUD_STROKE,
    COLOR_HUD_TEXT,
    DEPTH_HUD,
    GAME_WIDTH,
    HUD_COMBO_SIZE,
    HUD_FONT,
    HUD_LEVEL_MARGIN_TOP,
    HUD_LEVEL_SIZE,
    HUD_MARGIN_TOP,
    HUD_SCORE_SIZE,
    HUD_STROKE_THICKNESS,
    HUD_STROKE_THICKNESS_SMALL,
    MULTIPLIER_POP_MS,
    MULTIPLIER_POP_SCALE,
    MULTIPLIER_VISIBLE_FROM,
    COLOR_SCORE_GAIN,
    COLOR_SCORE_LOSS,
    HUD_GLOW_BLUR,
    HUD_LEVEL_TRACKING,
    SCORE_POP_MS,
    SCORE_POP_SCALE,
    SCORE_ROLL_MIN,
    SCORE_ROLL_RATE,
    SCORE_START,
    SCORE_TINT_MS,
    SCORE_TINT_SHIFT
} from '../config/constants';
import { WorldSpec } from '../config/worlds';
import { shiftCss } from '../utils/color';
import { BankMeter } from './BankMeter';

/**
 * Score and multiplier readout. Pure display - it is handed values, it never
 * calculates them.
 */
export class Hud
{
    private readonly scene: Scene;
    private readonly levelText: Phaser.GameObjects.Text;
    private readonly scoreText: Phaser.GameObjects.Text;
    private readonly comboText: Phaser.GameObjects.Text;

    /**
     * How many mistakes the run can still absorb.
     *
     * Separate from the number rather than folded into it, because they say
     * different things: the score is how well the run has gone, and this is how
     * much of it is left. They only look like the same fact while the run is
     * healthy.
     */
    private readonly bank: BankMeter;

    private shownMultiplier = -1;

    /** The world's own text colour, which the score returns to after a change. */
    private readonly textColor: string;

    /** That colour leaning towards a gain and towards a loss. */
    private readonly gainColor: string;
    private readonly lossColor: string;

    /** What the readout currently says, and the value a roll is tweening. */
    private shownScore = SCORE_START;
    private readonly rolling = { value: SCORE_START };

    /**
     * Whether the run is nearly out.
     *
     * Held rather than passed in, because it decides the colour the score
     * *rests* at - the pop after each change still goes green or red, and then
     * settles back to this instead of to the world's own text colour. A number
     * sitting there in red is a different statement from one that flashed red
     * and recovered, and the difference is exactly what needs saying.
     */
    private low = false;

    constructor (scene: Scene, levelName: string, world?: WorldSpec)
    {
        this.scene = scene;

        //  Light worlds need dark text and dark worlds need light; one fixed
        //  colour would be unreadable on half of them.
        const text = world?.hudText ?? COLOR_HUD_TEXT;
        const dim = world?.hudDim ?? COLOR_HUD_DIM;
        const stroke = world?.hudStroke ?? COLOR_HUD_STROKE;

        this.textColor = text;

        //  Shifted towards the accent rather than replaced by it. A flat pale
        //  green reads well over the dark road the floating score flies off,
        //  and disappears against the sky the total sits in front of.
        this.gainColor = shiftCss(text, COLOR_SCORE_GAIN, SCORE_TINT_SHIFT);
        this.lossColor = shiftCss(text, COLOR_SCORE_LOSS, SCORE_TINT_SHIFT);

        this.levelText = scene.add.text(GAME_WIDTH / 2, HUD_LEVEL_MARGIN_TOP, `LEVEL ${levelName}`, {
            fontFamily: HUD_FONT,
            fontSize: HUD_LEVEL_SIZE,
            color: dim,
            stroke: stroke,
            strokeThickness: HUD_STROKE_THICKNESS_SMALL
        });

        this.levelText.setOrigin(0.5, 0);
        this.levelText.setDepth(DEPTH_HUD);

        //  Tracked out. A short all-caps label reads as a title rather than as
        //  a word once its letters are given room.
        this.levelText.setLetterSpacing(HUD_LEVEL_TRACKING);

        this.scoreText = scene.add.text(GAME_WIDTH / 2, HUD_MARGIN_TOP, String(SCORE_START), {
            fontFamily: HUD_FONT,
            fontSize: HUD_SCORE_SIZE,
            color: text,
            stroke: stroke,
            strokeThickness: HUD_STROKE_THICKNESS
        });

        this.scoreText.setOrigin(0.5, 0);
        this.scoreText.setDepth(DEPTH_HUD);

        //  A soft glow in the world's own outline colour, which lets the score
        //  hold against a bright sky or a dark one without a panel behind it.
        this.scoreText.setShadow(0, 0, stroke, HUD_GLOW_BLUR, true, true);

        //  Directly under the total, with the multiplier pushed below it. The
        //  order matters: score, then how much room is left, then what the next
        //  orb is worth - which is the order a player asks those questions in.
        this.bank = new BankMeter(scene, HUD_MARGIN_TOP + HUD_SCORE_SIZE + 12, text);

        this.comboText = scene.add.text(GAME_WIDTH / 2, HUD_MARGIN_TOP + HUD_SCORE_SIZE + 26, '', {
            fontFamily: HUD_FONT,
            fontSize: HUD_COMBO_SIZE,
            color: dim,
            stroke: stroke,
            strokeThickness: HUD_STROKE_THICKNESS_SMALL
        });

        this.comboText.setOrigin(0.5, 0);
        this.comboText.setDepth(DEPTH_HUD);
        this.comboText.setShadow(0, 0, stroke, HUD_GLOW_BLUR * 0.6, true, true);
    }

    /**
     * The score, rolled up to rather than snapped to.
     *
     * A number that snaps is read as a *different* number; one that travels is
     * read as the same number changing, which is the whole point of a counter.
     * Rolled at a fixed rate rather than over a fixed duration, so a big gain
     * takes visibly longer than a small one instead of every change feeling the
     * same size.
     */
    setScore (score: number): void
    {
        //  The meter is told first and unconditionally. It reports a count
        //  rather than a total, so it has to be right even when the total has
        //  not moved - and a run that starts already low would otherwise show
        //  a full bank until the first orb.
        this.bank.setScore(score);

        const from = this.shownScore;
        const step = score - from;

        if (step === 0)
        {
            return;
        }

        //  Whatever roll is running is dropped rather than queued, so a run of
        //  quick collects always ends on the true total.
        this.scene.tweens.killTweensOf(this.rolling);

        this.reactToScore(step);

        if (Math.abs(step) < SCORE_ROLL_MIN)
        {
            this.shownScore = score;
            this.scoreText.setText(String(score));

            return;
        }

        this.rolling.value = from;

        this.scene.tweens.add({
            targets: this.rolling,
            value: score,
            duration: (Math.abs(step) / SCORE_ROLL_RATE) * 1000,
            ease: 'Quad.Out',
            onUpdate: () => {

                this.shownScore = Math.round(this.rolling.value);
                this.scoreText.setText(String(this.shownScore));

            },
            onComplete: () => {

                this.shownScore = score;
                this.scoreText.setText(String(score));

            }
        });
    }

    /**
     * The kick and the colour the score wears for a moment after a change.
     *
     * Green up, red down, and back to the world's own text colour - so what
     * just happened is legible from the top of the screen without reading the
     * number, which is where the player's eyes are not.
     */
    private reactToScore (step: number): void
    {
        this.scene.tweens.killTweensOf(this.scoreText);

        this.scoreText.setScale(SCORE_POP_SCALE);
        this.scoreText.setColor(step > 0 ? this.gainColor : this.lossColor);

        this.scene.tweens.add({
            targets: this.scoreText,
            scale: 1,
            duration: SCORE_POP_MS,
            ease: 'Back.Out'
        });

        this.scene.time.delayedCall(SCORE_TINT_MS, () => this.scoreText.setColor(this.restingColor()));
    }

    /**
     * Whether the run is close to running out.
     *
     * Applied immediately as well as remembered, so it does not wait for the
     * next change to be seen - the moment a run drops into trouble is a moment
     * where nothing else may happen for a while.
     */
    setLow (low: boolean): void
    {
        if (low === this.low)
        {
            return;
        }

        this.low = low;

        this.scoreText.setColor(this.restingColor());
    }

    /**
     * The colour the score sits at between changes.
     *
     * The full loss colour when the run is low, not the shifted one the pops
     * use. A quarter-shift is right for a tint that lasts a third of a second
     * and wrong for a state that lasts until the run ends or recovers - the
     * momentary version has the number's own colour to fall back to, and this
     * one has to say "still" on its own.
     */
    private restingColor (): string
    {
        return this.low ? COLOR_SCORE_LOSS : this.textColor;
    }

    /**
     * Hidden once the run ends - the completion panel reports the score itself,
     * and a live combo showing through the dim contradicts the final total.
     */
    setVisible (visible: boolean): void
    {
        this.levelText.setVisible(visible);
        this.scoreText.setVisible(visible);
        this.comboText.setVisible(visible);
        this.bank.setVisible(visible);
    }

    setMultiplier (multiplier: number): void
    {
        if (multiplier === this.shownMultiplier)
        {
            return;
        }

        const previous = this.shownMultiplier;

        this.shownMultiplier = multiplier;

        //  x1 is just "playing" - only worth the space once it pays extra.
        this.comboText.setText(multiplier >= MULTIPLIER_VISIBLE_FROM ? `x${multiplier}` : '');

        //  Going up is the moment worth selling. Losing it is already loud
        //  enough elsewhere - the drop flashes and the screen kicks - and a kick
        //  here too would read as a reward.
        if (previous < 0 || multiplier <= previous)
        {
            return;
        }

        //  Any kick still running is dropped, so two steps in quick succession
        //  cannot stack into a readout that never settles back.
        this.scene.tweens.killTweensOf(this.comboText);

        this.comboText.setScale(MULTIPLIER_POP_SCALE);

        this.scene.tweens.add({
            targets: this.comboText,
            scale: 1,
            duration: MULTIPLIER_POP_MS,
            ease: 'Back.Out'
        });
    }
}
