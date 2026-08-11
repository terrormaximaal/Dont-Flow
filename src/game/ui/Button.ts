import { Scene } from 'phaser';
import {
    BUTTON_EDGE_ALPHA,
    BUTTON_GLOW_ALPHA,
    BUTTON_GLOW_LAYERS,
    BUTTON_GLOW_SPREAD,
    BUTTON_HEIGHT,
    BUTTON_LABEL_SIZE,
    BUTTON_PRESS_MS,
    BUTTON_PRESS_SCALE,
    BUTTON_RADIUS,
    BUTTON_RELEASE_MS,
    BUTTON_SHEEN,
    BUTTON_SHEEN_BANDS,
    BUTTON_TRACKING,
    BUTTON_WIDTH,
    COLOR_BUTTON,
    COLOR_BUTTON_LABEL,
    COLOR_BUTTON_LOCKED,
    COLOR_BUTTON_LOCKED_LABEL,
    COLOR_BUTTON_SECONDARY,
    COLOR_BUTTON_SECONDARY_LABEL,
    HUD_FONT
} from '../config/constants';
import { mixColor } from '../utils/color';

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

const VARIANTS: Record<ButtonVariant, { fill: number; label: string; glow: boolean }> = {
    primary: { fill: COLOR_BUTTON, label: COLOR_BUTTON_LABEL, glow: true },
    secondary: { fill: COLOR_BUTTON_SECONDARY, label: COLOR_BUTTON_SECONDARY_LABEL, glow: false },
    locked: { fill: COLOR_BUTTON_LOCKED, label: COLOR_BUTTON_LOCKED_LABEL, glow: false }
};

/**
 * A tappable label, used by every screen that has one.
 *
 * Drawn rather than filled as a flat rectangle. Three things do almost all the
 * work of making a button look like a made object instead of a placeholder: a
 * rounded corner, a surface that is lighter at the top than at the foot, and a
 * hairline along its top edge. The primary one also carries a soft halo in its
 * own colour, which is what picks it out as the thing to press without needing
 * to be the only thing on screen.
 *
 * It owns a container positioned at (x, y) with its parts laid out around the
 * origin, so callers can drop it into an overlay layer without recomputing any
 * coordinates.
 *
 * A 'locked' button is inert: it renders dimmed, takes no input, and does not
 * animate, so there is no state in which it can be pressed or look like it can.
 */
export class Button
{
    readonly container: Phaser.GameObjects.Container;

    /** The hit area. Invisible - the surface below is what is seen. */
    readonly background: Phaser.GameObjects.Rectangle;

    readonly labelText: Phaser.GameObjects.Text;

    private readonly scene: Scene;

    constructor (scene: Scene, options: ButtonOptions)
    {
        this.scene = scene;

        const variant = options.variant ?? 'primary';
        const width = options.width ?? BUTTON_WIDTH;
        const height = options.height ?? BUTTON_HEIGHT;
        const colors = VARIANTS[variant];

        this.container = scene.add.container(options.x, options.y);

        const surface = scene.add.graphics();

        this.paint(surface, width, height, colors.fill, colors.glow);
        this.container.add(surface);

        //  A separate transparent rectangle carries the input, because a
        //  Graphics has no bounds of its own to hit-test against.
        this.background = scene.add.rectangle(0, 0, width, height, 0x000000, 0);

        if (variant !== 'locked')
        {
            this.background.setInteractive({ useHandCursor: true });

            //  Fires on press rather than release, which is what a game button
            //  should do - waiting for the lift reads as lag.
            this.background.on('pointerdown', () => {

                this.sink();
                options.onPress();

            });

            this.background.on('pointerup', () => this.rise());
            this.background.on('pointerout', () => this.rise());
        }

        this.container.add(this.background);

        this.labelText = scene.add.text(0, 0, options.label, {
            fontFamily: HUD_FONT,
            fontSize: options.labelSize ?? BUTTON_LABEL_SIZE,
            color: colors.label
        });

        this.labelText.setOrigin(0.5);
        this.labelText.setLetterSpacing(BUTTON_TRACKING);
        this.container.add(this.labelText);
    }

    private paint (
        gfx: Phaser.GameObjects.Graphics,
        width: number,
        height: number,
        fill: number,
        glow: boolean
    ): void
    {
        const left = -width / 2;
        const top = -height / 2;

        if (glow)
        {
            //  A halo in the button's own colour, widening outwards.
            for (let layer = BUTTON_GLOW_LAYERS; layer > 0; layer--)
            {
                const spread = BUTTON_GLOW_SPREAD * (layer / BUTTON_GLOW_LAYERS);

                gfx.fillStyle(fill, BUTTON_GLOW_ALPHA);
                gfx.fillRoundedRect(
                    left - spread,
                    top - spread,
                    width + (spread * 2),
                    height + (spread * 2),
                    BUTTON_RADIUS + spread
                );
            }
        }

        gfx.fillStyle(fill, 1);
        gfx.fillRoundedRect(left, top, width, height, BUTTON_RADIUS);

        //  Lighter at the top, falling to the body colour by the middle.
        //  Graphics cannot fill a gradient, and one lighter half over a darker
        //  one puts a hard line across the button - so it is banded, with the
        //  steps small enough to read as a curve.
        for (let band = 0; band < BUTTON_SHEEN_BANDS; band++)
        {
            const t = band / BUTTON_SHEEN_BANDS;
            const bandTop = top + (height * 0.5 * t);
            const bandHeight = (height * 0.5) / BUTTON_SHEEN_BANDS;

            gfx.fillStyle(mixColor(fill, 0xffffff, BUTTON_SHEEN * (1 - t)), 1);

            //  Only the first band rounds its top corners; the rest are inside
            //  the shape already.
            gfx.fillRoundedRect(left, bandTop, width, bandHeight + 1, band === 0
                ? { tl: BUTTON_RADIUS, tr: BUTTON_RADIUS, bl: 0, br: 0 }
                : 0);
        }

        //  A hairline along the top edge, which is most of what reads as a
        //  raised surface rather than a painted shape.
        gfx.lineStyle(1.5, mixColor(fill, 0xffffff, 0.55), BUTTON_EDGE_ALPHA);
        gfx.lineBetween(left + BUTTON_RADIUS, top + 1, left + width - BUTTON_RADIUS, top + 1);
    }

    private sink (): void
    {
        this.scene.tweens.killTweensOf(this.container);

        this.scene.tweens.add({
            targets: this.container,
            scale: BUTTON_PRESS_SCALE,
            duration: BUTTON_PRESS_MS,
            ease: 'Quad.Out'
        });
    }

    private rise (): void
    {
        this.scene.tweens.killTweensOf(this.container);

        this.scene.tweens.add({
            targets: this.container,
            scale: 1,
            duration: BUTTON_RELEASE_MS,
            ease: 'Back.Out'
        });
    }
}
