import { Scene } from 'phaser';
import {
    BUTTON_GAP,
    BUTTON_HEIGHT,
    COLOR_FAIL_TITLE,
    COLOR_HUD_DIM,
    COLOR_HUD_TEXT,
    COLOR_OVERLAY_DIM,
    DEPTH_OVERLAY,
    GAME_HEIGHT,
    GAME_WIDTH,
    HUD_FONT,
    OVERLAY_BEST_SIZE,
    OVERLAY_DETAIL_SIZE,
    OVERLAY_DIM_ALPHA,
    OVERLAY_ENERGY_TICK_MS,
    OVERLAY_ENERGY_Y,
    OVERLAY_FADE_MS,
    OVERLAY_FAIL_TITLE_SIZE,
    OVERLAY_TITLE_SIZE
} from '../config/constants';
import { EnergySystem } from '../systems/EnergySystem';
import { Button, ButtonVariant } from './Button';
import { EnergyMeter } from './EnergyMeter';
import { stagger } from './LevelComplete';

export interface RunFailedResult
{
    levelName: string;

    /** How far into the level the run got, 0 to 1. */
    progress: number;

    bestCombo: number;

    /** Best score stored for this level, or null if it has never been finished. */
    bestScore: number | null;
}

export interface RunFailedActions
{
    /** Play the same level again. The primary action - failing is not a menu. */
    onRetry: () => void;

    onMenu: () => void;
}

/**
 * The panel shown when the bank runs out.
 *
 * Deliberately not the level-complete panel with different words. That one
 * reports a total and offers a way onward; this one has no total worth
 * reporting - the score is zero, that is why it is here - so it reports the
 * only thing that is actually interesting about a failed run, which is how
 * close it got.
 *
 * RETRY is the primary and sits where NEXT LEVEL sits on the other panel, so
 * the thumb that has been pressing onward all game presses onward here too.
 */
export class RunFailed
{
    constructor (scene: Scene, result: RunFailedResult, actions: RunFailedActions, energy: EnergySystem)
    {
        const canPlayAgain = energy.mayStart();

        const layer = scene.add.container(0, 0);

        layer.setDepth(DEPTH_OVERLAY);
        layer.setAlpha(0);

        layer.add(scene.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            COLOR_OVERLAY_DIM,
            OVERLAY_DIM_ALPHA
        ));

        const centerY = GAME_HEIGHT * 0.40;

        const title = scene.add.text(GAME_WIDTH / 2, centerY - 104, 'OUT OF FLOW', {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_FAIL_TITLE_SIZE,
            color: COLOR_FAIL_TITLE,
            align: 'center'
        });

        title.setOrigin(0.5);
        layer.add(title);

        //  How far, as a percentage. The one number a failed run has that is
        //  worth looking at, and the one that makes the next attempt a
        //  comparison rather than a fresh start.
        const percent = Math.round(Math.min(1, Math.max(0, result.progress)) * 100);

        const reached = scene.add.text(GAME_WIDTH / 2, centerY - 24, `${percent}%`, {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_TITLE_SIZE * 2,
            color: COLOR_HUD_TEXT
        });

        reached.setOrigin(0.5);
        layer.add(reached);

        const through = scene.add.text(GAME_WIDTH / 2, centerY + 30, `THROUGH LEVEL ${result.levelName}`, {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_DETAIL_SIZE,
            color: COLOR_HUD_DIM
        });

        through.setOrigin(0.5);
        layer.add(through);

        const detail = scene.add.text(
            GAME_WIDTH / 2,
            centerY + 62,
            result.bestScore === null ? `STREAK ${result.bestCombo}` : `STREAK ${result.bestCombo}   BEST ${result.bestScore}`,
            {
                fontFamily: HUD_FONT,
                fontSize: OVERLAY_BEST_SIZE,
                color: COLOR_HUD_DIM
            }
        );

        detail.setOrigin(0.5);
        layer.add(detail);

        //  One press wins, however it was triggered - the same guard the
        //  completion panel carries, and for the same reason: a double tap
        //  during the fade would otherwise fire two scene restarts.
        let used = false;

        const once = (action: () => void) => () => {

            if (used)
            {
                return;
            }

            used = true;

            action();

        };

        const primaryY = centerY + 124;
        const step = BUTTON_HEIGHT + BUTTON_GAP;

        const buttons: Array<[ string, ButtonVariant, () => void ]> = [
            [ 'RETRY', canPlayAgain ? 'primary' : 'locked', actions.onRetry ],
            [ 'MENU', 'ghost', actions.onMenu ]
        ];

        buttons.forEach(([ label, variant, action ], index) => {

            const button = new Button(scene, {
                x: GAME_WIDTH / 2,
                y: primaryY + (index * step),
                label,
                variant,
                onPress: once(action)
            });

            layer.add(button.container);

        });

        const meter = new EnergyMeter(scene, OVERLAY_ENERGY_Y, energy, layer);

        scene.time.addEvent({
            delay: OVERLAY_ENERGY_TICK_MS,
            loop: true,
            callback: () => meter.update()
        });

        const retryKey = once(actions.onRetry);

        scene.input.keyboard?.once('keydown-SPACE', retryKey);
        scene.input.keyboard?.once('keydown-ENTER', retryKey);

        scene.tweens.add({
            targets: layer,
            alpha: 1,
            duration: OVERLAY_FADE_MS,
            ease: 'Quad.Out'
        });

        stagger(scene, [ title, reached, through, detail ]);
    }
}
