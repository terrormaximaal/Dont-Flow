import { Scene } from 'phaser';
import {
    BUTTON_HEIGHT,
    BUTTON_LABEL_SIZE,
    BUTTON_WIDTH,
    COLOR_BUTTON,
    COLOR_BUTTON_LABEL,
    COLOR_BUTTON_LOCKED,
    COLOR_BUTTON_LOCKED_LABEL,
    COLOR_BUTTON_SECONDARY,
    COLOR_BUTTON_SECONDARY_LABEL,
    HUD_FONT
} from '../config/constants';

export type ButtonVariant = 'primary' | 'secondary' | 'locked';

export interface ButtonOptions
{
    x: number;
    y: number;
    label: string;
    onPress: () => void;

    variant?: ButtonVariant;
    width?: number;
    height?: number;
    labelSize?: number;
}

const VARIANTS: Record<ButtonVariant, { fill: number; label: string }> = {
    primary: { fill: COLOR_BUTTON, label: COLOR_BUTTON_LABEL },
    secondary: { fill: COLOR_BUTTON_SECONDARY, label: COLOR_BUTTON_SECONDARY_LABEL },
    locked: { fill: COLOR_BUTTON_LOCKED, label: COLOR_BUTTON_LOCKED_LABEL }
};

/**
 * A tappable label, used by every screen that has one.
 *
 * It owns a container positioned at (x, y) with its parts laid out around the
 * origin, so callers can drop it into an overlay layer without recomputing any
 * coordinates.
 *
 * A 'locked' button is inert: it renders dimmed and is never made interactive,
 * so there is no state in which it can be pressed.
 */
export class Button
{
    readonly container: Phaser.GameObjects.Container;
    readonly background: Phaser.GameObjects.Rectangle;
    readonly labelText: Phaser.GameObjects.Text;

    constructor (scene: Scene, options: ButtonOptions)
    {
        const variant = options.variant ?? 'primary';
        const width = options.width ?? BUTTON_WIDTH;
        const height = options.height ?? BUTTON_HEIGHT;
        const colors = VARIANTS[variant];

        this.container = scene.add.container(options.x, options.y);

        this.background = scene.add.rectangle(0, 0, width, height, colors.fill);

        if (variant !== 'locked')
        {
            this.background.setInteractive({ useHandCursor: true });
            this.background.on('pointerdown', options.onPress);
        }

        this.container.add(this.background);

        this.labelText = scene.add.text(0, 0, options.label, {
            fontFamily: HUD_FONT,
            fontSize: options.labelSize ?? BUTTON_LABEL_SIZE,
            color: colors.label
        });

        this.labelText.setOrigin(0.5);
        this.container.add(this.labelText);
    }
}
