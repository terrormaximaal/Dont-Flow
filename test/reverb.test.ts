import { describe, expect, it } from 'vitest';
import { REVERB_SECONDS } from '../src/game/config/constants';
import { impulseChannel, impulseChannels } from '../src/game/systems/reverb';

const LENGTH = 4410;

describe('the room a note is played into', () => {

    it('is the length it was asked for', () => {

        expect(impulseChannel(LENGTH, 1)).toHaveLength(LENGTH);

    });

    it('never asks the speaker for more than it can give', () => {

        //  Samples outside -1..1 are clipped by the hardware, which is heard as
        //  a crackle on top of the reverb rather than as a louder reverb.
        for (const sample of impulseChannel(LENGTH, 1))
        {
            expect(Math.abs(sample)).toBeLessThanOrEqual(1);
        }

    });

    it('falls away rather than holding', () => {

        const samples = impulseChannel(LENGTH, 1);

        const loudest = (from: number, to: number) => {

            let peak = 0;

            for (let i = from; i < to; i++)
            {
                peak = Math.max(peak, Math.abs(samples[i]));
            }

            return peak;
        };

        //  Quarter by quarter, each one quieter than the one before it.
        expect(loudest(0, 1100)).toBeGreaterThan(loudest(1100, 2200));
        expect(loudest(1100, 2200)).toBeGreaterThan(loudest(2200, 3300));
        expect(loudest(2200, 3300)).toBeGreaterThan(loudest(3300, 4410));

    });

    it('ends at silence, so the tail has no edge on it', () => {

        const samples = impulseChannel(LENGTH, 1);

        expect(Math.abs(samples[LENGTH - 1])).toBeLessThan(0.001);

    });

    //  The same room on every device and every run, like every other generated
    //  thing in this game.
    it('is identical from the same seed', () => {

        expect([ ...impulseChannel(64, 5) ]).toEqual([ ...impulseChannel(64, 5) ]);

    });

    //  One noise copied to both ears is not a room, it is a mono effect sitting
    //  in the middle of the player's head.
    it('gives each ear its own noise', () => {

        const [ left, right ] = impulseChannels(LENGTH);

        let same = 0;

        for (let i = 0; i < LENGTH; i++)
        {
            if (left[i] === right[i]) { same++; }
        }

        expect(same).toBeLessThan(LENGTH * 0.01);

    });

    //  It used to be three and a half seconds, and that room was most of why
    //  the game became unbearable to listen to: everything the player did was
    //  still sounding while they did the next thing. An arcade cabinet has no
    //  reverb worth the name, and this one barely does either.
    it('is a cabinet rather than a cathedral', () => {

        expect(REVERB_SECONDS).toBeLessThan(1);
        expect(REVERB_SECONDS).toBeGreaterThan(0.2);

    });

});
