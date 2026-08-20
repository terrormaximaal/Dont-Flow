import { describe, expect, it } from 'vitest';
import {
    FINALE_LIFT,
    MUSIC_BEATS_PER_BAR,
    MUSIC_BPM,
    MUSIC_GAIN,
    MUSIC_LOOKAHEAD,
    MENU_TUNE_CEILING,
    MUSIC_SELECT_GAIN,
    MUSIC_TICK_MS
} from '../src/game/config/constants';
import { voiceFor } from '../src/game/config/audio';
import { JINGLE_LIFT } from '../src/game/config/constants';
import { barNotes, LOOP_BARS } from '../src/game/config/music';
import { MENU_BARS, selectBar, SELECT_BARS } from '../src/game/config/musicMenu';
import { BACKING_BARS, CHORUS_FROM, CHORUS_TO, TOPLINE } from '../src/game/config/score';
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
        .filter((note) => note.timbre === 'pluck')
        .sort((a, b) => a.beat - b.beat);
}

//  The melody alone, out of a phrase that several voices are playing at once.
//
//  By loudness rather than by pitch. The section around the tune reaches above
//  it as well as below - an octave over is how the last notes open out - so the
//  top voice is not the tune, but the loudest one always is: every other voice
//  is written as a fraction of it.
function loudestAt<T extends { semitones: number; gain: number; at?: number; beat?: number }> (notes: T[]): T[]
{
    const best = new Map<number, T>();

    for (const note of notes)
    {
        const when = note.at ?? note.beat ?? 0;
        const held = best.get(when);

        if (held === undefined || held.gain < note.gain) { best.set(when, note); }
    }

    return [ ...best.entries() ].sort((a, b) => a[0] - b[0]).map(([ , note ]) => note);
}

