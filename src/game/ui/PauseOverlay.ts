import { Scene } from 'phaser';
import {
    BUTTON_GAP,
    BUTTON_HEIGHT,
    COLOR_HUD_TEXT,
    COLOR_OVERLAY_DIM,
    DEPTH_OVERLAY,
    GAME_HEIGHT,
    GAME_WIDTH,
    HUD_FONT,
    OVERLAY_DIM_ALPHA,
    OVERLAY_ENERGY_TICK_MS,
    OVERLAY_ENERGY_Y,
    OVERLAY_TITLE_SIZE
} from '../config/constants';
import { EnergySystem } from '../systems/EnergySystem';
import { Button, ButtonVariant } from './Button';
import { EnergyMeter } from './EnergyMeter';

export interface PauseActions
{
    onResume: () => void;
    onRetry: () => void;
    onMenu: () => void;
}

/**
 * The paused state. Built and destroyed each time rather than hidden and shown,
 * so there is never a stale overlay sitting invisible over a live run.
 */
export class PauseOverlay
{
    private readonly layer: Phaser.GameObjects.Container;

    /** Keeps the energy countdown moving while the game sits paused. */
    private readonly tick: Phaser.Time.TimerEvent;

    constructor (scene: Scene, actions: PauseActions, energy: EnergySystem)
    {
        //  The run in progress has already been paid for. Starting it again is a
        //  second charge, which there may be nothing left to cover.
        const canRetry = energy.mayStart();

        this.layer = scene.add.container(0, 0);
        this.layer.setDepth(DEPTH_OVERLAY);

        const dim = scene.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            COLOR_OVERLAY_DIM,
            OVERLAY_DIM_ALPHA
        );

        this.layer.add(dim);

        const centerY = GAME_HEIGHT * 0.40;

        const title = scene.add.text(GAME_WIDTH / 2, centerY - 60, 'PAUSED', {
            fontFamily: HUD_FONT,
            fontSize: OVERLAY_TITLE_SIZE,
            color: COLOR_HUD_TEXT
        });

        title.setOrigin(0.5);
        this.layer.add(title);

        const step = BUTTON_HEIGHT + BUTTON_GAP;

        //  Retry is built inert when there is nothing left to spend, rather than
        //  live and restarting into a level that cannot be paid for - which threw
        //  the player out to the title screen mid-run with no explanation.
        //  Resume and Menu cost nothing, so both always work.
        const buttons: Array<[ string, ButtonVariant, () => void ]> = [
            [ 'RESUME', 'primary', actions.onResume ],
            [ 'RETRY', canRetry ? 'secondary' : 'locked', actions.onRetry ],
            [ 'MENU', 'secondary', actions.onMenu ]
        ];

        buttons.forEach(([ label, variant, action ], index) => {

            const button = new Button(scene, {
                x: GAME_WIDTH / 2,
                y: centerY + 30 + (index * step),
                label,
                variant,
                onPress: action
            });

            this.layer.add(button.container);

        });

        //  What is left for another run, and the only thing on this screen that
        //  explains a locked Retry.
        const meter = new EnergyMeter(scene, OVERLAY_ENERGY_Y, energy, this.layer);

        this.tick = scene.time.addEvent({
            delay: OVERLAY_ENERGY_TICK_MS,
            loop: true,
            callback: () => meter.update()
        });
    }

    destroy (): void
    {
        //  The overlay is thrown away on every resume, so the countdown has to go
        //  with it - a surviving timer would tick on a destroyed meter.
        this.tick.remove();

        this.layer.destroy();
    }
}
