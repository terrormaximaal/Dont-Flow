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
    LEVEL_COLUMNS,
    LEVEL_ROW_DETAIL_OFFSET,
    LEVEL_ROW_NAME_OFFSET,
    LEVEL_ROW_WIDTH,
    MENU_ENERGY_Y,
    MENU_HEADING_SIZE,
    MENU_HEADING_Y,
    MENU_SCROLL_SPEED
} from '../config/constants';
import { LEVELS } from '../config/levels';
import { WORLDS } from '../config/worldData';
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

        //  The menus look down the same road the game is played on.
        this.track = new TrackScroller(this, WORLDS.space);

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

            const column = index % LEVEL_COLUMNS;
            const row = Math.floor(index / LEVEL_COLUMNS);

            const x = (GAME_WIDTH / 2)
                + ((column - ((LEVEL_COLUMNS - 1) / 2)) * (LEVEL_ROW_WIDTH + LEVEL_ROW_GAP));

            const y = LEVEL_ROW_FIRST_Y + (row * (LEVEL_ROW_HEIGHT + LEVEL_ROW_GAP));

            //  The row's own label is empty: the name and the score are laid out
            //  left and right inside it rather than centred as one string.
            const tile = new Button(this, {
                x,
                y,
                width: LEVEL_ROW_WIDTH,
                height: LEVEL_ROW_HEIGHT,
                label: '',
                variant: startable ? 'secondary' : 'locked',
                onPress: () => this.scene.start('Play', { levelIndex: index })
            });

            tile.container.setDepth(DEPTH_HUD);

            //  Stacked rather than side by side: a half-width tile has no room
            //  for a name and a score on one line.
            const name = this.add.text(0, LEVEL_ROW_NAME_OFFSET, level.name, {
                fontFamily: HUD_FONT,
                fontSize: LEVEL_ROW_NAME_SIZE,
                color: startable ? COLOR_HUD_TEXT : COLOR_HUD_DIM
            });

            name.setOrigin(0.5);
            tile.container.add(name);

            const best = save.getBestScore(index);
            const detail = unlocked ? (best > 0 ? `BEST ${best}` : 'NOT PLAYED') : 'LOCKED';

            const detailText = this.add.text(0, LEVEL_ROW_DETAIL_OFFSET, detail, {
                fontFamily: HUD_FONT,
                fontSize: LEVEL_ROW_DETAIL_SIZE,
                color: COLOR_HUD_DIM
            });

            detailText.setOrigin(0.5);
            tile.container.add(detailText);

        });

        const rows = Math.ceil(LEVELS.length / LEVEL_COLUMNS);
        const backY = LEVEL_ROW_FIRST_Y + (rows * (LEVEL_ROW_HEIGHT + LEVEL_ROW_GAP)) + BUTTON_HEIGHT;

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
