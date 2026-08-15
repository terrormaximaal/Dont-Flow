import { describe, expect, it } from 'vitest';
import {
    MUSIC_BEATS_PER_BAR,
    MUSIC_BPM,
    MUSIC_GAIN,
    MUSIC_LOOKAHEAD,
    MUSIC_TICK_MS,
    ORB_BASE_SEMITONES
} from '../src/game/config/constants';
import { semitonesFor, voiceFor } from '../src/game/config/audio';
import { barNotes, beatsOf, HOOK, LOOP_BARS, THEME } from '../src/game/config/music';
import { decayOf } from '../src/game/systems/voice';

/** Every note the backing can play, anywhere in its loop. */
function everyNote (): number[]
{
    const notes: number[] = [];

    for (let bar = 0; bar < LOOP_BARS; bar++)
    {
        notes.push(...barNotes(bar).map((note) => note.semitones));
    }

    return notes;
}

describe('the theme', () => {

    it('is long enough to be a tune and short enough to sit through', () => {

        const last = THEME[THEME.length - 1];

        expect(THEME.length, 'notes').toBeGreaterThanOrEqual(8);
        expect(last.at, 'seconds').toBeGreaterThan(1.5);
        expect(last.at, 'seconds').toBeLessThan(4);

    });

    it('is played in order, with no two notes on the same moment', () => {

        for (let i = 1; i < THEME.length; i++)
        {
            expect(THEME[i].at, `note ${i}`).toBeGreaterThan(THEME[i - 1].at);
        }

    });

    //  An arch: away from the root, and back to it. A tune that ends somewhere
    //  other than where it started is a fragment, and a fragment is the thing
    //  nobody can hum back.
    it('leaves the root, reaches a top, and comes home to it', () => {

        const top = Math.max(...THEME.map((note) => note.semitones));
        const home = THEME[0].semitones;

        //  In the game's own key rather than in one of its own, which is what
        //  keeps it consonant with everything the player triggers over it.
        expect(home, 'starts where a streak starts').toBe(ORB_BASE_SEMITONES);
        expect(THEME[THEME.length - 1].semitones, 'ends there too').toBe(home);
        expect(top - home, 'goes somewhere on the way').toBeGreaterThanOrEqual(12);

    });

    it('ends on its loudest note, so it lands rather than trails off', () => {

        const loudest = Math.max(...THEME.map((note) => note.gain));

        expect(THEME[THEME.length - 1].gain).toBe(loudest);

    });

    //  The title screen is where the player learns it, so those have to be the
    //  same tune rather than two things that sound similar.
    it('is what the title plays', () => {

        expect(voiceFor('title')).toEqual(THEME);

    });

    it('opens with the hook the backing quotes', () => {

        expect(HOOK).toEqual(THEME.slice(0, HOOK.length));

    });

});

describe('the backing under a run', () => {

    it('lays down a bar wherever it is asked, however far in', () => {

        for (const bar of [ 0, 1, 7, 8, 99, 1000 ])
        {
            expect(barNotes(bar).length, `bar ${bar}`).toBeGreaterThan(0);
        }

    });

    it('comes round again rather than running out', () => {

        expect(barNotes(LOOP_BARS)).toEqual(barNotes(0));
        expect(barNotes(LOOP_BARS * 3 + 2)).toEqual(barNotes(2));

    });

    //  The one rule that lets it play under the game at all. Every sound the
    //  player makes is drawn from the same five notes, so a collected orb
    //  cannot land a semitone against whatever the backing is holding - and
    //  with a three-second room, something is always being held.
    it('never holds a note a semitone from one the player can play', () => {

        const reachable = new Set<number>();

        for (let combo = 0; combo < 40; combo++)
        {
            reachable.add(((semitonesFor(combo) % 12) + 12) % 12);
        }

        for (const note of everyNote())
        {
            const pitch = ((note % 12) + 12) % 12;

            for (const played of reachable)
            {
                const apart = Math.abs(pitch - played) % 12;

                expect(apart === 1 || apart === 11, `${note} against ${played}`).toBe(false);
            }
        }

    });

    it('keeps every note inside the bar it belongs to', () => {

        for (let bar = 0; bar < LOOP_BARS; bar++)
        {
            for (const note of barNotes(bar))
            {
                expect(note.beat, `bar ${bar}`).toBeGreaterThanOrEqual(0);
                expect(note.beat, `bar ${bar}`).toBeLessThan(MUSIC_BEATS_PER_BAR);
            }
        }

    });

    //  It plays for as long as the level does, under everything that matters.
    //  Anything approaching the game's own sounds would be a tune the player
    //  has to listen past.
    it('stays well under the sounds of the game itself', () => {

        const loudest = Math.max(...[ ...Array(LOOP_BARS).keys() ]
            .flatMap((bar) => barNotes(bar).map((note) => note.gain)));

        expect(loudest * MUSIC_GAIN).toBeLessThan(voiceFor('orb')[0].gain * 0.5);

    });

    //  A bass note that has died before the next one arrives leaves a hole
    //  under the music, and the floor is meant to be continuous. Low notes on
    //  this instrument ring for about two and a half seconds, which is less
    //  than a bar - so the answer is how often it is struck, not how long it
    //  is held.
    it('strikes its bass again before the last one has died', () => {

        const beat = 60 / MUSIC_BPM;
        const bass = barNotes(0).filter((note) => note.semitones === barNotes(0)[0].semitones);

        expect(bass.length, 'bass notes in a bar').toBeGreaterThan(1);
        expect(bass[0].beat, 'on the downbeat').toBe(0);

        for (let i = 1; i < bass.length; i++)
        {
            expect((bass[i].beat - bass[i - 1].beat) * beat, `gap ${i}`)
                .toBeLessThan(decayOf(bass[i - 1].semitones));
        }

        //  And across the join into the next bar, which is the gap that is
        //  easiest to leave open.
        const last = bass[bass.length - 1];
        const wrap = (MUSIC_BEATS_PER_BAR - last.beat) * beat;

        expect(wrap, 'into the next bar').toBeLessThan(decayOf(last.semitones));

    });

    it('quotes the theme now and then rather than every bar', () => {

        const quoting = [ ...Array(LOOP_BARS).keys() ]
            .filter((bar) => barNotes(bar).length > barNotes(1).length);

        expect(quoting, 'bars carrying the hook').toHaveLength(1);
        expect(quoting[0], 'at the top of the loop').toBe(0);

    });

    it('keeps the hook at the speed the theme is played at', () => {

        expect(beatsOf(60 / MUSIC_BPM)).toBeCloseTo(1);
        expect(beatsOf(0)).toBe(0);

    });

});

describe('how the backing is handed to the clock', () => {

    //  Music written a frame at a time limps: a busy frame puts a note late and
    //  the tune never recovers. It is written ahead instead, which only works
    //  if the timer that tops it up cannot fall behind what has been written.
    it('tops itself up several times over before it runs dry', () => {

        expect(MUSIC_LOOKAHEAD * 1000).toBeGreaterThan(MUSIC_TICK_MS * 3);

    });

    //  Bars are written whole, so what has to be true is that the timer comes
    //  round several times inside one - a tick that took as long as a bar
    //  would be one missed wake-up away from a silence.
    it('wakes up many times inside a single bar', () => {

        const barSeconds = (60 / MUSIC_BPM) * MUSIC_BEATS_PER_BAR;

        expect(MUSIC_TICK_MS / 1000).toBeLessThan(barSeconds / 4);

    });

});
