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
    OVERLAY_TITLE_SIZE
} from '../config/constants';
import { Button } from './Button';

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

    constructor (scene: Scene, actions: PauseActions)
    {
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

        const buttons: Array<[ string, 'primary' | 'secondary', () => void ]> = [
            [ 'RESUME', 'primary', actions.onResume ],
            [ 'RETRY', 'secondary', actions.onRetry ],
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
    }

    destroy (): void
    {
        this.layer.destroy();
    }
}
