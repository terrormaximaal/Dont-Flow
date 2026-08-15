import { describe, expect, it } from 'vitest';
import { COLOR_VALUES, ColorId } from '../src/game/config/constants';
import { GLYPHS } from '../src/game/config/glyphs';
import { LEVELS } from '../src/game/config/levels';
import { SURVIVAL_PALETTE } from '../src/game/config/survival';

//  ---------------------------------------------------------------------------
//  Simulating dichromacy, so the claim that this game needs marks at all is a
//  measurement rather than an opinion.
//
//  Vienot 1999: the missing cone is dropped onto the plane the remaining two can
//  express. Applied in linear light, because doing it on sRGB bytes gives
//  confidently wrong answers.
//  ---------------------------------------------------------------------------

type Rgb = [ number, number, number ];

const MATRICES: Record<string, number[][]> = {
    protanopia: [
        [ 0.152286, 1.052583, -0.204868 ],
        [ 0.114503, 0.786281, 0.099216 ],
        [ -0.003882, -0.048116, 1.051998 ]
    ],
    deuteranopia: [
        [ 0.367322, 0.860646, -0.227968 ],
        [ 0.280085, 0.672501, 0.047413 ],
        [ -0.011820, 0.042940, 0.968881 ]
    ],
    tritanopia: [
        [ 1.255528, -0.076749, -0.178779 ],
        [ -0.078411, 0.930809, 0.147602 ],
        [ 0.004733, 0.691367, 0.303900 ]
    ]
};

const toLinear = (c: number): number =>
    (c / 255 <= 0.04045 ? (c / 255) / 12.92 : Math.pow(((c / 255) + 0.055) / 1.055, 2.4));

const toSrgb = (c: number): number => {
    const v = Math.min(1, Math.max(0, c));

    return (v <= 0.0031308 ? v * 12.92 : (1.055 * Math.pow(v, 1 / 2.4)) - 0.055) * 255;
};

const unpack = (hex: number): Rgb => [ (hex >> 16) & 255, (hex >> 8) & 255, hex & 255 ];

function simulate (hex: number, kind: string): Rgb
{
    const [ r, g, b ] = unpack(hex).map(toLinear);
    const m = MATRICES[kind];

    return [ 0, 1, 2 ].map((i) => toSrgb((m[i][0] * r) + (m[i][1] * g) + (m[i][2] * b))) as Rgb;
}

function toLab (rgb: Rgb): Rgb
{
    const [ r, g, b ] = rgb.map(toLinear);

    const x = ((r * 0.4124) + (g * 0.3576) + (b * 0.1805)) / 0.95047;
    const y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
    const z = ((r * 0.0193) + (g * 0.1192) + (b * 0.9505)) / 1.08883;

    const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116));

    return [ (116 * f(y)) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z)) ];
}

function difference (a: Rgb, b: Rgb): number
{
    const [ l1, a1, b1 ] = toLab(a);
    const [ l2, a2, b2 ] = toLab(b);

    return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** Roughly where two colours stop being separable at a glance. */
const CONFUSABLE = 20;

describe('whether colour alone is enough', () => {

    //  The measurement this whole file exists because of. Under normal vision
    //  the palette is well chosen and nothing collides; under deuteranopia,
    //  which is the commonest form, red and green come out under one - not hard
    //  to tell apart, the same colour twice.
    it('separates every pair for a player with full colour vision', () => {

        const ids = Object.keys(COLOR_VALUES) as ColorId[];

        for (let i = 0; i < ids.length; i++)
        {
            for (let j = i + 1; j < ids.length; j++)
            {
                //  Pink is not in any shipped palette and sits beside magenta.
                if (ids[i] === 'pink' || ids[j] === 'pink')
                {
                    continue;
                }

                expect(
                    difference(unpack(COLOR_VALUES[ids[i]]), unpack(COLOR_VALUES[ids[j]])),
                    `${ids[i]} against ${ids[j]}`
                ).toBeGreaterThan(CONFUSABLE);
            }
        }

    });

    it('does not, for a player without it', () => {

        //  Stated as a fact about this palette rather than hidden in a comment,
        //  because it is the reason the marks exist and anybody minded to
        //  remove them should have to delete this first.
        const red = COLOR_VALUES.red;
        const green = COLOR_VALUES.green;

        expect(
            difference(simulate(red, 'deuteranopia'), simulate(green, 'deuteranopia')),
            'red against green, deuteranopia'
        ).toBeLessThan(5);

    });

    //  And it is not a corner case in one unused colour: eight of the twenty
    //  levels put a pair somebody cannot separate into the same palette.
    it('ships levels whose palettes collapse for someone', () => {

        const affected = LEVELS.filter((spec) => {

            for (const kind of Object.keys(MATRICES))
            {
                for (let i = 0; i < spec.palette.length; i++)
                {
                    for (let j = i + 1; j < spec.palette.length; j++)
                    {
                        const a = simulate(COLOR_VALUES[spec.palette[i]], kind);
                        const b = simulate(COLOR_VALUES[spec.palette[j]], kind);

                        if (difference(a, b) < CONFUSABLE) { return true; }
                    }
                }
            }

            return false;

        });

        expect(affected.length, 'levels with a confusable pair').toBeGreaterThan(0);

    });

});

describe('the mark each colour carries', () => {

    it('gives one to every colour the game has', () => {

        for (const id of Object.keys(COLOR_VALUES) as ColorId[])
        {
            expect(GLYPHS[id], id).toBeDefined();
        }

    });

    //  The whole point. Two colours that a player cannot separate must not wear
    //  the same mark, or the mark has told them nothing.
    it('never gives the same mark to two colours that can collapse', () => {

        const ids = (Object.keys(COLOR_VALUES) as ColorId[]).filter((id) => id !== 'pink');

        for (const kind of Object.keys(MATRICES))
        {
            for (let i = 0; i < ids.length; i++)
            {
                for (let j = i + 1; j < ids.length; j++)
                {
                    const a = simulate(COLOR_VALUES[ids[i]], kind);
                    const b = simulate(COLOR_VALUES[ids[j]], kind);

                    if (difference(a, b) >= CONFUSABLE)
                    {
                        continue;
                    }

                    expect(
                        GLYPHS[ids[i]],
                        `${ids[i]} and ${ids[j]} collapse under ${kind} and share a mark`
                    ).not.toBe(GLYPHS[ids[j]]);
                }
            }
        }

    });

    //  Stronger, and what actually matters in play: within any one level, every
    //  colour on the road must be tellable from every other by its mark alone,
    //  whatever the player's colour vision.
    it('makes every level readable by shape alone', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            const marks = spec.palette.map((id) => GLYPHS[id]);

            expect(
                new Set(marks).size,
                `level ${index + 1}: ${spec.palette.join(', ')}`
            ).toBe(spec.palette.length);
        }

    });

    it('makes an endless run readable by shape alone too', () => {

        const marks = SURVIVAL_PALETTE.map((id) => GLYPHS[id]);

        expect(new Set(marks).size).toBe(SURVIVAL_PALETTE.length);

    });

});
