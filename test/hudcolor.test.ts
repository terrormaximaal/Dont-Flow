import { describe, expect, it } from 'vitest';
import {
    COLOR_SCORE_GAIN,
    COLOR_SCORE_LOSS,
    SCORE_TINT_SHIFT
} from '../src/game/config/constants';
import { WORLDS } from '../src/game/config/worldData';
import { WorldId } from '../src/game/config/worlds';
import { fromCss, shiftCss } from '../src/game/utils/color';

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

describe('the score reacting to a change', () => {

    //  The whole point of the shift rather than a swap. Both accents are pale,
    //  so painting them straight onto the score put pale green on the sky
    //  world's pale blue - saying the right thing and being unreadable while
    //  saying it.
    it('stays readable against every world\'s sky, gaining or losing', () => {

        for (const id of IDS)
        {
            const world = WORLDS[id];
            const sky = luminance(world.skyTop);

            for (const accent of [ COLOR_SCORE_GAIN, COLOR_SCORE_LOSS ])
            {
                const shifted = luminance(fromCss(shiftCss(world.hudText, accent, SCORE_TINT_SHIFT)));

                //  The desert is the binding case at 0.295, which is what sets
                //  SCORE_TINT_SHIFT. Anything under this and the reaction costs
                //  more legibility than it buys.
                expect(Math.abs(sky - shifted), `${id} score on sky`).toBeGreaterThan(0.28);
            }
        }

    });

    //  It still has to *read* as the accent, or the reaction says nothing.
    it('leans far enough towards the accent to be seen', () => {

        for (const id of IDS)
        {
            const world = WORLDS[id];

            const plain = fromCss(world.hudText);
            const gained = fromCss(shiftCss(world.hudText, COLOR_SCORE_GAIN, SCORE_TINT_SHIFT));
            const lost = fromCss(shiftCss(world.hudText, COLOR_SCORE_LOSS, SCORE_TINT_SHIFT));

            expect(gained, `${id} gain differs`).not.toBe(plain);
            expect(lost, `${id} loss differs`).not.toBe(plain);

            //  And the two must not be mistakable for each other.
            const gainRed = (gained >> 16) & 0xff;
            const lossRed = (lost >> 16) & 0xff;
            const gainGreen = (gained >> 8) & 0xff;
            const lossGreen = (lost >> 8) & 0xff;

            expect(lossRed - gainRed + (gainGreen - lossGreen), `${id} gain vs loss`).toBeGreaterThan(16);
        }

    });

    it('returns exactly what it was given at either end of the shift', () => {

        expect(shiftCss('#123456', '#abcdef', 0)).toBe('#123456');
        expect(shiftCss('#123456', '#abcdef', 1)).toBe('#abcdef');

    });

});
