import { FINALE_LIFT, MUSIC_BEATS_PER_BAR } from './constants';
import { BACKING_BARS, BACKING_TOPS, CHORDS } from './score';
import { Timbre } from '../systems/voice';

//  The music under a run: chords and a kit, and no tune at all.
//
//  The tune lives in `config/musicMenu`, which is the whole point. A melody is
//  a thing an ear follows from note to note, and a player reading a road at a
//  hundred and fifty has no attention to spare for following anything. Under
//  the run it is harmony - which an ear takes in without listening - and a beat
//  to move to. The tune is what the menus are for.
//
//  What is added here and is not in the written music: the drum kit. There are
//  no drums in any of the four files, and a game running at this tempo with
//  nothing counting the bars has no floor under it.

/**
 * How many bars before the run's music comes round.
 *
 * The backing, because the tune is not in it. A melody is a thing an ear
 * follows, and following one is exactly what a player reading a road cannot
 * spare the attention for - so under the run there are chords and a kit, and
 * the tune waits in the menus where there is nothing else to listen to.
 */
export const LOOP_BARS = BACKING_BARS;

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
 * One bar of the music under a run: the kit and the written backing.
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
 * Sixteen bars of it: four times round the same four chords with the top
 * voice moving, which is the only thing that keeps a chord loop from being
 * heard as one.
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
