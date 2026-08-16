import { Strike } from './audio';
import { Beat } from './music';
import {
    JINGLE_LOSE,
    JINGLE_LOSE_GAINS,
    JINGLE_WIN,
    JINGLE_WIN_GAINS,
    SELECT,
    TOPLINE,
    Written
} from './score';
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
 * One bar of the level select: the four chords held, with the tune over them.
 *
 * This is where the tune goes. Under a run it is a melody asking to be
 * followed by somebody who has a road to read; here there is nothing to do but
 * choose a level, and something to listen to while choosing is the whole
 * reason menu music exists.
 *
 * No drums. A screen where nothing is moving does not want a beat telling it
 * to hurry up.
 */
export function selectBar (bar: number): Beat[]
{
    const step = ((bar % MENU_BARS) + MENU_BARS) % MENU_BARS;
    const shape = SELECT[step % SELECT.length];
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

    for (const [ beat, semitones, held ] of TOPLINE[step])
    {
        notes.push({ semitones, beat, gain: 0.5, timbre: 'lead', held });
    }

    return notes;
}

/**
 * How many bars before the level select comes round.
 *
 * The tune, which is four times the length of the chords under it - so the same
 * eight bars of chords land under a different phrase each time and thirty-two
 * bars pass before anything repeats.
 */
export const MENU_BARS = TOPLINE.length;

/** How many bars of chords before those come round, which is a quarter of it. */
export const SELECT_BARS = SELECT.length;

/**
 * The rising half of the win jingle, for the one moment in a run that has
 * earned a phrase.
 *
 * A rainbow is rare and it is the only thing in a level worth a tune, so this
 * is where the jingle gets to appear mid-run. It stops four notes in, on the
 * note the phrase climbs to rather than the one it settles on - unfinished,
 * because the run is not over and a full cadence in the middle of one says it
 * is.
 *
 * @param beatSeconds How long a beat is, since cues are written in seconds.
 */
export function flourish (beatSeconds: number): Strike[]
{
    return JINGLE_WIN.slice(0, 4).map(([ beat, semitones, held ], i) => ({
        semitones,
        at: beat * beatSeconds,
        gain: JINGLE_WIN_GAINS[i] * 0.6,
        timbre: 'lead' as Timbre,
        held: held * beatSeconds
    }));
}

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
