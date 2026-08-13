import { Scene } from 'phaser';
import {
    BUTTON_HEIGHT,
    COLOR_HUD_DIM,
    COLOR_HUD_TEXT,
    COLOR_VALUES,
    DEPTH_HUD,
    GAME_WIDTH,
    HUD_FONT,
    MENU_ENERGY_Y,
    MENU_HEADING_SIZE,
    MENU_HEADING_Y,
    ROUTE_DETAIL_OFFSET,
    ROUTE_DETAIL_SIZE,
    ROUTE_DONE_ALPHA,
    ROUTE_LAST_Y,
    ROUTE_LINE_GLOW,
    ROUTE_LINE_STEPS,
    ROUTE_LINE_WIDTH,
    ROUTE_LOCKED_ALPHA,
    ROUTE_NEXT_PULSE,
    ROUTE_NEXT_PULSE_MS,
    ROUTE_NODE_RADIUS,
    ROUTE_NODE_RING,
    ROUTE_NUMBER_SIZE
} from '../config/constants';
import { LEVELS } from '../config/levels';
import { MENU_SKY_LOW, MENU_SKY_TOP } from '../config/menuTheme';
import { WORLDS } from '../config/worldData';
import { EnergySystem } from '../systems/EnergySystem';
import { MenuSky } from '../systems/MenuSky';
import { paintPageColors } from '../systems/PageBackdrop';
import { SaveSystem } from '../systems/SaveSystem';
import { mixColor } from '../utils/color';
import { Button } from '../ui/Button';
import { arrive, leaveTo } from '../ui/transition';
import { EnergyMeter } from '../ui/EnergyMeter';
import { routePoint, stopAt, Stop } from '../ui/route';

/**
 * The levels, laid out as a route rather than a grid.
 *
 * A grid says "here is a list of ten things". A route says "here is a journey,
 * and you have come this far along it", which is what this screen is actually
 * for - and it costs nothing extra to say the better one.
 *
 * Each stop carries its own level's colour, so the list doubles as a preview of
 * where the game goes: the eye reads the palette changing from the first stop to
 * the last before it reads a single number.
 *
 * A locked stop is built inert rather than live and refusing, so there is no
 * state in which it can start a level.
 */
export class LevelSelect extends Scene
{
    private sky: MenuSky;
    private meter: EnergyMeter;

    constructor ()
    {
        super('LevelSelect');
    }

    create ()
    {
        //  The same place the title screen is, so moving between them reads as
        //  turning around rather than as travelling.
        paintPageColors(MENU_SKY_TOP, MENU_SKY_LOW);

        this.sky = new MenuSky(this);

        const save = new SaveSystem();
        const energy = new EnergySystem(save);
        const furthest = save.getFurthestLevel();
        const canPlay = energy.mayStart();

        const heading = this.add.text(GAME_WIDTH / 2, MENU_HEADING_Y, 'SELECT LEVEL', {
            fontFamily: HUD_FONT,
            fontSize: MENU_HEADING_SIZE,
            color: COLOR_HUD_TEXT
        });

        heading.setOrigin(0.5);
        heading.setDepth(DEPTH_HUD);
        heading.setLetterSpacing(5);

        this.meter = new EnergyMeter(this, MENU_ENERGY_Y, energy);

        const stops = LEVELS.map((_, index) => stopAt(index, LEVELS.length));

        this.drawRoute(stops, furthest);

        LEVELS.forEach((level, index) => {

            this.buildStop(stops[index], index, level.world, save, furthest, canPlay);

        });

        //  The same ghost pill the home screen uses. This screen shares the
        //  menu's sky and is one tap from it, so a grey slab here against a
        //  pill there reads as two different games rather than two screens.
        const back = new Button(this, {
            x: GAME_WIDTH / 2,
            y: ROUTE_LAST_Y + BUTTON_HEIGHT + 24,
            label: 'BACK',
            variant: 'ghost',
            radius: BUTTON_HEIGHT / 2,
            onPress: () => leaveTo(this, () => this.scene.start('Title'))
        });

        back.container.setDepth(DEPTH_HUD);

        this.input.keyboard?.once('keydown-ESC', () => leaveTo(this, () => this.scene.start('Title')));

        arrive(this);
    }

    /**
     * The line joining the stops.
     *
     * Drawn in short steps rather than as one path, because each step carries
     * its own colour and alpha: the route is lit in the colours of the levels
     * it runs between, and goes dark past the furthest one reached.
     */
    private drawRoute (stops: Stop[], furthest: number): void
    {
        const gfx = this.add.graphics();

        gfx.setDepth(DEPTH_HUD - 2);

        const span = stops.length - 1;

        for (let i = 0; i < span; i++)
        {
            //  A segment is walked if its far end is unlocked.
            const walked = i + 1 <= furthest;

            const from = tint(i);
            const to = tint(i + 1);

            for (let step = 0; step < ROUTE_LINE_STEPS; step++)
            {
                //  Sampled from the same curve the stops are placed on, so the
                //  line passes exactly through each one rather than near it.
                const a = routePoint((i + (step / ROUTE_LINE_STEPS)) / span);
                const b = routePoint((i + ((step + 1) / ROUTE_LINE_STEPS)) / span);

                const color = mixColor(from, to, step / ROUTE_LINE_STEPS);
                const alpha = walked ? ROUTE_DONE_ALPHA : ROUTE_LOCKED_ALPHA;

                //  A wide, faint pass under a narrow bright one, which is what
                //  makes a line read as lit rather than as drawn.
                gfx.lineStyle(ROUTE_LINE_WIDTH + (ROUTE_LINE_GLOW * 2), color, alpha * 0.18);
                gfx.lineBetween(a.x, a.y, b.x, b.y);

                gfx.lineStyle(ROUTE_LINE_WIDTH, color, alpha);
                gfx.lineBetween(a.x, a.y, b.x, b.y);
            }
        }
    }

