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
import { barNotes, beatsOf, LOOP_BARS, THEME } from '../src/game/config/music';
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

    /** The tune itself, without the bass laid under it. */
    const melody = () => THEME.filter((note) => note.timbre === undefined);

    it('is long enough to be a tune and short enough to sit through', () => {

        const last = melody()[melody().length - 1];

        expect(melody().length, 'notes').toBeGreaterThanOrEqual(8);
        expect(last.at, 'seconds').toBeGreaterThan(1.5);
        expect(last.at, 'seconds').toBeLessThan(4);

    });

    it('is played in order, with no two notes on the same moment', () => {

        const notes = melody();

        for (let i = 1; i < notes.length; i++)
        {
            expect(notes[i].at, `note ${i}`).toBeGreaterThan(notes[i - 1].at);
        }

    });

    //  An arch: away from the root, and back to it. A tune that ends somewhere
    //  other than where it started is a fragment, and a fragment is the thing
    //  nobody can hum back.
    it('leaves the root, climbs, and is left hanging on the fifth', () => {

        const notes = melody();
        const top = Math.max(...notes.map((note) => note.semitones));
        const home = notes[0].semitones;
        const last = notes[notes.length - 1].semitones;

        //  In the game's own key rather than in one of its own, which is what
        //  keeps it consonant with everything the player triggers over it.
        expect(home, 'starts where a streak starts').toBe(ORB_BASE_SEMITONES);
        expect(top - home, 'goes somewhere on the way').toBeGreaterThanOrEqual(12);

        //  And does not come home. A tune that resolves says the story is
        //  over, and this one plays before the player has started.
        expect(last - home, 'ends on the fifth').toBe(7);

    });

    it('ends on its loudest note, so it lands rather than trails off', () => {

        const notes = melody();
        const loudest = Math.max(...notes.map((note) => note.gain));

        expect(notes[notes.length - 1].gain).toBe(loudest);

    });

    //  The title screen is where the player learns it, so those have to be the
    //  same tune rather than two things that sound similar.
    it('is what the title plays', () => {

        expect(voiceFor('title')).toEqual(THEME);

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

    //  Water that has stopped before the next bar starts leaves a hole in the
    //  backing, and a hole is heard as the music stopping. Something that
    //  outlasts the next bar by a long way is two of them sounding at once,
    //  which is the other way of being muddy.
    it('holds each chord just past the bar it belongs to', () => {

        const barSeconds = (60 / MUSIC_BPM) * MUSIC_BEATS_PER_BAR;

        for (const note of barNotes(0))
        {
            const ring = decayOf(note.semitones, note.timbre) + (note.beat * (60 / MUSIC_BPM));

            //  Something has to still be sounding when the next bar arrives, or
            //  the backing has a hole in it - and nothing may outlast the bar
            //  after that, or two harmonies sound at once.
            expect(ring, `${note.timbre}`).toBeLessThan(barSeconds * 2);
        }

        const longest = Math.max(...barNotes(0).map((note) => decayOf(note.semitones, note.timbre)));

        expect(longest, 'reaches the next bar').toBeGreaterThan(barSeconds);

    });

    //  Nothing under a run has a rhythm of its own. The backing used to pluck
    //  its way across the bar and quote the theme every eight of them, and
    //  underneath a game that already makes a sound every time an orb goes
    //  past, that was the mess: two things playing patterns at each other.
    it('is a chord rather than a part being played', () => {

        for (let bar = 0; bar < LOOP_BARS; bar++)
        {
            for (const note of barNotes(bar))
            {
                //  Never the sound the player triggers, and never off the beat
                //  it belongs to: the backing has a downbeat and a halfway
                //  point and nothing else.
                expect(note.timbre, `bar ${bar}`).not.toBe(undefined);
                expect(note.timbre, `bar ${bar}`).not.toBe('pluck');
                expect(note.beat % (MUSIC_BEATS_PER_BAR / 2), `bar ${bar}`).toBeLessThan(0.25);
            }
        }

    });

    it('keeps the hook at the speed the theme is played at', () => {

        expect(beatsOf(60 / MUSIC_BPM)).toBeCloseTo(1);
        expect(beatsOf(0)).toBe(0);

    });

});

