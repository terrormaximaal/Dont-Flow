import { describe, expect, it } from 'vitest';
import {
    FINALE_LIFT,
    MUSIC_BEATS_PER_BAR,
    MUSIC_BPM,
    MUSIC_GAIN,
    MUSIC_LOOKAHEAD,
    MUSIC_TICK_MS
} from '../src/game/config/constants';
import { voiceFor } from '../src/game/config/audio';
import { barNotes, LOOP_BARS, THEME } from '../src/game/config/music';
import { decayOf } from '../src/game/systems/voice';

/** Every note the soundtrack plays in one time round the loop. */
function wholeLoop (finale = 0)
{
    const notes = [];

    for (let bar = 0; bar < LOOP_BARS; bar++)
    {
        notes.push(...barNotes(bar, finale));
    }

    return notes;
}

describe('the theme', () => {

    const tune = () => THEME.filter((note) => note.timbre === 'lead');

    it('is short enough to be a title and long enough to be a phrase', () => {

        const last = THEME[THEME.length - 1];

        expect(tune().length, 'notes').toBeGreaterThanOrEqual(6);
        expect(last.at, 'seconds').toBeLessThan(2.5);

    });

    it('is the opening of the tune the run plays', () => {

        //  The title is not a separate piece of music: it is the first phrase
        //  of the soundtrack, unaccompanied, the way a cabinet announces
        //  itself across a room.
        const opening = barNotes(0)
            .filter((note) => note.timbre === 'lead')
            .map((note) => note.semitones);

        expect(tune().slice(0, opening.length).map((note) => note.semitones)).toEqual(opening);

    });

    it('has the machine hit under it rather than a chord', () => {

        expect(THEME.some((note) => note.timbre === 'kick')).toBe(true);

    });

});

describe('the soundtrack', () => {

    it('lays down a bar wherever it is asked, however far in', () => {

        for (const bar of [ 0, 1, 7, 8, 15, 16, 99, 1000 ])
        {
            expect(barNotes(bar).length, `bar ${bar}`).toBeGreaterThan(0);
        }

    });

    it('comes round again rather than running out', () => {

        expect(barNotes(LOOP_BARS)).toEqual(barNotes(0));
        expect(barNotes((LOOP_BARS * 3) + 5)).toEqual(barNotes(5));

    });

    //  The answer to "it is still a bit repetitive". Four bars comes round
    //  every seven seconds and the ear has it memorised inside one level.
    it('takes half a minute to come round', () => {

        const barSeconds = (60 / MUSIC_BPM) * MUSIC_BEATS_PER_BAR;

        expect(LOOP_BARS * barSeconds).toBeGreaterThan(25);

    });

    //  Two halves rather than one loop played four times: the second eight
    //  bars are the same shapes lifted into the relative major.
    it('is written in two halves that are not the same', () => {

        for (let bar = 0; bar < 8; bar++)
        {
            const minor = barNotes(bar).filter((note) => note.timbre === 'lead');
            const major = barNotes(bar + 8).filter((note) => note.timbre === 'lead');

            expect(major.map((note) => note.semitones), `bar ${bar}`)
                .not.toEqual(minor.map((note) => note.semitones));
        }

    });

    it('lifts the second half rather than only moving it', () => {

        const average = (from: number, to: number) => {

            const notes = [];

            for (let bar = from; bar < to; bar++)
            {
                notes.push(...barNotes(bar).filter((note) => note.timbre === 'lead'));
            }

            return notes.reduce((sum, note) => sum + note.semitones, 0) / notes.length;
        };

        expect(average(8, 16)).toBeGreaterThan(average(0, 8));

    });

    //  A drum kit is what an ear counts bars with, and a fill is the full stop
    //  at the end of a sentence. Without one, eight bars is one long bar.
    it('fills at the end of every eighth bar and nowhere else', () => {

        const snares = (bar: number) => barNotes(bar).filter((note) => note.timbre === 'snare').length;

        expect(snares(7), 'the eighth bar').toBeGreaterThan(snares(6));
        expect(snares(15), 'and the sixteenth').toBeGreaterThan(snares(14));
        expect(snares(0)).toBe(snares(6));

    });

    it('keeps a beat under everything', () => {

        for (let bar = 0; bar < LOOP_BARS; bar++)
        {
            const kit = barNotes(bar).filter((note) => note.timbre === 'kick' || note.timbre === 'hat');

            expect(kit.length, `bar ${bar}`).toBeGreaterThan(4);
        }

    });

    it('keeps every note inside the bar it belongs to', () => {

        for (const note of wholeLoop())
        {
            expect(note.beat).toBeGreaterThanOrEqual(0);
            expect(note.beat).toBeLessThan(MUSIC_BEATS_PER_BAR);
        }

    });

    //  Nothing rings past the note after it: this instrument has no sustain to
    //  speak of, and that is exactly why a busy stretch cannot turn to mud.
    it('never holds a note into the one that follows it', () => {

        const beat = 60 / MUSIC_BPM;

        for (const note of wholeLoop())
        {
            expect(decayOf(note.semitones, note.timbre), `${note.timbre}`).toBeLessThan(beat);
        }

    });

    it('stays under the sounds of the game itself', () => {

        const loudest = Math.max(...wholeLoop().map((note) => note.gain));

        expect(loudest * MUSIC_GAIN).toBeLessThan(voiceFor('orb')[0].gain);

    });

    //  The tune, against the one note the player's own playing makes.
    //
    //  Only the tune: the bass is more than an octave below the tick and it is
    //  *meant* to walk down chromatically past it - that descending line is the
    //  one thing the three records this was built from have in common, and a
    //  semitone between a low bass note and a high one is how all three of them
    //  sound. Up where the tick lives, a semitone would just be wrong.
    it('never puts a tune note a semitone from the tick', () => {

        const tick = ((voiceFor('orb')[0].semitones % 12) + 12) % 12;

        for (const note of wholeLoop())
        {
            if (note.timbre !== 'lead') { continue; }

            const apart = Math.abs((((note.semitones % 12) + 12) % 12) - tick) % 12;

            expect(apart === 1 || apart === 11, `${note.semitones} against the tick`).toBe(false);
        }

    });

    //  And the bass stays down where that is allowed to be true.
    it('keeps the bass an octave and more below the tick', () => {

        const tick = voiceFor('orb')[0].semitones;

        for (const note of wholeLoop())
        {
            if (note.timbre !== 'bass') { continue; }

            expect(tick - note.semitones, `${note.semitones}`).toBeGreaterThanOrEqual(12);
        }

    });

});