    /** One stop: its disc, its number, and what it says underneath. */
    private buildStop (
        stop: Stop,
        index: number,
        world: keyof typeof WORLDS,
        save: SaveSystem,
        furthest: number,
        canPlay: boolean
    ): void
    {
        const unlocked = index <= furthest;
        const startable = unlocked && canPlay;
        const color = tint(index);

        const gfx = this.add.graphics();

        gfx.setDepth(DEPTH_HUD - 1);

        //  Locked stops keep their level's colour but lose almost all of it, so
        //  the route still previews the journey without offering to start it.
        const body = unlocked ? color : mixColor(color, MENU_SKY_TOP, 0.82);

        if (unlocked)
        {
            //  A halo, which is most of what separates a reached stop from a
            //  locked one at a glance.
            for (let layer = 4; layer > 0; layer--)
            {
                gfx.fillStyle(color, 0.07);
                gfx.fillCircle(stop.x, stop.y, ROUTE_NODE_RADIUS + (layer * 3.5));
            }
        }

        gfx.fillStyle(body, 1);
        gfx.fillCircle(stop.x, stop.y, ROUTE_NODE_RADIUS);

        //  A lighter cap on top of the disc: the same one light the rest of the
        //  game is lit by, so a stop reads as a bead rather than a sticker.
        gfx.fillStyle(mixColor(body, 0xffffff, 0.3), unlocked ? 0.55 : 0.25);
        gfx.fillEllipse(stop.x, stop.y - (ROUTE_NODE_RADIUS * 0.36), ROUTE_NODE_RADIUS * 1.1, ROUTE_NODE_RADIUS * 0.62);

        gfx.lineStyle(ROUTE_NODE_RING * 0.5, mixColor(body, 0xffffff, 0.45), unlocked ? 0.8 : 0.25);
        gfx.strokeCircle(stop.x, stop.y, ROUTE_NODE_RADIUS);

        const number = this.add.text(stop.x, stop.y, LEVELS[index].name, {
            fontFamily: HUD_FONT,
            fontSize: ROUTE_NUMBER_SIZE,
            color: unlocked ? '#ffffff' : COLOR_HUD_DIM
        });

        number.setOrigin(0.5);
        number.setDepth(DEPTH_HUD);

        //  The detail sits out to the stop's own side, away from the route, so
        //  the line never has to run through a word.
        const best = save.getBestScore(index);
        const detail = unlocked ? (best === null ? 'NOT PLAYED' : `BEST ${best}`) : 'LOCKED';

        const label = this.add.text(
            stop.x + (stop.side * ROUTE_DETAIL_OFFSET),
            stop.y,
            detail,
            {
                fontFamily: HUD_FONT,
                fontSize: ROUTE_DETAIL_SIZE,
                color: unlocked ? COLOR_HUD_TEXT : COLOR_HUD_DIM
            }
        );

        //  Anchored on the edge nearest its stop, so the text grows outwards
        //  and can never reach across the route.
        label.setOrigin(stop.side < 0 ? 1 : 0, 0.5);
        label.setDepth(DEPTH_HUD);
        label.setAlpha(unlocked ? 0.9 : 0.5);

        void world;

        if (!startable)
        {
            return;
        }

        //  The next one to play breathes, so the screen answers "where was I"
        //  before it is read.
        if (index === furthest)
        {
            const ring = this.add.graphics();

            ring.setDepth(DEPTH_HUD - 1);
            ring.lineStyle(2, 0xffffff, 0.75);
            ring.strokeCircle(0, 0, ROUTE_NODE_RADIUS + ROUTE_NEXT_PULSE);
            ring.setPosition(stop.x, stop.y);

            this.tweens.add({
                targets: ring,
                scale: 1.14,
                alpha: 0.15,
                duration: ROUTE_NEXT_PULSE_MS,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        }

        //  A circle carries the press, sized past the disc so a thumb does not
        //  have to be accurate.
        const hit = this.add.circle(stop.x, stop.y, ROUTE_NODE_RADIUS + 12, 0x000000, 0);

        hit.setDepth(DEPTH_HUD);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => leaveTo(this, () => this.scene.start('Play', { levelIndex: index })));
    }

    update (_time: number, delta: number)
    {
        this.sky.update(delta);
        this.meter.update();
    }
}

/** A level's own colour, taken from the first entry in its world's palette. */
function tint (index: number): number
{
    const level = LEVELS[index];

    return COLOR_VALUES[WORLDS[level.world].palette[0]];
}
