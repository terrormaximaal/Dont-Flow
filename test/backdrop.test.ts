import { afterEach, describe, expect, it } from 'vitest';
import { GAME_HEIGHT, HORIZON_Y } from '../src/game/config/constants';
import { WORLDS } from '../src/game/config/worldData';
import { WorldId } from '../src/game/config/worlds';
import { paintPageBackdrop } from '../src/game/systems/PageBackdrop';

const IDS: WorldId[] = [
    'sky', 'mountains', 'canyon', 'forest', 'ice', 'desert', 'storm', 'city', 'space', 'void'
];

/** Just enough of a document for the backdrop to write into. */
function stubDocument (): { body: { style: { background: string } } }
{
    const doc = { body: { style: { background: '' } } };

    (globalThis as unknown as { document: unknown }).document = doc;

    return doc;
}

afterEach(() => {

    delete (globalThis as unknown as { document?: unknown }).document;

});

describe('the page behind the canvas', () => {

    //  The game is letterboxed, so on most phones there are bars around it. The
    //  bars carry the world's own colours, which only works if the sky/ground
    //  split sits where the game's horizon does - otherwise a screen with bars
    //  down the sides shows two horizons a few dozen pixels apart.
    it('splits sky from ground at the height the horizon is drawn at', () => {

        const doc = stubDocument();

        paintPageBackdrop(WORLDS.sky);

        const horizon = (HORIZON_Y / GAME_HEIGHT) * 100;
        const stops = [ ...doc.body.style.background.matchAll(/([\d.]+)%/g) ].map((m) => Number(m[1]));

        //  0%, horizon, horizon, 100%.
        expect(stops).toEqual([ 0, horizon, horizon, 100 ]);

    });

    it('paints every world without leaving a colour undefined', () => {

        const doc = stubDocument();

        for (const id of IDS)
        {
            paintPageBackdrop(WORLDS[id]);

            const colors = doc.body.style.background.match(/#[0-9a-f]{6}/g) ?? [];

            expect(colors, `${id} stops`).toHaveLength(4);
        }

    });

    it('shades the horizon stop towards the haze the canvas draws there', () => {

        const doc = stubDocument();

        //  Sky hazes towards white at 0.42, so its horizon stop has to be
        //  lighter than the raw sky colour it is mixed from.
        paintPageBackdrop(WORLDS.sky);

        const colors = doc.body.style.background.match(/#[0-9a-f]{6}/g) ?? [];
        const horizonStop = parseInt(colors[1].slice(1), 16);

        expect(horizonStop).toBeGreaterThan(WORLDS.sky.skyBottom);

    });

    //  Called from scene setup, which also runs under test tooling and any
    //  future server-side render. Reaching for document there must not throw.
    it('does nothing when there is no document', () => {

        expect(() => paintPageBackdrop(WORLDS.sky)).not.toThrow();

    });

});
