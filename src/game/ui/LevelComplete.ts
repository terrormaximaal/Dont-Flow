import { Scene } from 'phaser';
import {
    BUTTON_HEIGHT,
    BUTTON_LABEL_SIZE,
    BUTTON_WIDTH,
    COLOR_BUTTON,
    COLOR_BUTTON_LABEL,
    COLOR_HUD_DIM,
    COLOR_HUD_TEXT,
    COLOR_OVERLAY_DIM,
    DEPTH_OVERLAY,
    GAME_HEIGHT,
    GAME_WIDTH,
    HUD_FONT,
    OVERLAY_DETAIL_SIZE,
    OVERLAY_DIM_ALPHA,
    OVERLAY_FADE_MS,
    OVERLAY_SCORE_SIZE,
    OVERLAY_TITLE_SIZE
} from '../config/constants';

export interface LevelCompleteResult
{
    score: number;
    bestCombo: number;
}

/**
 * End-of-run panel: the result and a way to go again. Fades in over the frozen
 * track so the finish still reads as part of the same scene.
 */
export class LevelComplete
{
    constructor (scene: Scene, result: LevelCompleteResult, onRestart: () => void)
    {
        const layer = scene.add.container(0, 0);

        layer.setDepth(DEPTH_OVERLAY);
        layer.setAlpha(0);

        const dim = scene.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            COLOR_OVERLAY_DIM,
            OVERLAY_DIM_ALPHA
        );

        layer.add(dim);

        const centerY = GAME_HEIGHT * 0.42;

        const title = scene.add.text(GAME_WIDTH / 2, centerY - 110, 'LEVEL COMPLETE', {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_TITLE_SIZE,
            color: COLOR_HUD_TEXT
        });

        title.setOrigin(0.5);
        layer.add(title);

        const score = scene.add.text(GAME_WIDTH / 2, centerY - 20, String(result.score), {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_SCORE_SIZE,
            color: COLOR_HUD_TEXT
        });

        score.setOrigin(0.5);
        layer.add(score);

        const detail = scene.add.text(GAME_WIDTH / 2, centerY + 40, `BEST COMBO x${result.bestCombo}`, {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_DETAIL_SIZE,
            color: COLOR_HUD_DIM
        });

        detail.setOrigin(0.5);
        layer.add(detail);

        const buttonY = centerY + 140;

        const button = scene.add.rectangle(GAME_WIDTH / 2, buttonY, BUTTON_WIDTH, BUTTON_HEIGHT, COLOR_BUTTON);

        button.setInteractive({ useHandCursor: true });
        layer.add(button);

        const label = scene.add.text(GAME_WIDTH / 2, buttonY, 'RESTART', {
            fontFamily: HUD_FONT,
            fontSize: BUTTON_LABEL_SIZE,
            color: COLOR_BUTTON_LABEL
        });

        label.setOrigin(0.5);
        layer.add(label);

        //  Guard against a double tap firing two restarts during the fade.
        let restarted = false;

        const restart = () => {

            if (restarted)
            {
                return;
            }

            restarted = true;

            onRestart();

        };

        button.on('pointerdown', restart);

        //  Desktop players have their hands on the keyboard already.
        scene.input.keyboard?.once('keydown-SPACE', restart);
        scene.input.keyboard?.once('keydown-ENTER', restart);

        scene.tweens.add({
            targets: layer,
            alpha: 1,
            duration: OVERLAY_FADE_MS,
            ease: 'Quad.Out'
        });
    }
}
