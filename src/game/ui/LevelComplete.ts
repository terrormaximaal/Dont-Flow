import { Scene } from 'phaser';
import {
    BUTTON_GAP,
    BUTTON_HEIGHT,
    BUTTON_LABEL_SIZE,
    BUTTON_WIDTH,
    COLOR_BUTTON,
    COLOR_BUTTON_LABEL,
    COLOR_BUTTON_SECONDARY,
    COLOR_BUTTON_SECONDARY_LABEL,
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
    levelName: string;
    score: number;
    bestCombo: number;

    /** False on the last level, which changes the wording and the primary action. */
    hasNext: boolean;
}

export interface LevelCompleteActions
{
    /** Next level, or back to the first if this was the last. */
    onPrimary: () => void;

    /** Play the same level again. */
    onRetry: () => void;
}

/**
 * End-of-level panel: the result and where to go next. Fades in over the frozen
 * track so the finish still reads as part of the same scene.
 */
export class LevelComplete
{
    constructor (scene: Scene, result: LevelCompleteResult, actions: LevelCompleteActions)
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

        const centerY = GAME_HEIGHT * 0.40;

        const heading = result.hasNext ? `LEVEL ${result.levelName} COMPLETE` : 'ALL LEVELS COMPLETE';

        const title = scene.add.text(GAME_WIDTH / 2, centerY - 110, heading, {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_TITLE_SIZE,
            color: COLOR_HUD_TEXT,
            align: 'center'
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

        //  Guard the whole panel: one press wins, however it was triggered, so a
        //  double tap during the fade cannot fire two scene restarts.
        let used = false;

        const once = (action: () => void) => () => {

            if (used)
            {
                return;
            }

            used = true;

            action();

        };

        const primaryY = centerY + 130;

        this.addButton(
            scene,
            layer,
            primaryY,
            result.hasNext ? 'NEXT LEVEL' : 'START OVER',
            COLOR_BUTTON,
            COLOR_BUTTON_LABEL,
            once(actions.onPrimary)
        );

        this.addButton(
            scene,
            layer,
            primaryY + BUTTON_HEIGHT + BUTTON_GAP,
            'RETRY',
            COLOR_BUTTON_SECONDARY,
            COLOR_BUTTON_SECONDARY_LABEL,
            once(actions.onRetry)
        );

        //  Desktop players have their hands on the keyboard already.
        const primaryKey = once(actions.onPrimary);

        scene.input.keyboard?.once('keydown-SPACE', primaryKey);
        scene.input.keyboard?.once('keydown-ENTER', primaryKey);

        scene.tweens.add({
            targets: layer,
            alpha: 1,
            duration: OVERLAY_FADE_MS,
            ease: 'Quad.Out'
        });
    }

    private addButton (
        scene: Scene,
        layer: Phaser.GameObjects.Container,
        y: number,
        text: string,
        fill: number,
        labelColor: string,
        onPress: () => void
    ): void
    {
        const button = scene.add.rectangle(GAME_WIDTH / 2, y, BUTTON_WIDTH, BUTTON_HEIGHT, fill);

        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', onPress);

        layer.add(button);

        const label = scene.add.text(GAME_WIDTH / 2, y, text, {
            fontFamily: HUD_FONT,
            fontSize: BUTTON_LABEL_SIZE,
            color: labelColor
        });

        label.setOrigin(0.5);
        layer.add(label);
    }
}