describe('how the menus announce the game', () => {

    //  There was a separate title sting for a while. It played the same five
    //  notes as the first bars of the menu music, so the announcement and the
    //  music were two things saying the same thing over each other. The menu
    //  music starting on the tune's opening call is the announcement now.
    it('opens on the written opening call of the tune', () => {

        const written = [];

        for (let bar = 0; written.length < 5; bar++)
        {
            written.push(...tuneOf(bar).map((note) => note.semitones));
        }

        expect(written.slice(0, 5)).toEqual([ 0, 2, 3, 5, 7 ]);

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

        expect(wholeMenu().filter((note) => note.timbre === 'pluck').length).toBeGreaterThan(50);

    });

    //  Nobody is playing on that screen. A beat there is a screen telling
    //  somebody reading a map of twenty levels to hurry up.
    it('has chords and a plucked tune, and no drums', () => {

        const voices = new Set(wholeMenu().map((note) => note.timbre));

        expect([ ...voices ].sort()).toEqual([ 'chord', 'pluck' ]);

    });

    //  Struck and left to ring, rather than blown and held. A held melody over
    //  a moving chord figure is two things asking to be followed at once; a
    //  bell has no sustain to argue with what is underneath it.
    it('plays the tune on the bell rather than the wind', () => {

        expect(wholeMenu().filter((note) => note.timbre === 'lead')).toHaveLength(0);
        expect(wholeMenu().filter((note) => note.timbre === 'pluck').length).toBeGreaterThan(50);

    });

    //  Asked for by ear: the written tune climbs an octave and a half above
    //  the verse, which put the chorus up where a phone speaker is at its most
    //  piercing. Folding it back leaves the shape and lowers the register.
    it('keeps the tune inside one register', () => {

        const notes = wholeMenu().filter((note) => note.timbre === 'pluck');
        const written = Math.max(...TOPLINE.flat().map(([ , semitones ]) => semitones));

        expect(Math.max(...notes.map((n) => n.semitones)), 'lower than written').toBeLessThan(written);
        expect(Math.max(...notes.map((n) => n.semitones))).toBeLessThanOrEqual(MENU_TUNE_CEILING);

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
    //  A bell rings for as long as a bell rings, however long the note was
    //  written - but it has to be gone before the bar is, or thirty-two of
    //  them a minute would pile into each other.
    it('lets the bell ring, but never past its own bar', () => {

        const barSeconds = (60 / MUSIC_BPM) * MUSIC_BEATS_PER_BAR;
        const ring = decayOf(0, 'pluck');

        expect(ring, 'gone before the bar is').toBeLessThan(barSeconds);
        expect(ring, 'and long enough to be a bell').toBeGreaterThan(0.5);

    });

    //  Bringing the tune down into one register may move a bar. It may never
    //  change the bar's *shape* - the steps between its notes are what makes it
    //  that phrase and not another one.
    //
    //  This is not hypothetical. The rule ran per note, and exactly one bar in
    //  the thirty-two crosses the ceiling on its way down: the last bar of the
    //  chorus, written 22, 17, 14. The first two dropped an octave and the third
    //  did not, so a line falling by a fourth and a third came out falling a
    //  fourth and then leaping up a sixth - to the highest note anywhere near
    //  it. It was heard, and reported, as one note sticking out of the tune.
    it('keeps every bar of the written shape, wherever it puts it', () => {

        const steps = (notes: number[]) => notes.slice(1).map((s, i) => s - notes[i]);

        for (let bar = 0; bar < MENU_BARS; bar++)
        {
            const written = TOPLINE[bar].map(([ , semitones ]) => semitones);
            const sounded = tuneOf(bar).map((note) => note.semitones);

            expect(steps(sounded), `bar ${bar} keeps its shape`).toEqual(steps(written));
        }

    });

    it('stays quieter than the game it is a menu for', () => {

        const loudest = Math.max(...wholeMenu().map((note) => note.gain));

        expect(loudest * MUSIC_SELECT_GAIN).toBeLessThan(voiceFor('orb')[0].gain);

    });

});

describe('the two jingles', () => {

    /** The melody alone: the top voice, since a jingle is now three of them. */
    /** Everything in a jingle that carries a pitch, whichever voice plays it. */
    //  The instruments that carry a pitch. Written out rather than inferred, so
    //  adding a voice to the phrase has to be a deliberate edit here too.
    const PITCHED = new Set([ 'lead', 'pluck', 'kalimba' ]);

    const sung = (cue: 'finish' | 'fail' | 'rainbow') =>
        voiceFor(cue).filter((note) => PITCHED.has(note.timbre ?? ''));

    const melody = (cue: 'finish' | 'fail' | 'rainbow') => loudestAt(sung(cue));

    /** How many voices are sounding at the moment of the nth note of the tune. */
    const voicesOn = (cue: 'finish' | 'fail', n: number) => {

        const tune = melody(cue);
        const when = tune[n < 0 ? tune.length + n : n].at;

        return sung(cue).filter((note) => note.at === when).length;
    };

    //  A section rather than a soloist, and one that opens out. One instrument
    //  playing this is a signal; three in parallel is an ending; a fourth
    //  arriving an octave over the top is that ending lifting.
    it('are played by a section that widens towards the last note', () => {

        for (const cue of [ 'finish', 'fail' ] as const)
        {
            expect(voicesOn(cue, 0), `${cue} at the start`).toBe(3);
            expect(voicesOn(cue, -1), `${cue} at the end`).toBe(4);
        }

    });

    it('put every voice of them in the key', () => {

        //  G minor: the notes of the scale, as semitones from the root.
        const scale = new Set([ 0, 2, 3, 5, 7, 8, 10 ]);

        for (const cue of [ 'finish', 'fail' ] as const)
        {
            for (const note of voiceFor(cue))
            {
                if (note.timbre !== 'lead') { continue; }

                expect(scale.has((((note.semitones % 12) + 12) % 12)), `${note.semitones} in ${cue}`).toBe(true);
            }
        }

    });

    //  They are one shape played twice, once up and once down, so the game
    //  only has to say which of the two happened.
    it('are the same length and start on the same note', () => {

        expect(melody('finish')).toHaveLength(melody('fail').length);
        expect(melody('finish')[0].semitones).toBe(melody('fail')[0].semitones);

    });

    it('one goes up and the other comes down', () => {

        const end = (cue: 'finish' | 'fail') => {

            const tune = melody(cue);

            return tune[tune.length - 1].semitones - tune[0].semitones;
        };

        expect(end('finish'), 'finishing').toBeGreaterThan(0);
        expect(end('fail'), 'not finishing').toBeLessThan(0);

    });

    //  One struck wooden bar, on every line. Chosen from ten worked up side by
    //  side, and the driest of them.
    //
    //  A wind held the body of this once and it was described as sombre - the
    //  holding is what did it: a note that stays, under notes that are struck,
    //  reads as weight. Nothing here stays.
    it('is played on struck wood, with nothing held under it', () => {

        for (const cue of [ 'finish', 'fail' ] as const)
        {
            const kinds = new Set(sung(cue).map((note) => note.timbre));

            expect(kinds.has('lead'), `${cue} has a held voice in it`).toBe(false);
            expect([ ...kinds ], `${cue} is played on one instrument`).toEqual([ 'kalimba' ]);
        }

    });

    //  The body sits an octave under the tune. Height is what makes a struck
    //  note bright: played down where the body is, the same instrument measures
    //  darker than the wind it replaced, which is how this was got wrong once.
    it('keeps the body an octave under the tune', () => {

        for (const cue of [ 'finish', 'fail' ] as const)
        {
            const tune = melody(cue);
            const under = sung(cue).filter((note) => !tune.includes(note));

            for (const note of tune)
            {
                const body = under.find((w) => w.at === note.at && w.semitones === note.semitones - JINGLE_LIFT);

                expect(body, `body an octave under the note at ${note.at}`).toBeDefined();
            }
        }

    });

    //  Nothing but pitched voices. There was a kick on the first beat, another
    //  under the last note and a bass note with it - a floor under the phrase,
    //  and the floor was the trouble. A drum is the sound of the game being
    //  played and this plays once the playing has stopped.
    it('has no drum and no bass in it', () => {

        for (const cue of [ 'finish', 'fail', 'rainbow' ] as const)
        {
            for (const note of voiceFor(cue))
            {
                expect(PITCHED.has(note.timbre ?? ''), `${cue} plays a ${note.timbre}`).toBe(true);
            }
        }

    });

    //  The one phrase in the game with a space of its own. It plays once, with
    //  the road stopped and the music taken away, so there is nothing for a long
    //  tail to blur - and a big space is most of what makes an ending sound like
    //  one. Everything in it is pitched now, so everything goes into the room.
    it('is played into the large space, all of it', () => {

        for (const cue of [ 'finish', 'fail' ] as const)
        {
            for (const note of voiceFor(cue))
            {
                expect(note.hall === true, `${cue} ${note.timbre}`).toBe(true);
            }
        }

    });

    it('grows towards its last note rather than away from it', () => {

        for (const cue of [ 'finish', 'fail' ] as const)
        {
            const tune = melody(cue);

            //  Not merely louder: a real crescendo. The written velocities
            //  climb by a fifth, which is a shade on a piano and nothing at
            //  all on a phone, so they are opened out to most of the range.
            expect(tune[tune.length - 1].gain / tune[0].gain, cue).toBeGreaterThan(2);
        }

    });

    //  A rainbow is the one moment in a run worth a phrase rather than a
    //  sound, and it is the only place the tune appears while anybody is
    //  playing.
    it('lend a rainbow their opening, stopped before it settles', () => {

        const win = melody('finish');
        const bonus = melody('rainbow');

        expect(bonus.length, 'shorter than the whole thing').toBeLessThan(win.length);
        expect(bonus.map((note) => note.semitones))
            .toEqual(win.slice(0, bonus.length).map((note) => note.semitones));

        //  Unfinished: it stops above where it started, rather than on the note
        //  the full phrase settles onto. A cadence mid-run says the run is over.
        expect(bonus[bonus.length - 1].semitones).toBeGreaterThan(bonus[0].semitones);
        expect(bonus[bonus.length - 1].semitones).not.toBe(win[win.length - 1].semitones);

    });

    it('are quieter mid-run than they are at the end of one', () => {

        const loudest = (cue: 'finish' | 'rainbow') => Math.max(...melody(cue).map((note) => note.gain));

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
