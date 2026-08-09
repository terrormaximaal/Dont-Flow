import { Scene } from 'phaser';
import {
    COLOR_HUD_DIM,
    COLOR_HUD_STROKE,
    COLOR_HUD_TEXT,
    COMBO_VISIBLE_FROM,
    DEPTH_HUD,
    GAME_WIDTH,
    HUD_COMBO_SIZE,
    HUD_FONT,
    HUD_LEVEL_MARGIN_TOP,
    HUD_LEVEL_SIZE,
    HUD_MARGIN_TOP,
    HUD_SCORE_SIZE,
    HUD_STROKE_THICKNESS,
    HUD_STROKE_THICKNESS_SMALL
} from '../config/constants';

/**
 * Score and combo readout. Pure display - it is handed values, it never
 * calculates them.
 */
export class Hud
{
    private readonly levelText: Phaser.GameObjects.Text;
    private readonly scoreText: Phaser.GameObjects.Text;
    private readonly comboText: Phaser.GameObjects.Text;

    private shownCombo = -1;

    constructor (scene: Scene, levelName: string)
    {
        this.levelText = scene.add.text(GAME_WIDTH / 2, HUD_LEVEL_MARGIN_TOP, `LEVEL ${levelName}`, {
            fontFamily: HUD_FONT,
            fontSize: HUD_LEVEL_SIZE,
            color: COLOR_HUD_DIM,
            stroke: COLOR_HUD_STROKE,
            strokeThickness: HUD_STROKE_THICKNESS_SMALL
        });

        this.levelText.setOrigin(0.5, 0);
        this.levelText.setDepth(DEPTH_HUD);

        this.scoreText = scene.add.text(GAME_WIDTH / 2, HUD_MARGIN_TOP, '0', {
            fontFamily: HUD_FONT,
            fontSize: HUD_SCORE_SIZE,
            color: COLOR_HUD_TEXT,
            stroke: COLOR_HUD_STROKE,
            strokeThickness: HUD_STROKE_THICKNESS
        });

        this.scoreText.setOrigin(0.5, 0);
        this.scoreText.setDepth(DEPTH_HUD);

        this.comboText = scene.add.text(GAME_WIDTH / 2, HUD_MARGIN_TOP + HUD_SCORE_SIZE + 8, '', {
            fontFamily: HUD_FONT,
            fontSize: HUD_COMBO_SIZE,
            color: COLOR_HUD_DIM,
            stroke: COLOR_HUD_STROKE,
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

    setCombo (combo: number): void
    {
        if (combo === this.shownCombo)
        {
            return;
        }

        this.shownCombo = combo;

        //  A combo of one is just "a hit" - only show it once it is a streak.
        this.comboText.setText(combo >= COMBO_VISIBLE_FROM ? `COMBO x${combo}` : '');
    }
}
