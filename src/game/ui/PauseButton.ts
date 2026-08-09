import { Scene } from 'phaser';
import {
    COLOR_BUTTON_SECONDARY,
    COLOR_PAUSE_ICON,
    DEPTH_HUD,
    GAME_WIDTH,
    PAUSE_BAR_GAP,
    PAUSE_BAR_HEIGHT,
    PAUSE_BAR_WIDTH,
    PAUSE_BUTTON_MARGIN,
    PAUSE_BUTTON_SIZE
} from '../config/constants';

/**
 * The pause control, top-right during play.
 *
 * Its hit area is the full touch-sized square, not the two small bars drawn
 * inside it.
 */
export class PauseButton
{
    private readonly container: Phaser.GameObjects.Container;

    constructor (scene: Scene, onPress: () => void)
    {
        const x = GAME_WIDTH - PAUSE_BUTTON_MARGIN - (PAUSE_BUTTON_SIZE / 2);
        const y = PAUSE_BUTTON_MARGIN + (PAUSE_BUTTON_SIZE / 2);

        this.container = scene.add.container(x, y);
        this.container.setDepth(DEPTH_HUD);

        const background = scene.add.rectangle(0, 0, PAUSE_BUTTON_SIZE, PAUSE_BUTTON_SIZE, COLOR_BUTTON_SECONDARY, 0.7);

        background.setInteractive({ useHandCursor: true });
        background.on('pointerdown', onPress);

        this.container.add(background);

        const offset = (PAUSE_BAR_WIDTH + PAUSE_BAR_GAP) / 2;

        for (const barX of [ -offset, offset ])
        {
            const bar = scene.add.rectangle(barX, 0, PAUSE_BAR_WIDTH, PAUSE_BAR_HEIGHT, COLOR_PAUSE_ICON);

            this.container.add(bar);
        }
    }

    setVisible (visible: boolean): void
    {
        this.container.setVisible(visible);
    }
}
