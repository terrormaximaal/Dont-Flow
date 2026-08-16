import { JINGLE_FROM, JINGLE_HARMONY, JINGLE_UNDER, MENU_TUNE_GAIN } from './constants';
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

//  The music outside a run: the menus, and the two jingles.
//
//  Both menu screens play the same piece and neither stops it, so it begins on
//  the tune's opening call the first time the game is touched and carries on
//  from there. There was a separate title sting for a while; it played the same
//  five notes as the first bars of this, which meant the announcement and the
//  music were two things saying the same thing over each other.
//
//  `config/music` is the other half - what plays while somebody is steering.

/** The drums have no pitch worth the name; this is what they are given. */
const DRUM = 0;

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

    //  Well down under the chords. It is the only melody in the game and it
    //  plays for as long as somebody takes to choose, so it wants to be the
    //  thing they notice on the second listen rather than the first.
    for (const [ beat, semitones, held ] of TOPLINE[step])
    {
        notes.push({ semitones, beat, gain: MENU_TUNE_GAIN, timbre: 'lead', held });
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
    return band(JINGLE_WIN, JINGLE_WIN_GAINS, WIN_HARMONY, beatSeconds, 0.55, 4);
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
    const last = written[written.length - 1];

    const notes = band(
        written,
        win ? JINGLE_WIN_GAINS : JINGLE_LOSE_GAINS,
        win ? WIN_HARMONY : LOSE_HARMONY,
        beatSeconds,
        0.8
    );

    notes.push({ semitones: DRUM, at: 0, gain: 0.5, timbre: 'kick' });
    notes.push({ semitones: last[1] - 24, at: last[0] * beatSeconds, gain: 0.8, timbre: 'bass' });
    notes.push({ semitones: DRUM, at: last[0] * beatSeconds, gain: 0.85, timbre: 'kick' });

    return notes;
}

/**
 * The voice under the tune in each jingle: a third or a fifth below, in key.
 *
 * Two instruments playing the same phrase in parallel is what a section of
 * winds is, and it is why a jingle played by one of them sounds like a signal
 * while the same notes played by three sound like an ending.
 */
const WIN_HARMONY = [ 7, 3, 7, 10, 10, 7, 7 ];
const LOSE_HARMONY = [ 7, 3, 2, 3, 0, -2, -5 ];

/**
 * A phrase as a section rather than a soloist: the tune, a voice below it, and
 * the tune again an octave down.
 *
 * The written velocities already climb. They are stretched here rather than
 * used flat, because a phrase that ends a level has one job - to arrive - and
 * an ear reads arriving as getting louder towards the last note. Starting the
 * first note this far down is what gives the last one anywhere to get to.
 *
 * @param loudest How loud the last note of the tune is allowed to be.
 * @param upTo    How many notes of the phrase to play, for the half of it that
 *                appears mid-run.
 */
function band (
    written: Written[],
    velocities: number[],
    harmony: number[],
    beatSeconds: number,
    loudest: number,
    upTo = written.length
): Strike[]
{
    const notes: Strike[] = [];
    const softest = Math.min(...velocities);
    const range = Math.max(...velocities) - softest;

    written.slice(0, upTo).forEach(([ beat, semitones, held ], i) => {

        //  The written velocity, opened out: what is a fifth of a range on
        //  paper becomes most of one here.
        const grown = JINGLE_FROM + ((1 - JINGLE_FROM) * ((velocities[i] - softest) / range));
        const at = beat * beatSeconds;
        const rings = held * beatSeconds;

        notes.push({ semitones, at, gain: grown * loudest, timbre: 'lead', held: rings });

        notes.push({
            semitones: harmony[i],
            at,
            gain: grown * loudest * JINGLE_HARMONY,
            timbre: 'lead' as Timbre,
            held: rings
        });

        notes.push({
            semitones: semitones - 12,
            at,
            gain: grown * loudest * JINGLE_UNDER,
            timbre: 'lead' as Timbre,
            held: rings
        });

    });

    return notes;
}
