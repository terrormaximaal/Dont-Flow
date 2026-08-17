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
    return band(JINGLE_WIN, JINGLE_WIN_GAINS, WIN_HARMONY, beatSeconds, 0.55, 4, WON);
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
        0.8,
        written.length,
        win ? WON : LOST
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
 * Two instruments playing the same phrase in parallel is what a section is, and
 * it is why a jingle played by one of them sounds like a signal while the same
 * notes played by three sound like an ending.
 */
const WIN_HARMONY = [ 7, 3, 7, 10, 10, 7, 7 ];
const LOSE_HARMONY = [ 7, 3, 2, 3, 0, -2, -5 ];

/**
 * Which instrument plays which line, and it is not one instrument four times.
 *
 * The phrase was four bells - the tune, a harmony under it, a body an octave
 * down and an octave over the top - and four of the same thing in parallel is
 * one thick instrument rather than a group. Three now, and they are told apart
 * by what happens *after* the strike rather than by pitch: the bell rings on,
 * the celesta is bright and gone, the marimba lands and stops.
 *
 * The two endings differ too, and by the harmony, which is the line that carries
 * the mood. Finishing, it is glass - a second bright thing beside the bell, and
 * the phrase opens out. Not finishing, it is wood, which takes the sparkle off
 * without making the phrase sad: the notes already fall, and an ending that
 * announces its own disappointment is one a player stops wanting to hear.
 * Measured across the two, the band an ear hears melody in carries a quarter of
 * the winning phrase and a twentieth of the other.
 *
 * The octave over the top is the bell in both, and that was a measurement rather
 * than a choice. The celesta seemed the brighter thing to put up there and is
 * not: it is gone in a third of a second where the bell rings for half again as
 * long, so the bell leaves more behind it that high up. Swapping it in measured
 * *darker*.
 */
interface Palette
{
    /** The line itself, an octave over where it is written. */
    tune: Timbre;

    /** A third or a fifth under it, the second instrument of the pair. */
    harmony: Timbre;

    /** At the written height, for the weight that lets a phrase land. */
    body: Timbre;

    /** An octave over the top, arriving late. */
    over: Timbre;
}

const WON: Palette = { tune: 'pluck', harmony: 'glass', body: 'wood', over: 'glass' };
const LOST: Palette = { tune: 'pluck', harmony: 'wood', body: 'wood', over: 'pluck' };

/**
 * A phrase as a section rather than a soloist, played into the large space.
 *
 * A bell, a celesta and a marimba, and no wind anywhere. A phrase that ends a
 * level wants to be bright and to lift, and winds are neither: they are warm,
 * they hold, and holding is what makes a thing sound settled rather than opened
 * out - described, when they carried this, as sombre. Struck instruments do the
 * opposite: they arrive, ring, and leave the space to answer, which is the whole
 * reason the ending is the one thing here with a space of its own.
 *
 * Three of them rather than one played four times over, because four copies of a
 * bell is a thicker bell and not a group. What tells them apart is what each
 * does after it is struck, which is where an ear looks for an instrument.
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
    upTo = written.length,
    voices: Palette = WON
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
            timbre: voices.tune,
            hall: true,
            held: rings
        });

        //  A second instrument a third or a fifth under it: two lines in
        //  parallel is a section, and one is a signal. A different instrument
        //  rather than the same one again, so the two are heard as two.
        notes.push({
            semitones: harmony[i] + JINGLE_LIFT,
            at,
            gain: grown * loudest * JINGLE_HARMONY,
            timbre: voices.harmony,
            hall: true,
            held: rings
        });

        //  And the body at the height the tune is written, on the marimba.
        //
        //  A wind held this line once, and it was the wind that made the ending
        //  sound sombre: it is the one voice that stays, and a held note under
        //  struck ones reads as weight. Then it was a third bell, which gave the
        //  body back but made the whole phrase one instrument. A struck bar is
        //  both answers at once - it lands and stops, and it is plainly not the
        //  bell above it.
        notes.push({
            semitones,
            at,
            gain: grown * loudest * JINGLE_UNDER,
            timbre: voices.body,
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
                timbre: voices.over,
                hall: true,
                held: rings
            });
        }

    });

    return notes;
}
