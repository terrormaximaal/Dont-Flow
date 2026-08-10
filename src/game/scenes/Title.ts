import { Scene } from 'phaser';
import {
    BUTTON_GAP,
    BUTTON_HEIGHT,
    COLOR_DROP_NEUTRAL,
    COLOR_HUD_DIM,
    COLOR_HUD_TEXT,
    DEPTH_HUD,
    GAME_WIDTH,
    HUD_FONT,
    MENU_SCROLL_SPEED,
    RESUME_AT_LAST_LEVEL,
    TITLE_BUTTONS_Y,
    TITLE_ENERGY_Y,
    TITLE_DROP_RADIUS,
    TITLE_LOGO_Y,
    TITLE_SIZE,
    TITLE_TAGLINE_SIZE
} from '../config/constants';
import { LEVELS } from '../config/levels';
import { WORLDS } from '../config/worldData';
import { EnergySystem } from '../systems/EnergySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { TrackScroller } from '../systems/TrackScroller';
import { Button } from '../ui/Button';
import { EnergyMeter } from '../ui/EnergyMeter';
import { drawTeardrop } from '../ui/shapes';

/**
 * The screen the game opens on. The track scrolls behind it, so the menu and
 * the game read as the same place.
 */
export class Title extends Scene
{
    private track: TrackScroller;
    private meter: EnergyMeter;
    private distance = 0;

    constructor ()
    {
        super('Title');
    }

    create ()
    {
        this.distance = 0;

        //  The menus look down the same road the game is played on.
        this.track = new TrackScroller(this, WORLDS.space);

        const save = new SaveSystem();
        const energy = new EnergySystem(save);
        const resumeLevel = save.getResumeLevel();

        //  "Continue" only means something if there is somewhere to continue to.
        const canContinue = RESUME_AT_LAST_LEVEL && resumeLevel > 0;
        const canPlay = energy.canPlay();

        const logo = this.add.graphics();

        logo.setPosition(GAME_WIDTH / 2, TITLE_LOGO_Y);
        logo.setDepth(DEPTH_HUD);

        drawTeardrop(logo, TITLE_DROP_RADIUS, COLOR_DROP_NEUTRAL);

        const title = this.add.text(GAME_WIDTH / 2, TITLE_LOGO_Y + 78, "DON'T FLOW", {
            fontFamily: HUD_FONT,
            fontSize: TITLE_SIZE,
            color: COLOR_HUD_TEXT
        });

        title.setOrigin(0.5);
        title.setDepth(DEPTH_HUD);

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
        this.distance += MENU_SCROLL_SPEED * (delta / 1000);

        this.track.update(this.distance);
        this.meter.update();
    }
}
