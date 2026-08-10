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
    MULTIPLIER_VISIBLE_FROM
} from '../config/constants';
import { WorldSpec } from '../config/worlds';

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

    private shownMultiplier = -1;

    constructor (scene: Scene, levelName: string, world?: WorldSpec)
    {
        this.scene = scene;

        //  Light worlds need dark text and dark worlds need light; one fixed
        //  colour would be unreadable on half of them.
        const text = world?.hudText ?? COLOR_HUD_TEXT;
        const dim = world?.hudDim ?? COLOR_HUD_DIM;
        const stroke = world?.hudStroke ?? COLOR_HUD_STROKE;

        this.levelText = scene.add.text(GAME_WIDTH / 2, HUD_LEVEL_MARGIN_TOP, `LEVEL ${levelName}`, {
            fontFamily: HUD_FONT,
            fontSize: HUD_LEVEL_SIZE,
            color: dim,
            stroke: stroke,
            strokeThickness: HUD_STROKE_THICKNESS_SMALL
        });

        this.levelText.setOrigin(0.5, 0);
        this.levelText.setDepth(DEPTH_HUD);

        this.scoreText = scene.add.text(GAME_WIDTH / 2, HUD_MARGIN_TOP, '0', {
            fontFamily: HUD_FONT,
            fontSize: HUD_SCORE_SIZE,
            color: text,
            stroke: stroke,
            strokeThickness: HUD_STROKE_THICKNESS
        });

        this.scoreText.setOrigin(0.5, 0);
        this.scoreText.setDepth(DEPTH_HUD);

        this.comboText = scene.add.text(GAME_WIDTH / 2, HUD_MARGIN_TOP + HUD_SCORE_SIZE + 8, '', {
            fontFamily: HUD_FONT,
            fontSize: HUD_COMBO_SIZE,
            color: dim,
            stroke: stroke,
            strokeThickness: HUD_STROKE_THICKNESS_SMALL
        });

        this.comboText.setOrigin(0.5, 0);
        this.comboText.setDepth(DEPTH_HUD);
    }

    setScore (score: number): void
    {
        this.scoreText.setText(String(score));
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