describe('the last ten seconds of a level', () => {

    /** Every note a bar carries, at a given point in the run-in. */
    const notesIn = (bar: number, finale: number) => barNotes(bar, finale);

    it('changes nothing at all until the finish is in range', () => {

        for (let bar = 0; bar < LOOP_BARS; bar++)
        {
            expect(notesIn(bar, 0), `bar ${bar}`).toEqual(barNotes(bar));
        }

    });

    //  The whole idea: the progression moves at twice the speed. Doubling the
    //  harmonic rhythm is how music has said "this is the end of it" since
    //  long before anybody wrote it down.
    it('changes chord twice a bar rather than once', () => {

        for (let bar = 0; bar < LOOP_BARS; bar++)
        {
            const roots = new Set(notesIn(bar, 1).filter((note) => note.timbre === 'bass')
                .map((note) => note.semitones));

            expect(roots.size, `bar ${bar}`).toBe(2);
            expect(new Set(barNotes(bar).filter((note) => note.timbre === 'bass')
                .map((note) => note.semitones)).size, `bar ${bar} before`).toBe(1);
        }

    });

    it('puts more in the bar the closer the line gets', () => {

        let last = barNotes(0).length;

        for (const finale of [ 0.25, 0.5, 0.75, 1 ])
        {
            const now = notesIn(0, finale).length;

            expect(now, `at ${finale}`).toBeGreaterThanOrEqual(last);

            last = now;
        }

        expect(notesIn(0, 1).length).toBeGreaterThan(barNotes(0).length);

    });

    it('lifts the backing without letting it take over', () => {

        const loudest = (finale: number) => Math.max(...notesIn(0, finale).map((note) => note.gain));

        expect(loudest(1)).toBeGreaterThan(loudest(0));
        expect(loudest(1) * MUSIC_GAIN, 'still under the game itself')
            .toBeLessThan(voiceFor('orb')[0].gain);

    });

    //  The rule that lets the backing run under the game at all has to survive
    //  the one moment the backing gets bigger - which is exactly the moment a
    //  player is most likely to be holding a long streak.
    it('never grows a note a semitone from one the player can play', () => {

        const reachable = new Set<number>();

        for (let combo = 0; combo < 40; combo++)
        {
            reachable.add(((semitonesFor(combo) % 12) + 12) % 12);
        }

        for (let bar = 0; bar < LOOP_BARS; bar++)
        {
            for (const note of notesIn(bar, 1))
            {
                const pitch = ((note.semitones % 12) + 12) % 12;

                for (const played of reachable)
                {
                    const apart = Math.abs(pitch - played) % 12;

                    expect(apart === 1 || apart === 11, `${note.semitones} against ${played}`).toBe(false);
                }
            }
        }

    });

    it('stays inside its own bar however big it gets', () => {

        for (let bar = 0; bar < LOOP_BARS; bar++)
        {
            for (const note of notesIn(bar, 1))
            {
                expect(note.beat, `bar ${bar}`).toBeGreaterThanOrEqual(0);
                expect(note.beat, `bar ${bar}`).toBeLessThan(MUSIC_BEATS_PER_BAR);
            }
        }

    });

    //  A run-in that arrived in one step would be a switch being thrown. It has
    //  to be something the player notices without being able to say when it
    //  started.
    it('arrives in steps rather than in one', () => {

        const sizes = [ 0, 0.2, 0.4, 0.6, 0.8, 1 ].map((finale) => notesIn(0, finale).length);
        const jumps = new Set(sizes);

        expect(jumps.size, 'distinct sizes on the way in').toBeGreaterThan(2);

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
