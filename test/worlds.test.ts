import { describe, expect, it } from 'vitest';
import {
    BUTTON_HEIGHT,
    COLOR_VALUES,
    GAME_HEIGHT,
    GAME_WIDTH,
    ROUTE_DETAIL_OFFSET,
    ROUTE_LAST_Y,
    ROUTE_NODE_RADIUS
} from '../src/game/config/constants';
import { LEVELS } from '../src/game/config/levels';
import { WORLDS } from '../src/game/config/worldData';
import { WorldId } from '../src/game/config/worlds';
import { stopAt } from '../src/game/ui/route';

/** Roughly how wide 'NOT PLAYED' sets, which is the longest label here. */
const LABEL_REACH = 66;

const IDS: WorldId[] = [
    'sky', 'mountains', 'canyon', 'forest', 'ice', 'desert', 'storm', 'city', 'space', 'void'
];

/** Perceived brightness, 0 to 1. */
function luminance (color: number): number
{
    const r = ((color >> 16) & 0xff) / 255;
    const g = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;

    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function luminanceOfCss (css: string): number
{
    return luminance(parseInt(css.replace('#', ''), 16));
}

describe('the ten worlds', () => {

    it('are all defined', () => {

        for (const id of IDS)
        {
            expect(WORLDS[id], id).toBeDefined();
        }

        expect(Object.keys(WORLDS)).toHaveLength(10);

    });

    it('each layer their scenery from far to near', () => {

        //  A nearer layer must scroll faster, or the depth reads backwards.
        for (const id of IDS)
        {
            const world = WORLDS[id];

            expect(world.layers.length, id).toBeGreaterThan(0);

            for (const layer of world.layers)
            {
                expect(layer.parallax, id).toBeGreaterThan(0);

                //  Well under the track's own speed: scenery that kept up with
                //  the corridor would read as part of it.
                expect(layer.parallax, id).toBeLessThan(0.5);
                //  A tile narrower than the screen would show its own seam.
                expect(layer.wrap, id).toBeGreaterThanOrEqual(GAME_WIDTH);
            }
        }

    });

    //  The whole reason worlds carry their own HUD colours: one fixed colour
    //  would be unreadable on half of them.
    it('carry HUD text that contrasts with their own sky', () => {

        for (const id of IDS)
        {
            const world = WORLDS[id];
            //  The HUD sits at the top of the screen, so it is the top of the
            //  gradient it has to be readable against.
            const sky = luminance(world.skyTop);
            const text = luminanceOfCss(world.hudText);

            expect(Math.abs(sky - text), `${id} hud on sky`).toBeGreaterThan(0.35);
        }

    });

    it('carry a HUD outline that contrasts with its own text', () => {

        for (const id of IDS)
        {
            const world = WORLDS[id];

            const text = luminanceOfCss(world.hudText);
            const stroke = luminanceOfCss(world.hudStroke);

            expect(Math.abs(text - stroke), `${id} hud outline`).toBeGreaterThan(0.35);
        }

    });

    //  The corridor has to separate from its environment, or the lanes vanish.
    it('keep the corridor distinct from the sky behind it', () => {

        for (const id of IDS)
        {
            const world = WORLDS[id];

            expect(Math.abs(luminance(world.skyBottom) - luminance(world.track)), `${id} track on sky`)
                .toBeGreaterThan(0.1);
        }

    });

    //  Falling back to the road's own colour makes the whole lower half of the
    //  screen one flat shape, and the road stops reading as a surface running
    //  through somewhere: it reads as a hole cut in the sky.
    it('give the road a floor to run over', () => {

        for (const id of IDS)
        {
            const world = WORLDS[id];

            expect(world.groundColor, `${id} ground`).toBeDefined();

            expect(Math.abs(luminance(world.groundColor!) - luminance(world.track)), `${id} road on ground`)
                .toBeGreaterThan(0.04);
        }

    });

    //  The roadside props were coloured to stand out against the road itself,
    //  back when the ground fell back to the road's colour. Giving each world a
    //  floor of its own quietly buried five of them in it.
    it('stand their roadside scenery out from the floor it stands on', () => {

        for (const id of IDS)
        {
            const world = WORLDS[id];

            if (!world.roadside)
            {
                continue;
            }

            const ground = luminance(world.groundColor ?? world.track);

            //  Props are drawn semi-transparent, so what the eye actually gets
            //  is the difference scaled by the alpha they are painted at.
            const seen = world.roadside.alpha * Math.abs(luminance(world.roadside.color) - ground);

            expect(seen, `${id} roadside on ground`).toBeGreaterThan(0.06);
        }

    });

    it('keep their haze subtle enough to see through', () => {

        for (const id of IDS)
        {
            expect(WORLDS[id].hazeAlpha, id).toBeLessThanOrEqual(0.45);
        }

    });

});

describe('level palettes', () => {

    it('use each colour only once', () => {

        for (const level of LEVELS)
        {
            expect(new Set(level.palette).size, `level ${level.name}`).toBe(level.palette.length);
        }

    });

    it('match the palette their world declares', () => {

        for (const level of LEVELS)
        {
            expect(level.palette, `level ${level.name}`).toEqual(WORLDS[level.world].palette);
        }

    });

    //  Two colours a player cannot tell apart at a glance would make a level
    //  unfair however well it is designed.
    it('never put two similar colours in the same level', () => {

        for (const level of LEVELS)
        {
            const values = level.palette.map((id) => COLOR_VALUES[id]);

            for (let a = 0; a < values.length; a++)
            {
                for (let b = a + 1; b < values.length; b++)
                {
                    //  Two colours are told apart by hue or by brightness;
                    //  requiring both would reject pairs that are obvious.
                    const byChannel = channelDistance(values[a], values[b]);
                    const byBrightness = Math.abs(luminance(values[a]) - luminance(values[b]));

                    expect(
                        byChannel > 100 || byBrightness > 0.22,
                        `level ${level.name}: ${level.palette[a]} vs ${level.palette[b]} `
                        + `(channel ${byChannel}, brightness ${byBrightness.toFixed(2)})`
                    ).toBe(true);
                }
            }
        }

    });

});

/** Largest single-channel difference, which is what the eye separates on. */
function channelDistance (a: number, b: number): number
{
    return Math.max(
        Math.abs(((a >> 16) & 0xff) - ((b >> 16) & 0xff)),
        Math.abs(((a >> 8) & 0xff) - ((b >> 8) & 0xff)),
        Math.abs((a & 0xff) - (b & 0xff))
    );
}

describe('the level select route', () => {

    //  The grid this replaced once ran off the bottom of the screen and took
    //  the BACK button with it, leaving a touch device with no way out. The
    //  shape changed; the way it can fail did not.
    it('fits every stop, and the way back, on screen', () => {

        for (let i = 0; i < LEVELS.length; i++)
        {
            const stop = stopAt(i, LEVELS.length);

            expect(stop.y + ROUTE_NODE_RADIUS, `stop ${i}`).toBeLessThan(GAME_HEIGHT);
            expect(stop.y - ROUTE_NODE_RADIUS, `stop ${i}`).toBeGreaterThan(0);
        }

        const backBottom = ROUTE_LAST_Y + BUTTON_HEIGHT + 24 + (BUTTON_HEIGHT / 2);

        expect(backBottom, 'back button').toBeLessThan(GAME_HEIGHT);

    });

    it('keeps every stop and its label inside the screen', () => {

        for (let i = 0; i < LEVELS.length; i++)
        {
            const stop = stopAt(i, LEVELS.length);

            expect(stop.x - ROUTE_NODE_RADIUS, `stop ${i} left`).toBeGreaterThan(0);
            expect(stop.x + ROUTE_NODE_RADIUS, `stop ${i} right`).toBeLessThan(GAME_WIDTH);

            //  The detail runs outwards from the stop, away from the route, so
            //  the far edge of the text is what has to fit.
            const labelEdge = stop.x + (stop.side * (ROUTE_DETAIL_OFFSET + LABEL_REACH));

            expect(labelEdge, `stop ${i} label`).toBeGreaterThan(0);
            expect(labelEdge, `stop ${i} label`).toBeLessThan(GAME_WIDTH);
        }

    });

    //  Two stops closer together than their own diameter would overlap into an
    //  unreadable stack, and their touch targets would fight.
    it('never overlaps two stops', () => {

        for (let i = 0; i < LEVELS.length - 1; i++)
        {
            const a = stopAt(i, LEVELS.length);
            const b = stopAt(i + 1, LEVELS.length);

            const gap = Math.hypot(b.x - a.x, b.y - a.y);

            expect(gap, `stops ${i} and ${i + 1}`).toBeGreaterThan(ROUTE_NODE_RADIUS * 2);
        }

    });

    //  Not "alternates every stop" - that was the zig-zag this replaced, and a
    //  wave does not do it. What matters is that the route uses the width of
    //  the screen rather than running straight down the middle.
    it('swings to both sides of the screen', () => {

        const sides = LEVELS.map((_, i) => stopAt(i, LEVELS.length).side);

        expect(sides).toContain(-1);
        expect(sides).toContain(1);

    });

    it('moves sideways between every pair of stops', () => {

        for (let i = 0; i < LEVELS.length - 1; i++)
        {
            const a = stopAt(i, LEVELS.length);
            const b = stopAt(i + 1, LEVELS.length);

            //  Two stops at the same x with a curve between them would put the
            //  route through both and read as a straight line with beads on it.
            expect(Math.abs(b.x - a.x), `stops ${i} and ${i + 1}`).toBeGreaterThan(8);
        }

    });

    it('runs the route downwards from first to last', () => {

        for (let i = 0; i < LEVELS.length - 1; i++)
        {
            expect(stopAt(i + 1, LEVELS.length).y).toBeGreaterThan(stopAt(i, LEVELS.length).y);
        }

    });

});
