import { Scene } from 'phaser';
import { play, wakeAudio } from '../systems/Audio';
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
    HUD_FONT
} from '../config/constants';
import {
    BUTTON_GHOST_EDGE_ALPHA,
    BUTTON_GHOST_EDGE_WIDTH,
    BUTTON_GHOST_FILL_ALPHA,
    COLOR_BUTTON_GHOST,
    COLOR_BUTTON_GHOST_LABEL,
    MENU_BUTTON_FROM,
    MENU_BUTTON_TO
} from '../config/menuTheme';
import { mixColor } from '../utils/color';

/**
 * How a button is drawn.
 *
 * 'hero' and 'ghost' are the pair the home screen uses, and they exist because
 * two buttons of the same shape in slightly different greys are not a
 * hierarchy - the eye has to be told which one is the way in. A filled pill
 * with a gradient and a halo against an outline with almost nothing in it says
 * that in one glance, without either of them being large or loud.
 */
export type ButtonVariant = 'primary' | 'locked' | 'hero' | 'ghost';

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

    /** Corner radius. Half the height makes a pill, which is the menu's shape. */
    radius?: number;
}

interface VariantStyle
{
    fill: number;
    label: string;
    glow: boolean;

    /** Second colour, for a surface that runs from one hue to another. */
    fillTo?: number;

    /** Drawn as an outline with almost nothing inside it. */
    ghost?: boolean;
}

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
    primary: { fill: COLOR_BUTTON, label: COLOR_BUTTON_LABEL, glow: true },
    locked: { fill: COLOR_BUTTON_LOCKED, label: COLOR_BUTTON_LOCKED_LABEL, glow: false },
    hero: { fill: MENU_BUTTON_FROM, fillTo: MENU_BUTTON_TO, label: COLOR_BUTTON_LABEL, glow: true },
    ghost: { fill: COLOR_BUTTON_GHOST, label: COLOR_BUTTON_GHOST_LABEL, glow: false, ghost: true }
};

/**
 * The sheen down the top half of a button, as a list of alphas.
 *
 * Pure and exported so how finely it steps is something a test can ask about.
 * It is the third place in this game to make the same mistake - stacked
 * opacity in too few steps does not read as a soft ramp, it reads as the
 * steps - and on a pill, where the eye is already following a smooth curve,
 * seven bands are seven visible stripes across the top of the button.
 */
export function sheenBands (): number[]
{
    const bands: number[] = [];

    for (let band = 0; band < BUTTON_SHEEN_BANDS; band++)
    {
        bands.push(BUTTON_SHEEN * (1 - (band / BUTTON_SHEEN_BANDS)));
    }

    return bands;
}

/**
 * How far in from a button's bounding box its own outline sits, `dy` below the
 * top edge.
 *
 * The sheen is laid in bands and a band is a rectangle, which is exactly right
 * across the straight part of a button and quite wrong across a rounded cap: a
 * full-width band over a corner *is* a corner. Stacked up the top half of a
 * pill, that drew a lighter square around every filled button - most obvious on
 * PLAY and RESUME, where the sheen is brightest.
 *
 * Same idea as the world bead's sky bands: follow the shape's own chord rather
 * than reaching for a mask.
 */
export function sheenInset (dy: number, radius: number): number
{
    if (dy >= radius || radius <= 0)
    {
        return 0;
    }

    const reach = radius - dy;

    return radius - Math.sqrt(Math.max(0, (radius * radius) - (reach * reach)));
}

/**
 * Bands a left-to-right gradient is built from. Graphics cannot fill one.
 *
 * Enough that no single step is visible: what gives a banded ramp away is the
 * absolute jump between two neighbours, and across a button this wide
 * twenty-odd bands leaves each one several pixels across and each step legible.
 */
