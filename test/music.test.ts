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
import { MENU_BARS, selectBar, SELECT_BARS, THEME } from '../src/game/config/musicMenu';
import { BACKING_BARS, CHORUS_FROM, CHORUS_TO } from '../src/game/config/score';
import { decayOf } from '../src/game/systems/voice';

/** Every note the run's music plays in one time round its loop. */
function wholeLoop (finale = 0)
{
    const notes = [];

    for (let bar = 0; bar < LOOP_BARS; bar++)
    {
        notes.push(...barNotes(bar, finale));
    }

    return notes;
}

/** And every note of the menu's, which is where the tune went. */
function wholeMenu ()
{
    const notes = [];

    for (let bar = 0; bar < MENU_BARS; bar++)
    {
        notes.push(...selectBar(bar));
    }

    return notes;
}

/** The tune of one menu bar, in the order it is played. */
function tuneOf (bar: number)
{
    return selectBar(bar)
        .filter((note) => note.timbre === 'lead')
        .sort((a, b) => a.beat - b.beat);
}

describe('the theme', () => {

    const tune = () => THEME.filter((note) => note.timbre === 'lead');

    it('is short enough to be a title and long enough to be a phrase', () => {

        const last = THEME[THEME.length - 1];

        expect(tune().length, 'notes').toBeGreaterThanOrEqual(5);
        expect(last.at, 'seconds').toBeLessThan(2.5);

    });

    //  The title is not a separate piece of music: it is the written opening
    //  call of the tune, note for note, with the waiting taken out. What is
    //  written is one note held six beats and then four walking up to the
    //  answer, which on a title screen is four seconds of nothing.
    it('is the opening call of the tune, in the order it was written', () => {

        const written = [];

        for (let bar = 0; written.length < 5; bar++)
        {
            written.push(...tuneOf(bar).map((note) => note.semitones));
        }

        expect(tune().map((note) => note.semitones)).toEqual(written.slice(0, 5));

    });

    it('has the machine hit under it rather than a chord', () => {

        expect(THEME.some((note) => note.timbre === 'kick')).toBe(true);

    });

});

