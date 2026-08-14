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
    SURVIVAL_TABLE_SHOWN,
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

    /**
     * What this run scored, when there is no level to have got a fraction of.
     *
     * An endless run has no finish, so a percentage is not merely useless but
     * actively wrong: reporting one meant the panel congratulated every dead
     * run on being a hundred percent through. Set this and the panel leads on
     * the score instead, which is the only thing an endless run is for.
     */
    scored?: number;

    /**
     * The best endless runs, highest first, for a run that was one.
     *
     * Shown as a table because the question a player has the moment a run ends
     * is not "have I ever done well" but "was that any good", and only a table
     * answers it.
     */
    table?: number[];

    /** Where this run placed, from 1, or 0 if it did not make the table. */
    placed?: number;
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

        //  How far, as a percentage - or what it scored, where there is no
        //  finish to be a fraction of. The one number a failed run has that is
        //  worth looking at, and the one that makes the next attempt a
        //  comparison rather than a fresh start.
        const endless = result.scored !== undefined;
        const percent = Math.round(Math.min(1, Math.max(0, result.progress)) * 100);

        const headline = endless ? `${result.scored}` : `${percent}%`;

        const reached = scene.add.text(GAME_WIDTH / 2, centerY - 24, headline, {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_TITLE_SIZE * 2,
            color: COLOR_HUD_TEXT
        });

        reached.setOrigin(0.5);
        layer.add(reached);

        //  The streak rides on the caption for an endless run, so the line
        //  below it is free for the table. Given its own line the table sat
        //  against the top of the RETRY button with ten pixels between them,
        //  and moving it up put it into the caption instead - there is only
        //  room here for two lines, so two is what it gets.
        const caption = endless
            ? `${result.levelName}   STREAK ${result.bestCombo}`
            : `THROUGH LEVEL ${result.levelName}`;

        const through = scene.add.text(GAME_WIDTH / 2, centerY + 30, caption, {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_DETAIL_SIZE,
            color: COLOR_HUD_DIM
        });

        through.setOrigin(0.5);
        layer.add(through);

        //  The table, for an endless run: the three best, with this one marked
        //  where it landed. A run that missed the table is simply not marked,
        //  which says what happened without saying anything about it.
        const ranking = (result.table ?? [])
            .slice(0, SURVIVAL_TABLE_SHOWN)
            .map((score, at) => (at + 1 === result.placed ? `[${score}]` : `${score}`))
            .join('   ');

        const detail = scene.add.text(
            GAME_WIDTH / 2,
            centerY + 62,
            endless
                ? ranking
                : (result.bestScore === null ? `STREAK ${result.bestCombo}` : `STREAK ${result.bestCombo}   BEST ${result.bestScore}`),
            {
                fontFamily: HUD_FONT,
                fontSize: OVERLAY_BEST_SIZE,
                color: COLOR_HUD_DIM,
                align: 'center'
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
