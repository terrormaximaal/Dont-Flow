import { Scene } from 'phaser';
import { DEPTH_HUD, GAME_WIDTH, HUD_FONT } from '../config/constants';
import {
    TITLE_FILL_TOP,
    TITLE_FLOW_STOPS,
    TITLE_GLOW,
    TITLE_GLOW_BLUR,
    TITLE_MAIN_SIZE,
    TITLE_MAIN_TRACKING,
    TITLE_REFLECT_ALPHA,
    TITLE_REFLECT_GAP,
    TITLE_REFLECT_SQUASH,
    TITLE_RULE_ALPHA,
    TITLE_RULE_LIFT,
    TITLE_RULE_WIDTH,
    TITLE_TOP_ALPHA,
    TITLE_TOP_COLOR,
    TITLE_TOP_SIZE,
    TITLE_TOP_TRACKING
} from '../config/menuTheme';

/**
 * The wordmark.
 *
 * Two lines rather than one, and that is the whole design: a single line of
 * capitals is a label however it is coloured, and a small tracked-out word
 * stacked over a large one is a lockup. DON'T is the qualifier and FLOW is the
 * name, so they are set at very different sizes and only one of them carries
 * colour.
 *
 * The colour runs *across* FLOW rather than down it. A vertical ramp gives
 * every letter the same two colours and reads as a metal effect; a horizontal
 * one through four stops gives each letter its own place in the sequence, so
 * the word does the thing the game is about. That is the only justification a
 * gradient on a title ever has.
 *
 * It is a real canvas gradient, not a stack of tinted copies. Phaser's Text
 * takes a CanvasGradient wherever it takes a colour, but the gradient has to be
 * built from that text object's own context and sized to the text it fills - so
 * it can only be made once the text exists.
 *
 * Below both sits a reflection, thrown down towards the pool. Not decoration:
 * it is what makes the title belong to the place rather than float in front of
 * it, and it costs one extra text object that never updates.
 */
export class TitleMark
{
    /** The two lines, for the scene to animate in. */
    readonly top: Phaser.GameObjects.Text;
    readonly main: Phaser.GameObjects.Text;

    /** The mirrored copy, which follows the main line. */
    readonly reflection: Phaser.GameObjects.Text;

    private readonly rule: Phaser.GameObjects.Graphics;

    /**
     * @param topY  Centre of the small word.
     * @param mainY Centre of the large one.
     */
    constructor (scene: Scene, topY: number, mainY: number)
    {
        this.top = scene.add.text(GAME_WIDTH / 2, topY, "DON'T", {
            fontFamily: HUD_FONT,
            fontSize: TITLE_TOP_SIZE,
            color: TITLE_TOP_COLOR
        });

        this.top.setOrigin(0.5);
        this.top.setDepth(DEPTH_HUD);
        this.top.setLetterSpacing(TITLE_TOP_TRACKING);
        this.top.setAlpha(TITLE_TOP_ALPHA);

        this.main = scene.add.text(GAME_WIDTH / 2, mainY, 'FLOW', {
            fontFamily: HUD_FONT,
            fontSize: TITLE_MAIN_SIZE
        });

        this.main.setOrigin(0.5);
        this.main.setDepth(DEPTH_HUD);
        this.main.setLetterSpacing(TITLE_MAIN_TRACKING);

        //  The glow first: a shadow with no offset and a wide blur, in a hue
        //  from the middle of the ramp, so the word looks lit from within
        //  rather than outlined.
        this.main.setShadow(0, 0, TITLE_GLOW, TITLE_GLOW_BLUR, true, true);

        this.applyFlowGradient();

        //  A short rule *above* the small word, not between the two.
        //
        //  Between them it fouled the top of FLOW - the two words are already
        //  close, which is what makes them one mark, so there is no room for a
        //  third thing in the middle. Above the lockup it reads as a kicker
        //  and gives the whole block a top edge to hang from, which is the job
        //  a rule was doing in the single-line version anyway.
        this.rule = scene.add.graphics();
        this.rule.setDepth(DEPTH_HUD);

        const ruleY = topY - (this.top.height * 0.5) - TITLE_RULE_LIFT;

        for (let i = 0; i < 3; i++)
        {
            const width = TITLE_RULE_WIDTH * (1 - (i * 0.16));
            const alpha = TITLE_RULE_ALPHA * (i === 0 ? 1 : 0.25);

            this.rule.fillStyle(i === 0 ? 0xbfe8ff : 0x7a4bff, alpha);
            this.rule.fillRect((GAME_WIDTH - width) / 2, ruleY + (i * 0.5), width, i === 0 ? 2 : 4);
        }

        this.reflection = this.buildReflection(scene, mainY);
    }

    /**
     * A mirrored, squashed, faded copy of the big word.
     *
     * Flipped by a negative y scale rather than redrawn, so it can never drift
     * out of step with the word it reflects - and squashed, because a
     * reflection in liquid is never the same height as the thing above it.
     */
    private buildReflection (scene: Scene, mainY: number): Phaser.GameObjects.Text
    {
        const text = scene.add.text(GAME_WIDTH / 2, mainY + (this.main.height / 2) + TITLE_REFLECT_GAP, 'FLOW', {
            fontFamily: HUD_FONT,
            fontSize: TITLE_MAIN_SIZE
        });

        text.setOrigin(0.5, 0);
        text.setDepth(DEPTH_HUD - 1);
        text.setLetterSpacing(TITLE_MAIN_TRACKING);
        text.setScale(1, -TITLE_REFLECT_SQUASH);
        text.setAlpha(TITLE_REFLECT_ALPHA);
        text.setColor(TITLE_FILL_TOP);

        return text;
    }

    /**
     * Fills the large word with the palette running left to right.
     *
     * Guarded rather than assumed. The gradient needs a 2D context from the
     * text's own canvas, and a build that renders text some other way would
     * hand back nothing here - in which case a flat fill is a perfectly good
     * title and the menu still works.
     */
    private applyFlowGradient (): void
    {
        const context = this.main.context;

        if (!context || typeof context.createLinearGradient !== 'function')
        {
            this.main.setColor(TITLE_FILL_TOP);

            return;
        }

        const gradient = context.createLinearGradient(0, 0, this.main.width, 0);

        TITLE_FLOW_STOPS.forEach((stop, index) => {

            gradient.addColorStop(index / (TITLE_FLOW_STOPS.length - 1), stop);

        });

        this.main.setFill(gradient);
    }

    /** Everything the scene animates, so it can fade the mark as one thing. */
    get parts (): Phaser.GameObjects.GameObject[]
    {
        return [ this.top, this.main, this.rule, this.reflection ];
    }

    setDepth (depth: number): void
    {
        this.top.setDepth(depth);
        this.main.setDepth(depth);
        this.rule.setDepth(depth);
        this.reflection.setDepth(depth - 1);
    }
}
