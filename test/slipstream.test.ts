import { describe, expect, it } from 'vitest';
import {
    GAME_WIDTH,
    SLIP_BUDGET,
    SLIP_MIN_SCALE,
    SLIP_SPACING,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../src/game/config/constants';
import { visibleMotes } from '../src/game/systems/Slipstream';

describe('the slipstream', () => {

    it('never draws more than its budget', () => {

        for (let travelled = 0; travelled < 30000; travelled += 97)
        {
            expect(visibleMotes(travelled).length, `at ${travelled}`).toBeLessThanOrEqual(SLIP_BUDGET);
        }

    });

    //  The whole point of them is speed, and speed only reads near the camera.
    //  Far off a streak is a stationary dot, and a screenful of stationary dots
    //  reads as dirt on the lens.
    it('keeps only the motes near enough to read as motion', () => {

        for (let travelled = 0; travelled < 10000; travelled += 61)
        {
            for (const mote of visibleMotes(travelled))
            {
                expect(mote.scale, `at ${travelled}`).toBeGreaterThanOrEqual(SLIP_MIN_SCALE);
            }
        }

    });

    //  The corridor is where orbs and barriers are read. A streak crossing it
    //  is noise in the one place on screen that has to stay clean.
    it('never puts a mote over the road', () => {

        const left = TRACK_LEFT;
        const right = TRACK_LEFT + TRACK_WIDTH;

        for (let travelled = 0; travelled < 10000; travelled += 37)
        {
            for (const mote of visibleMotes(travelled))
            {
                const clear = mote.x <= left || mote.x >= right;

                expect(clear, `at ${travelled}, x=${mote.x.toFixed(1)}`).toBe(true);
            }
        }

    });

    it('uses both sides of the road', () => {

        const motes = visibleMotes(4000);

        expect(motes.some((m) => m.x < GAME_WIDTH / 2)).toBe(true);
        expect(motes.some((m) => m.x > GAME_WIDTH / 2)).toBe(true);

    });

    //  Unlike the road's strips, motes are *not* meant to repeat every spacing:
    //  each one varies with its own index, which is what keeps the stream from
    //  showing a pattern. What they must be is settled - the same distance has
    //  to give the same motes, or they flicker between frames.
    it('puts a mote in the same place every time it is asked', () => {

        for (const travelled of [ 0, 137, 6000, 6000 + SLIP_SPACING ])
        {
            const first = visibleMotes(travelled);
            const second = visibleMotes(travelled);

            expect(second).toEqual(first);
        }

    });

    //  A stream with gaps in it is not a stream. If the spacing and the near
    //  cutoff ever drift apart, the effect would blink out for stretches of the
    //  course and read as a glitch rather than as speed.
    it('never leaves the screen empty of them', () => {

        for (let travelled = 0; travelled < 30000; travelled += 23)
        {
            expect(visibleMotes(travelled).length, `at ${travelled}`).toBeGreaterThan(0);
        }

    });

    it('trails every streak behind its own head', () => {

        for (let travelled = 0; travelled < 6000; travelled += 53)
        {
            for (const mote of visibleMotes(travelled))
            {
                //  Screen y grows downwards, so the tail is above the head.
                expect(mote.tailY).toBeLessThan(mote.y);
            }
        }

    });

});