describe('the last ten seconds of a level', () => {

    it('changes nothing at all until the finish is in range', () => {

        for (let bar = 0; bar < LOOP_BARS; bar++)
        {
            expect(barNotes(bar, 0), `bar ${bar}`).toEqual(barNotes(bar));
        }

    });

    //  The drummer is the one who says a thing is ending: twice the hats, and
    //  a fill in every bar rather than every eighth.
    it('doubles the hats and fills every bar', () => {

        const hats = (finale: number) => barNotes(0, finale).filter((note) => note.timbre === 'hat').length;
        const snares = (finale: number) => barNotes(0, finale).filter((note) => note.timbre === 'snare').length;

        expect(hats(1)).toBe(hats(0) * 2);
        expect(snares(1)).toBeGreaterThan(snares(0));

    });

    it('lifts the music without letting it take over', () => {

        const loudest = (finale: number) => Math.max(...barNotes(0, finale).map((note) => note.gain));

        expect(loudest(1)).toBeCloseTo(loudest(0) * (1 + FINALE_LIFT), 5);
        expect(loudest(1) * MUSIC_GAIN, 'still under the game itself')
            .toBeLessThan(voiceFor('orb')[0].gain);

    });

    it('stays inside its own bar however big it gets', () => {

        for (let bar = 0; bar < LOOP_BARS; bar++)
        {
            for (const note of barNotes(bar, 1))
            {
                expect(note.beat, `bar ${bar}`).toBeGreaterThanOrEqual(0);
                expect(note.beat, `bar ${bar}`).toBeLessThan(MUSIC_BEATS_PER_BAR);
            }
        }

    });

});

describe('how the soundtrack is handed to the clock', () => {

    //  Music written a frame at a time limps: a busy frame puts a note late and
    //  the tune never recovers. It is written ahead instead, which only works
    //  if the timer that tops it up cannot fall behind what has been written.
    it('tops itself up several times over before it runs dry', () => {

        expect(MUSIC_LOOKAHEAD * 1000).toBeGreaterThan(MUSIC_TICK_MS * 3);

    });

    it('wakes up many times inside a single bar', () => {

        const barSeconds = (60 / MUSIC_BPM) * MUSIC_BEATS_PER_BAR;

        expect(MUSIC_TICK_MS / 1000).toBeLessThan(barSeconds / 4);

    });

    //  An arcade cabinet does not play at sixty beats a minute.
    it('runs at a tempo an arcade game would run at', () => {

        expect(MUSIC_BPM).toBeGreaterThanOrEqual(110);
        expect(MUSIC_BPM).toBeLessThanOrEqual(150);

    });

});
