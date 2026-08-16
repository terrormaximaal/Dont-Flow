import {
    JINGLE_FROM,
    JINGLE_HARMONY,
    JINGLE_LIFT,
    JINGLE_OPEN_FROM,
    JINGLE_OVER,
    JINGLE_UNDER
} from './constants';
import { Strike } from './audio';
import { JINGLE_LOSE, JINGLE_LOSE_GAINS, JINGLE_WIN, JINGLE_WIN_GAINS, Written } from './score';
import { Timbre } from '../systems/voice';

//  The two phrases that end a level, and the half of one that appears in the
//  middle of a run.
//
//  They were written as a pair - the same seven-note shape, once going up and
//  once coming down - so the game only has to say which of the two happened and
//  the music says the rest.

/** The drums have no pitch worth the name; this is what they are given. */
const DRUM = 0;

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

    //  The kit stays out of the space: a drum with a two-second tail on it is
    //  not a drum, and what the hit is there for is to put a floor under the
    //  phrase rather than to ring with it.
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
 * A phrase as a section rather than a soloist, played into the large space.
 *
 * Bells carry it and a wind holds it up from underneath. A phrase that ends a
 * level wants to be bright and to lift, and a section of winds is neither: they
 * are warm, they hold, and holding is what makes a thing sound settled rather
 * than opened out. Struck metal does the opposite - it arrives, rings, and
 * leaves the space to answer, which is the whole reason the ending is the one
 * thing here with a space of its own.
 *
 * The written velocities already climb. They are stretched rather than used
 * flat, because a phrase that ends a level has one job - to arrive - and an ear
 * reads arriving as getting louder towards the last note. Starting the first
 * note this far down is what gives the last one anywhere to get to.
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

        //  The tune, on a bell, an octave over where it is written.
        //
        //  Up there because that is what makes a bell bright. Played at the
        //  height the winds used to sit at, the same instrument came out darker
        //  than the winds it replaced - measured, presence fell from 13% of the
        //  phrase to 3% - because a bell is mostly its fundamental and the
        //  fundamental was in the middle of the mix. Height is the brightness.
        notes.push({
            semitones: semitones + JINGLE_LIFT,
            at,
            gain: grown * loudest,
            timbre: 'pluck',
            hall: true,
            held: rings
        });

        //  A second bell a third or a fifth under it: two of them in parallel
        //  is a section, and one is a signal.
        notes.push({
            semitones: harmony[i] + JINGLE_LIFT,
            at,
            gain: grown * loudest * JINGLE_HARMONY,
            timbre: 'pluck' as Timbre,
            hall: true,
            held: rings
        });

        //  And the wind, at the height the tune is written, holding underneath.
        //  Bells alone have no body - they are all front and no middle, and a
        //  phrase made only of them rings without ever landing.
        notes.push({
            semitones,
            at,
            gain: grown * loudest * JINGLE_UNDER,
            timbre: 'lead' as Timbre,
            hall: true,
            held: rings
        });

        //  And an octave over the top, arriving rather than present.
        //
        //  A phrase that ends a level has one job, which is to lift. Growing
        //  louder does half of it; the other half is growing *wider*, and an
        //  octave above is the widest a phrase can get without anybody hearing
        //  a new note. It comes in over the run rather than from the start, so
        //  the last note is the one that opens out.
        const opening = i / (written.length - 1);

        if (opening > JINGLE_OPEN_FROM)
        {
            const into = (opening - JINGLE_OPEN_FROM) / (1 - JINGLE_OPEN_FROM);

            notes.push({
                semitones: semitones + (JINGLE_LIFT * 2),
                at,
                gain: grown * loudest * JINGLE_OVER * into,
                timbre: 'pluck' as Timbre,
                hall: true,
                held: rings
            });
        }

    });

    return notes;
}
