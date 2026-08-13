import { describe, expect, it } from 'vitest';
import {
    GAME_WIDTH,
    LOW_VIGNETTE_ALPHA,
    LOW_VIGNETTE_BANDS,
    VIGNETTE_ALPHA,
    VIGNETTE_BANDS
} from '../src/game/config/constants';
import { sheenBands } from '../src/game/ui/Button';
import { vignetteBands } from '../src/game/ui/vignetteBands';

describe('a vignette built out of rings', () => {

    it('starts at the edge and stops at the reach', () => {

        const bands = vignetteBands(120, 10, 0.3);

        expect(bands).toHaveLength(10);
        expect(bands[0].inset).toBe(0);
        expect(bands[bands.length - 1].inset).toBeLessThan(120);

    });

    it('is strongest at the edge and fades inwards', () => {

        const bands = vignetteBands(120, 10, 0.3);

        expect(bands[0].alpha).toBe(0.3);

        for (let i = 1; i < bands.length; i++)
        {
            expect(bands[i].alpha, `ring ${i}`).toBeLessThan(bands[i - 1].alpha);
        }

        //  All the way to nothing, so the inner edge of the effect has no line
        //  across it - a vignette that stops while still visible is a border.
        expect(bands[bands.length - 1].alpha).toBeLessThan(0.3 * 0.02);

    });

    //  Rings a hair wider than their spacing. A ring exactly as wide as the gap
    //  leaves a seam wherever the arithmetic rounds the wrong way, and a seam
    //  in a soft edge is the one thing it cannot have.
    it('overlaps consecutive rings rather than leaving seams', () => {

        const bands = vignetteBands(160, 8, 0.3);

        const spacing = bands[1].inset - bands[0].inset;

        expect(bands[0].width).toBeGreaterThan(spacing);

    });

    it('falls away rather than ramping evenly', () => {

        //  Squared falloff: the middle ring is well under half the edge's
        //  strength, where an even ramp would put it at exactly half.
        const bands = vignetteBands(120, 10, 1);

        expect(bands[5].alpha).toBeLessThan(0.5 * 0.75);

    });

});

describe('the two vignettes the game draws', () => {

    //  The number that decides whether a vignette is visible is the alpha of
    //  its outermost ring, because only one ring covers any given pixel. That
    //  was read as a total to divide between the rings once, which made the
    //  low-score warning sixteen times fainter than intended and invisible on
    //  every dark world in the game. This is the guard.
    it('makes the low-score warning far stronger than the ambient darkening', () => {

        const ambient = vignetteBands(GAME_WIDTH / 6, VIGNETTE_BANDS, VIGNETTE_ALPHA);
        const warning = vignetteBands(GAME_WIDTH / 3.4, LOW_VIGNETTE_BANDS, LOW_VIGNETTE_ALPHA);

        expect(warning[0].alpha).toBeGreaterThan(ambient[0].alpha * 8);

    });

    it('keeps the ambient darkening subtle enough to be a settling', () => {

        const ambient = vignetteBands(GAME_WIDTH / 6, VIGNETTE_BANDS, VIGNETTE_ALPHA);

        //  It is meant to be felt rather than seen. On a phone in daylight a
        //  heavy one reads as a smudged screen.
        expect(ambient[0].alpha).toBeLessThan(0.05);

    });

    //  The mistake this game keeps making in a new place each time: stacked
    //  opacity in too few steps does not read as a soft mass, it reads as the
    //  steps. What decides it is the absolute jump between neighbouring rings -
    //  a faint effect gets away with fourteen of them and a strong one does
    //  not, which is why the two vignettes have very different counts for the
    //  same shape.
    it('steps too finely between rings for any of them to be seen', () => {

        const both = [
            vignetteBands(GAME_WIDTH / 6, VIGNETTE_BANDS, VIGNETTE_ALPHA),
            vignetteBands(GAME_WIDTH / 3.4, LOW_VIGNETTE_BANDS, LOW_VIGNETTE_ALPHA)
        ];

        for (const [ index, bands ] of both.entries())
        {
            for (let i = 1; i < bands.length; i++)
            {
                expect(bands[i - 1].alpha - bands[i].alpha, `vignette ${index}, ring ${i}`)
                    .toBeLessThan(0.012);
            }
        }

    });

    it('makes the warning strong enough to read at the corner of the eye', () => {

        const warning = vignetteBands(GAME_WIDTH / 3.4, LOW_VIGNETTE_BANDS, LOW_VIGNETTE_ALPHA);

        expect(warning[0].alpha).toBeGreaterThan(0.2);

    });

    //  Reaching visibly further in than the ambient one. A warning confined to
    //  the last few pixels of the frame is not in the corner of anyone's eye.
    it('brings the warning further in from the edge than the darkening', () => {

        const ambient = vignetteBands(GAME_WIDTH / 6, VIGNETTE_BANDS, VIGNETTE_ALPHA);
        const warning = vignetteBands(GAME_WIDTH / 3.4, LOW_VIGNETTE_BANDS, LOW_VIGNETTE_ALPHA);

        const reachOf = (bands: ReturnType<typeof vignetteBands>) =>
            bands[bands.length - 1].inset;

        expect(reachOf(warning)).toBeGreaterThan(reachOf(ambient) * 1.5);

    });

});

//  The same lesson a third time, so it is stated once for everything that
//  fakes a gradient by stacking flat shapes. Phaser's Graphics has no gradient
//  fill, so every soft ramp in this game is built this way - and each time, the
//  thing that gives it away is the absolute jump between two neighbours rather
//  than how many of them there are.
describe('every banded ramp the game draws', () => {

    /** Above this, a step across a flat surface reads as a line. */
    const VISIBLE_STEP = 0.012;

    it('steps the button sheen too finely to be seen', () => {

        const bands = sheenBands();

        expect(bands.length).toBeGreaterThan(1);

        for (let i = 1; i < bands.length; i++)
        {
            expect(bands[i - 1] - bands[i], `sheen band ${i}`).toBeLessThan(VISIBLE_STEP);
        }

    });

    it('fades the button sheen away rather than stopping while still visible', () => {

        const bands = sheenBands();

        //  A sheen that ends part-way puts a line across the middle of the
        //  button where it stops.
        expect(bands[bands.length - 1]).toBeLessThan(VISIBLE_STEP);

    });

});
