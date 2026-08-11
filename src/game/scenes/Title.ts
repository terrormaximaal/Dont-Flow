import { Scene } from 'phaser';
import {
    BUTTON_GAP,
    BUTTON_HEIGHT,
    COLOR_DROP_NEUTRAL,
    COLOR_HUD_DIM,
    DEPTH_HUD,
    GAME_WIDTH,
    HUD_FONT,
    RESUME_AT_LAST_LEVEL,
    TITLE_BUTTONS_Y,
    TITLE_ENERGY_Y,
    TITLE_DROP_RADIUS,
    TITLE_LOGO_Y,
    TITLE_TAGLINE_SIZE
} from '../config/constants';
import { LEVELS } from '../config/levels';
import { MENU_SKY_LOW, MENU_SKY_TOP } from '../config/menuTheme';
import { paintPageColors } from '../systems/PageBackdrop';
import { EnergySystem } from '../systems/EnergySystem';
import { MenuSky } from '../systems/MenuSky';
import { SaveSystem } from '../systems/SaveSystem';
import { Button } from '../ui/Button';
import { EnergyMeter } from '../ui/EnergyMeter';
import { TitleMark } from '../ui/TitleMark';
import { waterOutline } from '../entities/drop-surface';
import { drawWaterDrop } from '../ui/shapes';

/**
 * The screen the game opens on. The track scrolls behind it, so the menu and
 * the game read as the same place.
 */
export class Title extends Scene
{
    private sky: MenuSky;
    private meter: EnergyMeter;
    private logo: Phaser.GameObjects.Graphics;
    /** Seconds on screen, so the logo ripples on its own clock. */
    private elapsed = 0;

    constructor ()
    {
        super('Title');
    }

    create ()
    {
        //  Somewhere else entirely, not the road with buttons over it. Looking
        //  down the track made the first screen say "here is the game already"
        //  rather than "here is what this game is".
        paintPageColors(MENU_SKY_TOP, MENU_SKY_LOW);

        this.sky = new MenuSky(this);

        const save = new SaveSystem();
        const energy = new EnergySystem(save);
        const resumeLevel = save.getResumeLevel();

        //  "Continue" only means something if there is somewhere to continue to.
        const canContinue = RESUME_AT_LAST_LEVEL && resumeLevel > 0;
        const canPlay = energy.mayStart();

        this.elapsed = 0;

        //  The same drop the player steers, rippling on the spot - a still one
        //  next to a living one would look like a different drop.
        this.logo = this.add.graphics();

        this.logo.setPosition(GAME_WIDTH / 2, TITLE_LOGO_Y);
        this.logo.setDepth(DEPTH_HUD);

        new TitleMark(this, TITLE_LOGO_Y + 78);

        const tagline = this.add.text(GAME_WIDTH / 2, TITLE_LOGO_Y + 116, 'MATCH THE COLOUR. KEEP THE COMBO.', {
            fontFamily: HUD_FONT,
            fontSize: TITLE_TAGLINE_SIZE,
            color: COLOR_HUD_DIM
        });

        tagline.setOrigin(0.5);
        tagline.setDepth(DEPTH_HUD);

        const playLabel = canContinue ? `CONTINUE ${LEVELS[resumeLevel].name}` : 'PLAY';

        //  Out of energy, the button is built inert rather than live and
        //  refusing - the meter below it explains the wait.
        const play = new Button(this, {
            x: GAME_WIDTH / 2,
            y: TITLE_BUTTONS_Y,
            label: canPlay ? playLabel : 'NO ENERGY',
            variant: canPlay ? 'primary' : 'locked',
            onPress: () => this.startLevel(canContinue ? resumeLevel : 0)
        });

        play.container.setDepth(DEPTH_HUD);

        const levels = new Button(this, {
            x: GAME_WIDTH / 2,
            y: TITLE_BUTTONS_Y + BUTTON_HEIGHT + BUTTON_GAP,
            label: 'LEVELS',
            variant: 'secondary',
            onPress: () => this.scene.start('LevelSelect')
        });

        levels.container.setDepth(DEPTH_HUD);

        this.meter = new EnergyMeter(this, TITLE_ENERGY_Y, energy);

        if (canPlay)
        {
            const start = () => this.startLevel(canContinue ? resumeLevel : 0);

            this.input.keyboard?.once('keydown-SPACE', start);
            this.input.keyboard?.once('keydown-ENTER', start);
        }
    }

    private startLevel (levelIndex: number): void
    {
        this.scene.start('Play', { levelIndex });
    }

    update (_time: number, delta: number)
    {
        this.elapsed += delta / 1000;

        drawWaterDrop(this.logo, {
            outline: waterOutline(TITLE_DROP_RADIUS, this.elapsed, 0, 0),
            radius: TITLE_DROP_RADIUS,
            color: COLOR_DROP_NEUTRAL
        });

        this.sky.update(delta);
        this.meter.update();
    }
}