const GRADIENT_BANDS = 56;

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
        const radius = options.radius ?? BUTTON_RADIUS;
        const colors = VARIANTS[variant];

        this.container = scene.add.container(options.x, options.y);

        const surface = scene.add.graphics();

        this.paint(surface, width, height, radius, colors);
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

                //  Every button press is a genuine user gesture, which is the
                //  only thing a browser will let a sound start from. Waking it
                //  here means the audio is alive by the time anything in a run
                //  wants to make a noise.
                wakeAudio();
                play('press');

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
        radius: number,
        style: VariantStyle
    ): void
    {
        const left = -width / 2;
        const top = -height / 2;
        const fill = style.fill;

        if (style.ghost)
        {
            this.paintGhost(gfx, left, top, width, height, radius, fill);

            return;
        }

        if (style.glow)
        {
            //  A halo in the button's own colour, widening outwards.
            for (let layer = BUTTON_GLOW_LAYERS; layer > 0; layer--)
            {
                const spread = BUTTON_GLOW_SPREAD * (layer / BUTTON_GLOW_LAYERS);

                gfx.fillStyle(style.fillTo ?? fill, BUTTON_GLOW_ALPHA);
                gfx.fillRoundedRect(
                    left - spread,
                    top - spread,
                    width + (spread * 2),
                    height + (spread * 2),
                    radius + spread
                );
            }
        }

        gfx.fillStyle(fill, 1);
        gfx.fillRoundedRect(left, top, width, height, radius);

        //  A surface that travels from one hue to the other, banded because
        //  Graphics has no gradient fill.
        //
        //  The two rounded ends are drawn as discs and the straight middle is
        //  banded between them, in that order so the bands overwrite the
        //  inner half of each disc and only the cap itself survives.
        //
        //  The first version capped each end with a rounded rectangle instead.
        //  A rounded rectangle needs to be twice the radius wide before it has
        //  any corner at all, so on a pill that is a flat block a quarter of
        //  the button long at each end - the gradient only ran across the
        //  middle half and both ends were visibly solid.
        if (style.fillTo !== undefined)
        {
            const capped = width - (radius * 2);

            gfx.fillStyle(fill, 1);
            gfx.fillCircle(left + radius, 0, radius);

            gfx.fillStyle(style.fillTo, 1);
            gfx.fillCircle(left + width - radius, 0, radius);

            for (let band = 0; band < GRADIENT_BANDS; band++)
            {
                const t = band / (GRADIENT_BANDS - 1);

                gfx.fillStyle(mixColor(fill, style.fillTo, t), 1);
                gfx.fillRect(
                    left + radius + (capped * (band / GRADIENT_BANDS)),
                    top,
                    (capped / GRADIENT_BANDS) + 1,
                    height
                );
            }
        }

        //  Lighter at the top, falling to the body colour by the middle.
        //  Graphics cannot fill a gradient, and one lighter half over a darker
        //  one puts a hard line across the button - so it is banded, with the
        //  steps small enough to read as a curve.
        sheenBands().forEach((alpha, band) => {

            const t = band / BUTTON_SHEEN_BANDS;
            const bandTop = top + (height * 0.5 * t);
            const bandHeight = (height * 0.5) / BUTTON_SHEEN_BANDS;

            //  White at an alpha, not the fill colour mixed towards white.
            //  Mixing repaints the band in the *start* colour, which wipes out
            //  a gradient underneath it - the top half of the button came out
            //  flat cyan while the bottom half ramped, with a hard line across
            //  the middle where the sheen stopped. Compositing leaves whatever
            //  is beneath it alone, and looks identical on a solid button.
            gfx.fillStyle(0xffffff, alpha);

            //  Pulled in to wherever the button's own edge is at this height, so
            //  the sheen ends where the shape does instead of squaring off its
            //  corners.
            const inset = sheenInset(bandTop - top, radius);

            gfx.fillRect(left + inset, bandTop, width - (inset * 2), bandHeight + 1);

        });

        //  A hairline along the top edge, which is most of what reads as a
        //  raised surface rather than a painted shape.
        gfx.lineStyle(1.5, mixColor(fill, 0xffffff, 0.55), BUTTON_EDGE_ALPHA);
        gfx.lineBetween(left + radius, top + 1, left + width - radius, top + 1);
    }

    /**
     * An outline with almost nothing in it.
     *
     * The whole point is what it does not have: no gradient, no halo, no top
     * hairline. Against a filled button it reads immediately as the second
     * choice, which is what a hierarchy is - and it costs nothing to look at,
     * so the eye goes where it should.
     */
    private paintGhost (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        top: number,
        width: number,
        height: number,
        radius: number,
        fill: number
    ): void
    {
        gfx.fillStyle(fill, BUTTON_GHOST_FILL_ALPHA);
        gfx.fillRoundedRect(left, top, width, height, radius);

        gfx.lineStyle(BUTTON_GHOST_EDGE_WIDTH, fill, BUTTON_GHOST_EDGE_ALPHA);
        gfx.strokeRoundedRect(left, top, width, height, radius);
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