describe('the music under a run', () => {

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

    //  The rule this whole arrangement turns on. A melody is a thing an ear
    //  follows from note to note, and a player reading a road at a hundred and
    //  fifty has no attention spare to follow anything - so under a run there
    //  is harmony, which is taken in without being listened to, and a beat.
    it('has no tune in it at all', () => {

        expect(wholeLoop().filter((note) => note.timbre === 'lead')).toHaveLength(0);
        expect(wholeLoop(1).filter((note) => note.timbre === 'lead')).toHaveLength(0);

    });

    it('is the written backing, all of it, and nothing shorter', () => {

        expect(LOOP_BARS).toBe(BACKING_BARS);

        //  Sixteen bars rather than the four the chords turn on: what stops it
        //  being heard as four is the top voice, which moves.
        const tops = [];

        for (let bar = 0; bar < LOOP_BARS; bar++)
        {
            const chords = barNotes(bar).filter((note) => note.timbre === 'chord');

            tops.push(Math.max(...chords.map((note) => note.semitones)));
        }

        expect(new Set(tops).size, 'different top notes').toBeGreaterThan(2);

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

    //  Nothing rings past the note after it. That is why a busy stretch cannot
    //  turn to mud: eight chord notes to the bar with a tail on each is the
    //  wash this game had once and does not have now.
    it('never holds a note into the one that follows it', () => {

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

    it('stays under the sounds of the game itself', () => {

        const loudest = Math.max(...wholeLoop().map((note) => note.gain));

        expect(loudest * MUSIC_GAIN).toBeLessThan(voiceFor('orb')[0].gain);

    });

    //  The bass is more than an octave below the tick and it is *meant* to walk
    //  down past it - that descending line is the whole shape of the piece, and
    //  a semitone between a low bass note and a high one is how it is written.
    //  Up where the tick lives, a semitone would just be wrong.
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

    it('comes round on the length of the tune, not the chords', () => {

        expect(MENU_BARS).toBe(SELECT_BARS * 4);
        expect(selectBar(MENU_BARS)).toEqual(selectBar(0));
        expect(selectBar((MENU_BARS * 2) + 3)).toEqual(selectBar(3));

    });

    //  Half a minute before anything comes back in the same place, which is
    //  longer than most people spend choosing a level.
    it('takes the best part of a minute to come round', () => {

        const barSeconds = (60 / MUSIC_BPM) * MUSIC_BEATS_PER_BAR;

        expect(MENU_BARS * barSeconds).toBeGreaterThan(45);

    });

    //  This is where the tune went, and the reason menu music exists: there is
    //  nothing to do on that screen but choose, and something to listen to
    //  while choosing is the point.
    it('is where the tune is', () => {

        expect(wholeMenu().filter((note) => note.timbre === 'lead').length).toBeGreaterThan(50);

    });

    //  Nobody is playing on that screen. A beat there is a screen telling
    //  somebody reading a map of twenty levels to hurry up.
    it('has chords and a tune, and no drums', () => {

        for (const note of wholeMenu())
        {
            expect(note.timbre === 'chord' || note.timbre === 'lead', `${note.timbre}`).toBe(true);
        }

    });

    it('keeps the chords moving under it without anything happening', () => {

        for (let bar = 0; bar < MENU_BARS; bar++)
        {
            const beats = new Set(selectBar(bar).filter((n) => n.timbre === 'chord').map((n) => n.beat));

            expect(beats.size, `bar ${bar}`).toBe(8);
        }

    });

    //  The same eight bars of chords land under a different phrase each time
    //  round, which is what stops thirty-two bars sounding like eight.
    it('lands a different phrase on the same chords each time round', () => {

        for (let bar = 0; bar < SELECT_BARS; bar++)
        {
            const chords = (at: number) => selectBar(at).filter((n) => n.timbre === 'chord');

            expect(chords(bar + SELECT_BARS), `bar ${bar} chords`).toEqual(chords(bar));

            expect(
                tuneOf(bar + SELECT_BARS).map((n) => n.semitones),
                `bar ${bar} tune`
            ).not.toEqual(tuneOf(bar).map((n) => n.semitones));
        }

    });

    //  A verse low down and a chorus an octave over it. Without that the tune
    //  is one long paragraph.
    it('lifts into a chorus and comes back down after it', () => {

        const average = (from: number, to: number) => {

            const notes = [];

            for (let bar = from; bar < to; bar++) { notes.push(...tuneOf(bar)); }

            return notes.reduce((sum, note) => sum + note.semitones, 0) / notes.length;
        };

        expect(average(CHORUS_FROM, CHORUS_TO), 'the chorus').toBeGreaterThan(average(0, CHORUS_FROM));
        expect(average(CHORUS_TO, MENU_BARS), 'and back down').toBeLessThan(average(CHORUS_FROM, CHORUS_TO));

    });

    //  The tune does hold - it was written with notes six beats long and a tune
    //  that lets go of them is a different tune. What it may not do is still be
    //  sounding a bar later, which on one oscillator is not a held note but a
    //  test tone.
    it('lets the tune hold its long notes, but never past its own bar', () => {

        const barSeconds = (60 / MUSIC_BPM) * MUSIC_BEATS_PER_BAR;
        const beat = 60 / MUSIC_BPM;
        const rings = wholeMenu()
            .filter((note) => note.timbre === 'lead')
            .map((note) => decayOf(note.semitones, 'lead', (note.held ?? 0) * beat));

        expect(Math.max(...rings), 'the longest').toBeLessThan(barSeconds);
        expect(Math.max(...rings), 'and still a held note').toBeGreaterThan(0.5);

    });

    it('stays quieter than the game it is a menu for', () => {

        const loudest = Math.max(...wholeMenu().map((note) => note.gain));

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

    //  A rainbow is the one moment in a run worth a phrase rather than a
    //  sound, and it is the only place the tune appears while anybody is
    //  playing.
    it('lend a rainbow their opening, stopped before it settles', () => {

        const win = voiceFor('finish').filter((note) => note.timbre === 'lead');
        const bonus = voiceFor('rainbow');

        expect(bonus.length, 'shorter than the whole thing').toBeLessThan(win.length);
        expect(bonus.map((note) => note.semitones))
            .toEqual(win.slice(0, bonus.length).map((note) => note.semitones));

        //  Unfinished: it stops above where it started, rather than on the note
        //  the full phrase settles onto. A cadence mid-run says the run is over.
        expect(bonus[bonus.length - 1].semitones).toBeGreaterThan(bonus[0].semitones);
        expect(bonus[bonus.length - 1].semitones).not.toBe(win[win.length - 1].semitones);

    });

    it('are quieter mid-run than they are at the end of one', () => {

        const loudest = (cue: 'finish' | 'rainbow') => Math.max(
            ...voiceFor(cue).filter((note) => note.timbre === 'lead').map((note) => note.gain)
        );

        expect(loudest('rainbow')).toBeLessThan(loudest('finish'));

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
