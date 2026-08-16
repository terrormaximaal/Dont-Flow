import { Strike } from './audio';
import { Beat } from './music';
import { JINGLE_LOSE, JINGLE_LOSE_GAINS, JINGLE_WIN, JINGLE_WIN_GAINS, SELECT, Written } from './score';
import { Timbre } from '../systems/voice';

//  The music outside the run: the title, the level select, and the two jingles.
//
//  Everything here plays while nothing is moving, which is why none of it has a
//  drum in it except at the two moments a drum is the point. `config/music` is
//  the other half - the piece that plays while somebody is actually steering.

/** The drums have no pitch worth the name; this is what they are given. */
const DRUM = 0;

/**
 * The title: the opening call of the tune, tightened up.
 *
 * Written, it is a note held for six beats and then three notes walking up to
 * the answer - which is right in a piece that has a minute to spend and dead
 * air on a title screen. The notes and their order are the written ones; only
 * the waiting is gone.
 */
export const THEME: Strike[] = [
    { semitones: -12, at: 0, gain: 0.8, timbre: 'bass' },
    { semitones: 0, at: 0, gain: 0.55, timbre: 'chord' },
    { semitones: 7, at: 0, gain: 0.5, timbre: 'chord' },
    { semitones: 0, at: 0, gain: 0.75, timbre: 'lead' },
    { semitones: DRUM, at: 0, gain: 0.8, timbre: 'kick' },
    { semitones: 2, at: 0.9, gain: 0.6, timbre: 'lead' },
    { semitones: 3, at: 1.1, gain: 0.65, timbre: 'lead' },
    { semitones: 5, at: 1.3, gain: 0.7, timbre: 'lead' },
    { semitones: 7, at: 1.5, gain: 0.8, timbre: 'lead' },
    { semitones: -12, at: 1.5, gain: 0.85, timbre: 'bass' },
    { semitones: DRUM, at: 1.5, gain: 0.85, timbre: 'kick' }
];

/**
 * One bar of the level select: the same four chords, held rather than walked.
 *
 * No drums and no tune. It plays while somebody is deciding which level to
 * try, and a screen where nothing is moving does not want a beat telling it
 * to hurry up.
 */
export function selectBar (bar: number): Beat[]
{
    const shape = SELECT[((bar % SELECT.length) + SELECT.length) % SELECT.length];
    const notes: Beat[] = [];

    for (const beat of [ 0, 3 ])
    {
        for (const semitones of shape.full)
        {
            notes.push({ semitones, beat, gain: 0.4, timbre: 'chord' });
        }
    }

    for (const beat of [ 0.5, 1, 1.5, 2, 2.5, 3.5 ])
    {
        for (const semitones of shape.inner)
        {
            notes.push({ semitones, beat, gain: 0.26, timbre: 'chord' });
        }
    }

    return notes;
}

/** How many bars of the level select before it comes round. */
export const SELECT_BARS = SELECT.length;

/**
 * One of the two jingles, in seconds, with the kit under its last note.
 *
 * @param beatSeconds How long a beat is, since a cue is written in seconds and
 *                    the jingles were written in beats.
 */
export function jingle (win: boolean, beatSeconds: number): Strike[]
{
    const written: Written[] = win ? JINGLE_WIN : JINGLE_LOSE;
    const gains = win ? JINGLE_WIN_GAINS : JINGLE_LOSE_GAINS;
    const last = written[written.length - 1];

    const notes: Strike[] = written.map(([ beat, semitones, held ], i) => ({
        semitones,
        at: beat * beatSeconds,
        gain: gains[i] * 0.75,
        timbre: 'lead' as Timbre,
        held: held * beatSeconds
    }));

    notes.push({ semitones: DRUM, at: 0, gain: 0.75, timbre: 'kick' });
    notes.push({ semitones: last[1] - 12, at: last[0] * beatSeconds, gain: 0.8, timbre: 'bass' });
    notes.push({ semitones: DRUM, at: last[0] * beatSeconds, gain: 0.85, timbre: 'kick' });

    return notes;
}
