//  Geom is imported rather than reached for through the Phaser global: the
//  types are ambient, so a global reference typechecks and then fails at run
//  time under the ESM build. This game has been bitten by that once already.
import { Geom, Scene } from 'phaser';
import { play, wakeAudio } from '../systems/Audio';
import {
    CHIP_EDGE_ALPHA,
    CHIP_FILL_ALPHA,
    CHIP_GAP,
    CHIP_HEIGHT,
    CHIP_ICON,
    CHIP_LABEL_SIZE,
    CHIP_OFF_ALPHA,
    CHIP_PAD,
    CHIP_WIDTH,
    COLOR_HUD_DIM,
    COLOR_HUD_TEXT,
    HUD_FONT
} from '../config/constants';
import { COLOR_BUTTON_GHOST } from '../config/menuTheme';
import { drawSpeaker, drawShapes } from './chipGlyphs';

/** Which drawing sits on the left of the chip. */
export type ChipIcon = 'sound' | 'shapes';

export interface ChipOptions
{
    x: number;
    y: number;

    /** The word, without its state: 'SOUND'. The chip says on or off itself. */
    label: string;

    icon: ChipIcon;
    on: boolean;
    onChange: (on: boolean) => void;

    /** 1 for a chip hung off the right edge, 0.5 for one in the middle. */
    origin?: number;

    into?: Phaser.GameObjects.Container;
}

/**
 * A switch that looks like something you can press.
 *
 * It used to be two dim words in the corner with an invisible hit area behind
 * them. That reads as a caption rather than a control - and a setting a player
 * cannot find is a setting that is not there, which for the sound switch on a
 * game played in public is worse than most missing features.
 *
 * So: the same pill the menu buttons are, at a size that suits a corner, with
 * the state said twice over. The word changes, and the drawing changes with it
 * - because ON and OFF are four letters apart at thirteen pixels, and a struck
 * -through speaker is legible at a glance from across a table.
 */
export class ToggleChip
{
    readonly container: Phaser.GameObjects.Container;

    private readonly skin: Phaser.GameObjects.Graphics;
    private readonly glyph: Phaser.GameObjects.Graphics;
    private readonly text: Phaser.GameObjects.Text;
    private readonly icon: ChipIcon;
    private readonly label: string;

    private on: boolean;

    constructor (scene: Scene, options: ChipOptions)
    {
        const origin = options.origin ?? 1;

        this.icon = options.icon;
        this.label = options.label;
        this.on = options.on;

        //  Placed by its own edge rather than its centre, so a caller can hang
        //  one off the right margin without doing the arithmetic.
        const left = options.x - (CHIP_WIDTH * origin);

        this.container = scene.add.container(left, options.y);

        this.skin = scene.add.graphics();
        this.glyph = scene.add.graphics();

        this.text = scene.add.text(CHIP_PAD + CHIP_ICON + CHIP_GAP, CHIP_HEIGHT / 2, '', {
            fontFamily: HUD_FONT,
            fontSize: CHIP_LABEL_SIZE,
            color: COLOR_HUD_TEXT
        });

        this.text.setOrigin(0, 0.5);

        this.container.add([ this.skin, this.glyph, this.text ]);

        //  The whole pill answers, not the word: the hit area is the shape the
        //  player can see, which is the only arrangement that never surprises.
        //
        //  From the container's own origin rather than centred on it, because
        //  the pill is drawn from there outwards. A rectangle centred on the
        //  origin covers half the pill and the same width of empty air beside
        //  it, which is a switch that misses when you aim at it and fires when
        //  you do not.
        this.container.setSize(CHIP_WIDTH, CHIP_HEIGHT);
        this.container.setInteractive(
            new Geom.Rectangle(0, 0, CHIP_WIDTH, CHIP_HEIGHT),
            Geom.Rectangle.Contains
        );

        this.container.on('pointerdown', () => {

            //  Woken here as well as in Button: this is a real gesture, and a
            //  player who turns the sound *on* should hear the next thing that
            //  happens rather than having to press something else first.
            wakeAudio();

            this.set(!this.on);

            options.onChange(this.on);

            play('press');

        });

        options.into?.add(this.container);

        this.paint();
    }

    /** Where the switch stands, without telling anybody it moved. */
    set (on: boolean): void
    {
        this.on = on;

        this.paint();
    }

    destroy (): void
    {
        this.container.destroy();
    }

    private paint (): void
    {
        const radius = CHIP_HEIGHT / 2;

        this.skin.clear();
        this.skin.fillStyle(COLOR_BUTTON_GHOST, CHIP_FILL_ALPHA);
        this.skin.fillRoundedRect(0, 0, CHIP_WIDTH, CHIP_HEIGHT, radius);
        this.skin.lineStyle(1, COLOR_BUTTON_GHOST, CHIP_EDGE_ALPHA);
        this.skin.strokeRoundedRect(0.5, 0.5, CHIP_WIDTH - 1, CHIP_HEIGHT - 1, radius);

        this.glyph.clear();

        const tint = this.on ? COLOR_HUD_TEXT : COLOR_HUD_DIM;

        if (this.icon === 'sound')
        {
            drawSpeaker(this.glyph, CHIP_PAD, CHIP_HEIGHT / 2, CHIP_ICON, this.on, tint);
        }
        else
        {
            drawShapes(this.glyph, CHIP_PAD, CHIP_HEIGHT / 2, CHIP_ICON, this.on, tint);
        }

        this.text.setText(`${this.label} ${this.on ? 'ON' : 'OFF'}`);
        this.text.setColor(tint);

        //  Off is drawn back rather than out. A switch that vanishes when it is
        //  off is a switch a player cannot find to turn back on.
        this.container.setAlpha(this.on ? 1 : CHIP_OFF_ALPHA);
    }
}
