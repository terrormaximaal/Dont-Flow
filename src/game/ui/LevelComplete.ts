import { Scene } from 'phaser';
import {
    BUTTON_GAP,
    BUTTON_HEIGHT,
    COLOR_HUD_DIM,
    COLOR_HUD_TEXT,
    COLOR_NEW_BEST,
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
    OVERLAY_COUNT_MAX_MS,
    OVERLAY_COUNT_RATE,
    OVERLAY_FADE_MS,
    OVERLAY_PART_RISE,
    OVERLAY_SCORE_SIZE,
    OVERLAY_STAGGER_MS,
    OVERLAY_TITLE_SIZE
} from '../config/constants';
import { EnergySystem } from '../systems/EnergySystem';
import { Button, ButtonVariant } from './Button';
import { EnergyMeter } from './EnergyMeter';

export interface LevelCompleteResult
{
    levelName: string;
    score: number;
    bestCombo: number;

    /** Best score stored for this level, after this run has been recorded. */
    /** Null when this is the first finish, so there is no previous best to beat. */
    bestScore: number | null;

    /** Whether this run set that best. */
    isNewBest: boolean;

    /** False on the last level, which changes the wording and the primary action. */
    hasNext: boolean;
}

export interface LevelCompleteActions
{
    /** Next level, or back to the first if this was the last. */
    onPrimary: () => void;

    /** Play the same level again. */
    onRetry: () => void;

    /** Back to the title screen. */
    onMenu: () => void;
}

/**
 * End-of-level panel: the result and where to go next. Fades in over the frozen
 * track so the finish still reads as part of the same scene.
 */
export class LevelComplete
{
    constructor (scene: Scene, result: LevelCompleteResult, actions: LevelCompleteActions, energy: EnergySystem)
    {
        //  The run just played has already been paid for, so this is what is
        //  left for another one.
        const canPlayAgain = energy.mayStart();

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

        const score = scene.add.text(GAME_WIDTH / 2, centerY - 20, '0', {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_SCORE_SIZE,
            color: COLOR_HUD_TEXT
        });

        score.setOrigin(0.5);
        layer.add(score);

        //  Counted up rather than stamped down. The total is the whole point of
        //  this screen and it was being handed over as a finished fact - a
        //  number that travels reads as something earned, and the same number
        //  arriving complete reads as a label.
        //
        //  Rated rather than timed, then capped: a small score should not take
        //  as long to arrive as a large one, and a very large one should not
        //  keep the player waiting to press the button underneath it.
        const counter = { value: 0 };

        scene.tweens.add({
            targets: counter,
            value: result.score,
            duration: Math.min(OVERLAY_COUNT_MAX_MS, (result.score / OVERLAY_COUNT_RATE) * 1000),
            delay: OVERLAY_FADE_MS,
            ease: 'Cubic.Out',
            onUpdate: () => score.setText(String(Math.round(counter.value))),
            onComplete: () => score.setText(String(result.score))
        });

        //  "STREAK" is how many this run took in a row; "BEST" below is the
        //  stored score for the level. Deliberately not written with an x - that
        //  now means the multiplier, and a streak of twelve is an x5, not an x12.
        const detail = scene.add.text(GAME_WIDTH / 2, centerY + 38, `STREAK ${result.bestCombo}`, {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_DETAIL_SIZE,
            color: COLOR_HUD_DIM
        });

        detail.setOrigin(0.5);
        layer.add(detail);

        const best = scene.add.text(
            GAME_WIDTH / 2,
            centerY + 68,
            result.isNewBest || result.bestScore === null ? 'NEW BEST!' : `BEST ${result.bestScore}`,
            {
                fontFamily: HUD_FONT,
                fontSize: OVERLAY_BEST_SIZE,
                color: result.isNewBest ? COLOR_NEW_BEST : COLOR_HUD_DIM
            }
        );

        best.setOrigin(0.5);
        layer.add(best);

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

        const primaryY = centerY + 124;
        const step = BUTTON_HEIGHT + BUTTON_GAP;

        //  Both ways on cost energy, so with none left they are built inert
        //  rather than live and bouncing the player back to the title with no
        //  explanation. Menu always works.
        const playVariant = canPlayAgain ? 'primary' : 'locked';
        const retryVariant = canPlayAgain ? 'ghost' : 'locked';

        const buttons: Array<[ string, ButtonVariant, () => void ]> = [
            [ result.hasNext ? 'NEXT LEVEL' : 'START OVER', playVariant, actions.onPrimary ],
            [ 'RETRY', retryVariant, actions.onRetry ],
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

        //  Shown either way: it is what is left for another run, and the only
        //  thing that explains a locked button.
        const meter = new EnergyMeter(scene, OVERLAY_ENERGY_Y, energy, layer);

        scene.time.addEvent({
            delay: OVERLAY_ENERGY_TICK_MS,
            loop: true,
            callback: () => meter.update()
        });

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

        //  And the parts of it in reading order, a few frames apart. Fading a
        //  panel in as one block is what an assembled screen looks like; the
        //  dim behind it is deliberately not in the list, because the backdrop
        //  should already be there when the first line arrives.
        stagger(scene, [ title, score, detail, best ]);
    }
}

/** Rises each part into place, one after another. */
export function stagger (scene: Scene, parts: Phaser.GameObjects.Components.Transform[]): void
{
    parts.forEach((part, index) => {

        const restingY = part.y;

        part.y = restingY + OVERLAY_PART_RISE;

        scene.tweens.add({
            targets: part,
            y: restingY,
            duration: OVERLAY_FADE_MS,
            delay: index * OVERLAY_STAGGER_MS,
            ease: 'Cubic.Out'
        });

    });
}
