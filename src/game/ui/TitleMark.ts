import { Scene } from 'phaser';
import { DEPTH_HUD, GAME_WIDTH, HUD_FONT, TITLE_SIZE } from '../config/constants';
import {
    TITLE_FILL_LOW,
    TITLE_FILL_TOP,
    TITLE_GLOW,
    TITLE_GLOW_BLUR,
    TITLE_RULE_ALPHA,
    TITLE_RULE_WIDTH,
    TITLE_TRACKING
} from '../config/menuTheme';

/**
 * The wordmark.
 *
 * Three things separate a title from a label, and it is all three together
 * rather than any one of them: a vertical gradient down the letters, a glow
 * carrying the same hue behind them, and a rule under the word that gives it a
 * baseline to sit on.
 *
 * The gradient is a real canvas gradient rather than a stack of tinted copies.
 * Phaser's Text will take a CanvasGradient wherever it takes a colour, but the
 * gradient has to be built from that text object's own context and sized to the
 * text it is filling - so it can only be made after the text exists, and has to
 * be remade if the text ever changes.
 */
export class TitleMark
{
    readonly text: Phaser.GameObjects.Text;
    private readonly rule: Phaser.GameObjects.Graphics;

    constructor (scene: Scene, y: number)
    {
        this.text = scene.add.text(GAME_WIDTH / 2, y, "DON'T FLOW", {
            fontFamily: HUD_FONT,
            fontSize: TITLE_SIZE
        });

        this.text.setOrigin(0.5);
        this.text.setDepth(DEPTH_HUD);
        this.text.setLetterSpacing(TITLE_TRACKING);

        //  The glow first: a shadow with no offset and a wide blur, in the
        //  same hue as the foot of the gradient, so the word looks lit from
        //  within rather than outlined.
        this.text.setShadow(0, 0, TITLE_GLOW, TITLE_GLOW_BLUR, true, true);

        this.applyGradient();

        //  A rule under the word. Short of the text's own width on purpose:
        //  matching it exactly reads as an underline, and stopping short reads
        //  as a mark.
        this.rule = scene.add.graphics();
        this.rule.setDepth(DEPTH_HUD);

        const ruleY = y + (this.text.height * 0.42);

        for (let i = 0; i < 3; i++)
        {
            const width = TITLE_RULE_WIDTH * (1 - (i * 0.16));
            const alpha = TITLE_RULE_ALPHA * (i === 0 ? 1 : 0.25);

            this.rule.fillStyle(i === 0 ? 0xbfe8ff : 0x2ea8ff, alpha);
            this.rule.fillRect((GAME_WIDTH - width) / 2, ruleY + (i * 0.5), width, i === 0 ? 2 : 4);
        }
    }

    /**
     * Fills the letters with a top-to-bottom gradient.
     *
     * Guarded rather than assumed. The gradient needs a 2D context from the
     * text's own canvas, and a build that renders text some other way would
     * hand back nothing here - in which case the flat top colour is a perfectly
     * good title and the menu still works.
     */
    private applyGradient (): void
    {
        const context = this.text.context;

        if (!context || typeof context.createLinearGradient !== 'function')
        {
            this.text.setColor(TITLE_FILL_TOP);

            return;
        }

        const gradient = context.createLinearGradient(0, 0, 0, this.text.height);

        gradient.addColorStop(0, TITLE_FILL_TOP);
        gradient.addColorStop(0.55, TITLE_FILL_TOP);
        gradient.addColorStop(1, TITLE_FILL_LOW);

        this.text.setFill(gradient);
    }

    setDepth (depth: number): void
    {
        this.text.setDepth(depth);
        this.rule.setDepth(depth);
    }
}
