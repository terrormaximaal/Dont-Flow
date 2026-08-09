import { Scene } from 'phaser';
import {
    BUTTON_HEIGHT,
    COLOR_HUD_DIM,
    COLOR_HUD_TEXT,
    DEPTH_HUD,
    GAME_WIDTH,
    HUD_FONT,
    LEVEL_ROW_DETAIL_SIZE,
    LEVEL_ROW_FIRST_Y,
    LEVEL_ROW_GAP,
    LEVEL_ROW_HEIGHT,
    LEVEL_ROW_NAME_SIZE,
    LEVEL_ROW_TEXT_INSET,
    LEVEL_ROW_WIDTH,
    MENU_ENERGY_Y,
    MENU_HEADING_SIZE,
    MENU_HEADING_Y,
    MENU_SCROLL_SPEED
} from '../config/constants';
import { LEVELS } from '../config/levels';
import { EnergySystem } from '../systems/EnergySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { TrackScroller } from '../systems/TrackScroller';
import { Button } from '../ui/Button';
import { EnergyMeter } from '../ui/EnergyMeter';

/**
 * One row per level, unlocked up to the furthest the player has reached.
 *
 * A locked row is built as an inert button rather than a live one that refuses
 * the press, so there is no state in which it can start a level.
 */
export class LevelSelect extends Scene
{
    private track: TrackScroller;
    private meter: EnergyMeter;
    private distance = 0;

    constructor ()
    {
        super('LevelSelect');
    }

    create ()
    {
        this.distance = 0;

        this.track = new TrackScroller(this);

        const save = new SaveSystem();
        const energy = new EnergySystem(save);
        const furthest = save.getFurthestLevel();
        const canPlay = energy.canPlay();

        const heading = this.add.text(GAME_WIDTH / 2, MENU_HEADING_Y, 'SELECT LEVEL', {
            fontFamily: HUD_FONT,
            fontSize: MENU_HEADING_SIZE,
            color: COLOR_HUD_TEXT
        });

        heading.setOrigin(0.5);
        heading.setDepth(DEPTH_HUD);

        this.meter = new EnergyMeter(this, MENU_ENERGY_Y, energy);

        LEVELS.forEach((level, index) => {

            const unlocked = index <= furthest;

            //  Two separate reasons a row cannot be started: not reached yet, or
            //  nothing left to spend. Both render inert; only the wording differs.
            const startable = unlocked && canPlay;
            const y = LEVEL_ROW_FIRST_Y + (index * (LEVEL_ROW_HEIGHT + LEVEL_ROW_GAP));

            //  The row's own label is empty: the name and the score are laid out
            //  left and right inside it rather than centred as one string.
            const row = new Button(this, {
                x: GAME_WIDTH / 2,
                y,
                width: LEVEL_ROW_WIDTH,
                height: LEVEL_ROW_HEIGHT,
                label: '',
                variant: startable ? 'secondary' : 'locked',
                onPress: () => this.scene.start('Play', { levelIndex: index })
            });

            row.container.setDepth(DEPTH_HUD);

            const name = this.add.text(-(LEVEL_ROW_WIDTH / 2) + LEVEL_ROW_TEXT_INSET, 0, `LEVEL ${level.name}`, {
                fontFamily: HUD_FONT,
                fontSize: LEVEL_ROW_NAME_SIZE,
                color: startable ? COLOR_HUD_TEXT : COLOR_HUD_DIM
            });

            name.setOrigin(0, 0.5);
            row.container.add(name);

            const best = save.getBestScore(index);
            const detail = unlocked ? (best > 0 ? `BEST ${best}` : 'NOT PLAYED') : 'LOCKED';

            const detailText = this.add.text((LEVEL_ROW_WIDTH / 2) - LEVEL_ROW_TEXT_INSET, 0, detail, {
                fontFamily: HUD_FONT,
                fontSize: LEVEL_ROW_DETAIL_SIZE,
                color: COLOR_HUD_DIM
            });

            detailText.setOrigin(1, 0.5);
            row.container.add(detailText);

        });

        const backY = LEVEL_ROW_FIRST_Y + (LEVELS.length * (LEVEL_ROW_HEIGHT + LEVEL_ROW_GAP)) + BUTTON_HEIGHT;

        const back = new Button(this, {
            x: GAME_WIDTH / 2,
            y: backY,
            label: 'BACK',
            variant: 'secondary',
            onPress: () => this.scene.start('Title')
        });

        back.container.setDepth(DEPTH_HUD);

        this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Title'));
    }

    update (_time: number, delta: number)
    {
        this.distance += MENU_SCROLL_SPEED * (delta / 1000);

        this.track.update(this.distance);
        this.meter.update();
    }
}
