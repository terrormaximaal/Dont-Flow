import { describe, expect, it } from 'vitest';
import { PIANO_ROOT_HZ, PIANO_STREAK_CAP } from '../src/game/config/constants';
import {
    collectSemitones,
    FAIL_JINGLE,
    FINISH_JINGLE,
    frequencyOf,
    missSemitones,
    Note,
    semitonesAt,
    stepFor,
    TITLE_JINGLE
} from '../src/game/systems/piano';
import { decayOf } from '../src/game/systems/voice';

describe('the note a streak plays', () => {

    it('starts at the root on the first orb of a run', () => {

        expect(collectSemitones(1)).toBe(0);

    });

    //  The whole ask: every orb in a row is a step up from the one before it.
    it('climbs with every orb collected', () => {

        for (let streak = 1; streak < PIANO_STREAK_CAP; streak++)
        {
            expect(collectSemitones(streak + 1), `streak ${streak}`)
                .toBeGreaterThan(collectSemitones(streak));
        }

    });

    //  Rather than wrapping back to the bottom, which would sound like the
    //  streak had just been lost at the exact moment it was going best.
    it('holds at the top instead of dropping back', () => {

        const top = collectSemitones(PIANO_STREAK_CAP + 1);

        expect(collectSemitones(PIANO_STREAK_CAP + 20)).toBe(top);
        expect(collectSemitones(500)).toBe(top);

    });

    it('starts over when the streak does', () => {

        //  A miss zeroes the combo, and the next orb is counted before it is
        //  played, so the first orb after a mistake asks with a streak of one.
        expect(collectSemitones(1)).toBe(0);

    });

    it('is never a semitone away from any other note it can play', () => {

        //  What the pentatonic scale is for. Two notes a semitone apart, held
        //  together by three seconds of reverb, is the one interval that would
        //  sound like a mistake.
        const played = [];

        for (let streak = 1; streak <= PIANO_STREAK_CAP + 1; streak++)
        {
            played.push(collectSemitones(streak));
        }

        for (const a of played)
        {
            for (const b of played)
            {
                const apart = Math.abs(a - b) % 12;

                expect(apart === 1 || apart === 11, `${a} against ${b}`).toBe(false);
            }
        }

    });

    it('stays inside a range a small speaker can actually play', () => {

        expect(frequencyOf(collectSemitones(1))).toBeCloseTo(PIANO_ROOT_HZ);

        //  Under the top of a phone speaker's useful range, and above the
        //  bottom of it - a note either side of those is felt as absent.
        expect(frequencyOf(collectSemitones(PIANO_STREAK_CAP + 1))).toBeLessThan(2200);
        expect(frequencyOf(missSemitones())).toBeGreaterThan(80);

    });

    it('puts a wrong colour below everything a streak can reach', () => {

        expect(missSemitones()).toBeLessThan(0);
        expect(missSemitones()).toBeLessThan(collectSemitones(1));

    });

});

describe('semitones as frequencies', () => {

    it('doubles every octave', () => {

        expect(frequencyOf(0)).toBeCloseTo(PIANO_ROOT_HZ);
        expect(frequencyOf(12)).toBeCloseTo(PIANO_ROOT_HZ * 2);
        expect(frequencyOf(-12)).toBeCloseTo(PIANO_ROOT_HZ / 2);

    });

    it('rises without a gap', () => {

        for (let step = 0; step < 30; step++)
        {
            expect(semitonesAt(step + 1)).toBeGreaterThan(semitonesAt(step));
        }

    });

    it('counts the first orb as step zero', () => {

        expect(stepFor(1)).toBe(0);
        expect(stepFor(0)).toBe(0);
        expect(stepFor(-3)).toBe(0);

    });

});

describe('the written phrases', () => {

    const phrases: Array<[ string, Note[] ]> = [
        [ 'title', TITLE_JINGLE ],
        [ 'finish', FINISH_JINGLE ],
        [ 'fail', FAIL_JINGLE ]
    ];

    it('are played in order and never on top of each other', () => {

        for (const [ name, phrase ] of phrases)
        {
            expect(phrase.length, name).toBeGreaterThan(1);

            for (let i = 1; i < phrase.length; i++)
            {
                expect(phrase[i].at, `${name} note ${i}`).toBeGreaterThan(phrase[i - 1].at);
            }
        }

    });

    it('stay within what one voice can carry', () => {

        for (const [ name, phrase ] of phrases)
        {
            for (const note of phrase)
            {
                expect(note.gain, `${name} gain`).toBeGreaterThan(0);
                expect(note.gain, `${name} gain`).toBeLessThanOrEqual(1);

                expect(frequencyOf(note.semitones), `${name} pitch`).toBeGreaterThan(80);
                expect(frequencyOf(note.semitones), `${name} pitch`).toBeLessThan(2200);
            }
        }

    });

    //  Each phrase says its own thing without being read: up for a level
    //  finished, down for a run that ran out.
    it('rise at the finish and fall on a fail', () => {

        const last = (phrase: Note[]) => phrase[phrase.length - 1].semitones;

        expect(last(FINISH_JINGLE)).toBeGreaterThan(FINISH_JINGLE[0].semitones);
        expect(last(FAIL_JINGLE)).toBeLessThan(FAIL_JINGLE[0].semitones);

    });

    //  A phrase whose notes outlast their own spacing is a chord, not a
    //  melody - and with this much reverb behind it, one that never clears.
    it('are not so slow that the room has emptied between notes', () => {

        for (const [ name, phrase ] of phrases)
        {
            for (let i = 1; i < phrase.length; i++)
            {
                const gap = phrase[i].at - phrase[i - 1].at;

                expect(gap, `${name} note ${i}`).toBeLessThan(decayOf(phrase[i - 1].semitones));
            }
        }

    });

});

describe('how long a note rings', () => {

    it('is shorter the higher the note', () => {

        expect(decayOf(24)).toBeLessThan(decayOf(0));
        expect(decayOf(0)).toBeLessThan(decayOf(-12));

    });

    it('is always long enough to be heard as a note rather than a click', () => {

        for (let semitones = -24; semitones <= 36; semitones++)
        {
            expect(decayOf(semitones), `${semitones}`).toBeGreaterThan(0.25);
        }

    });

});
