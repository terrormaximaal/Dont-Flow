import { describe, expect, it } from 'vitest';
import {
    FINALE_LIFT,
    MUSIC_BEATS_PER_BAR,
    MUSIC_BPM,
    MUSIC_GAIN,
    MUSIC_LOOKAHEAD,
    MUSIC_SELECT_GAIN,
    MUSIC_TICK_MS
} from '../src/game/config/constants';
import { voiceFor } from '../src/game/config/audio';
import { barNotes, LOOP_BARS } from '../src/game/config/music';
import { selectBar, SELECT_BARS, THEME } from '../src/game/config/musicMenu';
import { BACKING_BARS, CHORUS_FROM, CHORUS_TO } from '../src/game/config/score';
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

        expect(tune().length, 'notes').toBeGreaterThanOrEqual(5);
        expect(last.at, 'seconds').toBeLessThan(2.5);

    });

    //  The title is not a separate piece of music: it is the written opening
    //  call of the soundtrack, note for note, with the waiting taken out. What
    //  is written is one note held six beats and then four walking up to the
    //  answer, which on a title screen is four seconds of nothing.
    it('is the opening call of the tune, in the order it was written', () => {

        const written = [];

        for (let bar = 0; written.length < 5; bar++)
        {
            written.push(...barNotes(bar)
                .filter((note) => note.timbre === 'lead')
                .sort((a, b) => a.beat - b.beat)
                .map((note) => note.semitones));
        }

        expect(tune().map((note) => note.semitones)).toEqual(written.slice(0, 5));

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
    it('takes the best part of a minute to come round', () => {

        const barSeconds = (60 / MUSIC_BPM) * MUSIC_BEATS_PER_BAR;

        expect(LOOP_BARS * barSeconds).toBeGreaterThan(45);

    });

    //  The tune is twice as long as the chords under it, which is the cheapest
    //  trick in music for the money: the same eight bars of backing land under
    //  a different phrase the second time round and stop sounding like a loop.
    it('runs the tune over two turns of the backing', () => {

        expect(LOOP_BARS).toBe(BACKING_BARS * 2);

        const first = barNotes(0).filter((note) => note.timbre !== 'lead');
        const second = barNotes(BACKING_BARS).filter((note) => note.timbre !== 'lead');

        expect(second, 'the same backing').toEqual(first);

        expect(
            barNotes(BACKING_BARS).filter((note) => note.timbre === 'lead'),
            'a different tune over it'
        ).not.toEqual(barNotes(0).filter((note) => note.timbre === 'lead'));

    });

    //  A verse low down and a chorus an octave over it. Without that the tune
    //  is one long paragraph, which is what a level of this length cannot use.
    it('lifts the second half rather than only moving it', () => {

        const average = (from: number, to: number) => {

            const notes = [];

            for (let bar = from; bar < to; bar++)
            {
                notes.push(...barNotes(bar).filter((note) => note.timbre === 'lead'));
            }

            return notes.reduce((sum, note) => sum + note.semitones, 0) / notes.length;
        };

        expect(average(CHORUS_FROM, CHORUS_TO), 'the chorus').toBeGreaterThan(average(0, CHORUS_FROM));
        expect(average(CHORUS_TO, LOOP_BARS), 'and back down after it').toBeLessThan(average(CHORUS_FROM, CHORUS_TO));

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

    //  Nothing under the tune rings past the note after it. That is why a busy
    //  stretch cannot turn to mud: eight chord notes to the bar with a tail on
    //  each is the wash this game had once and does not have now.
    it('never holds anything but the tune into the note that follows it', () => {

        const beat = 60 / MUSIC_BPM;

        //  Per voice, because they do not all move at the same speed: the
        //  chords run on the eighths and the bass only on the first and third
        //  beat, so one rule for both would either be no rule or the wrong one.
        for (const timbre of [ 'bass', 'chord', 'kick', 'snare', 'hat' ] as const)
        {
            const beats = [];

            for (let bar = 0; bar < LOOP_BARS; bar++)
            {
                for (const note of barNotes(bar, 1))
                {
                    if (note.timbre === timbre) { beats.push((bar * MUSIC_BEATS_PER_BAR) + note.beat); }
                }
            }

            const times = [ ...new Set(beats) ].sort((a, b) => a - b);
            const gaps = times.slice(1).map((at, i) => (at - times[i]) * beat);

            expect(decayOf(0, timbre), timbre).toBeLessThan(Math.min(...gaps));
        }

    });

    //  The tune does hold - it was written with notes six beats long and a tune
    //  that lets go of them is a different tune. What it may not do is still be
    //  sounding a bar later, which on a square wave is not a held note but a
    //  test tone.
    it('lets the tune hold its long notes, but never past its own bar', () => {

        const barSeconds = (60 / MUSIC_BPM) * MUSIC_BEATS_PER_BAR;
        const leads = wholeLoop().filter((note) => note.timbre === 'lead');
        const rings = leads.map((note) => decayOf(note.semitones, 'lead', (note.held ?? 0) * (60 / MUSIC_BPM)));

        expect(Math.max(...rings), 'the longest').toBeLessThan(barSeconds);
        expect(Math.max(...rings), 'and still a held note').toBeGreaterThan(0.5);

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

describe('the music on the level select', () => {

    it('comes round on its own eight bars', () => {

        expect(selectBar(SELECT_BARS)).toEqual(selectBar(0));
        expect(selectBar((SELECT_BARS * 4) + 3)).toEqual(selectBar(3));

    });

    //  Nobody is playing on that screen. A beat there is a screen telling
    //  somebody reading a map of twenty levels to hurry up.
    it('has neither drums nor a tune, only the chords', () => {

        for (let bar = 0; bar < SELECT_BARS; bar++)
        {
            for (const note of selectBar(bar))
            {
                expect(note.timbre, `bar ${bar}`).toBe('chord');
            }
        }

    });

    it('keeps moving without anything happening', () => {

        for (let bar = 0; bar < SELECT_BARS; bar++)
        {
            const beats = new Set(selectBar(bar).map((note) => note.beat));

            expect(beats.size, `bar ${bar}`).toBe(8);
        }

    });

    it('stays quieter than the game it is a menu for', () => {

        const loudest = Math.max(...selectBar(0).map((note) => note.gain));

        expect(loudest * MUSIC_SELECT_GAIN).toBeLessThan(voiceFor('orb')[0].gain);

    });

});

describe('the two jingles', () => {

    //  They are one shape played twice, once up and once down, so the game
    //  only has to say which of the two happened.
    it('are the same length and start on the same note', () => {

        const tune = (cue: 'finish' | 'fail') => voiceFor(cue).filter((note) => note.timbre === 'lead');

        expect(tune('finish')).toHaveLength(tune('fail').length);
        expect(tune('finish')[0].semitones).toBe(tune('fail')[0].semitones);

    });

    it('one goes up and the other comes down', () => {

        const end = (cue: 'finish' | 'fail') => {

            const tune = voiceFor(cue).filter((note) => note.timbre === 'lead');

            return tune[tune.length - 1].semitones - tune[0].semitones;
        };

        expect(end('finish'), 'finishing').toBeGreaterThan(0);
        expect(end('fail'), 'not finishing').toBeLessThan(0);

    });

    it('grows towards its last note rather than away from it', () => {

        for (const cue of [ 'finish', 'fail' ] as const)
        {
            const tune = voiceFor(cue).filter((note) => note.timbre === 'lead');

            expect(tune[tune.length - 1].gain, cue).toBeGreaterThan(tune[0].gain);
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
