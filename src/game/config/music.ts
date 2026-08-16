import { FINALE_LIFT, MUSIC_BEATS_PER_BAR } from './constants';
import { BACKING_BARS, BACKING_TOPS, CHORDS, TOPLINE } from './score';
import { Timbre } from '../systems/voice';

//  The arrangement: what `config/score` says, played by what `systems/voice` has.
//
//  The written music is a piano part. This is a cabinet, so the arranging is
//  mostly deciding what *not* to sustain: the tune holds its long notes because
//  that is the tune, and everything under it is struck and gone. A chip
//  instrument holding four voices is the mud this game already had once.
//
//  What is added here and is not in the written music: a drum kit. There are no
//  drums in any of the four files, and a game running at a hundred and fifty
//  with nothing counting the bars is a game with no floor under it.

/** How many bars before the whole thing comes round: the tune is the long one. */
export const LOOP_BARS = TOPLINE.length;

/** The drums have no pitch worth the name; this is what they are given. */
const DRUM = 0;

/** A note in the backing: which note, which beat of the bar, how hard. */
export interface Beat
{
    semitones: number;

    /** Beats from the start of the bar. */
    beat: number;

    gain: number;

    timbre: Timbre;

    /** Extra ring, in beats, for the notes that were written long. */
    held?: number;
}

/**
 * One bar of the soundtrack: the kit, the backing, and the tune over them.
 *
 * @param bar    Which bar of the run, counted from the first. Loops on its own.
 * @param finale How far into the run-in to the finish, 0 to 1. Above zero the
 *               hats double up and the fills come every bar - the drummer
 *               telling the player it is nearly over, which is what a drummer
 *               is for.
 */
export function barNotes (bar: number, finale = 0): Beat[]
{
    const step = ((bar % LOOP_BARS) + LOOP_BARS) % LOOP_BARS;
    const lift = 1 + (FINALE_LIFT * finale);

    const notes: Beat[] = [ ...kit(step, finale, lift), ...backing(step, lift) ];

    for (const [ beat, semitones, held ] of TOPLINE[step])
    {
        notes.push({ semitones, beat, gain: 0.42 * lift, timbre: 'lead', held });
    }

    return notes.filter((note) => note.beat < MUSIC_BEATS_PER_BAR);
}

/**
 * The kit under it: kick on one and three, snare on two and four.
 *
 * The beat every arcade game has ever had, and the reason everything above it
 * can be left exactly as it was written.
 */
function kit (step: number, finale: number, lift: number): Beat[]
{
    const notes: Beat[] = [];

    for (const beat of [ 0, 2 ]) { notes.push({ semitones: DRUM, beat, gain: 0.72 * lift, timbre: 'kick' }); }
    for (const beat of [ 1, 3 ]) { notes.push({ semitones: DRUM, beat, gain: 0.55 * lift, timbre: 'snare' }); }

    const hats = finale > 0 ? 16 : 8;

    for (let i = 0; i < hats; i++)
    {
        notes.push({
            semitones: DRUM,
            beat: i * (MUSIC_BEATS_PER_BAR / hats),
            gain: (i % 2 === 0 ? 0.5 : 0.3) * lift,
            timbre: 'hat'
        });
    }

    //  The fill: the last beat of every eighth bar is snare drops instead of
    //  the pattern, which is what tells the ear a section is closing. In the
    //  run-in to the finish, every bar gets one.
    if (step % 8 === 7 || finale > 0.5)
    {
        for (const beat of [ 3, 3.25, 3.5, 3.75 ])
        {
            notes.push({ semitones: DRUM, beat, gain: (0.3 + ((beat - 3) * 0.5)) * lift, timbre: 'snare' });
        }
    }

    return notes;
}

/**
 * The written backing: the bass on the first and third beat with the top voice
 * over it, and the figure running on the eighths between.
 *
 * The tune is twice as long as this, so it comes round twice per turn of the
 * topline and lands under a different phrase each time.
 */
function backing (step: number, lift: number): Beat[]
{
    const chord = CHORDS[step % CHORDS.length];
    const top = BACKING_TOPS[step % BACKING_BARS];

    const notes: Beat[] = [];

    for (const half of [ 0, 2 ])
    {
        for (const semitones of chord.bass)
        {
            notes.push({ semitones, beat: half, gain: 0.72 * lift, timbre: 'bass' });
        }

        notes.push({ semitones: top, beat: half, gain: 0.34 * lift, timbre: 'chord' });

        chord.inner.forEach((semitones, i) => {

            notes.push({ semitones, beat: half + 0.5 + (i * 0.5), gain: 0.28 * lift, timbre: 'chord' });

        });
    }

    return notes;
}
