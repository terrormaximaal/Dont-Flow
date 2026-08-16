import { FINALE_LIFT, MUSIC_BEATS_PER_BAR } from './constants';
import { Strike } from './audio';
import { Timbre } from '../systems/voice';

//  The soundtrack, as numbers.
//
//  Sixteen bars in two halves. The first eight walk a minor line down a
//  semitone at a time - the thing "One", Skyfall and the Bond vamp all have in
//  common - and the second eight lift into the relative major: the same notes
//  heard from three semitones up, so it brightens without leaving the key.
//
//  Two sections is what stops a loop being a loop. Four bars comes round every
//  seven seconds and the ear has it memorised inside a level; sixteen takes
//  half a minute, and by then something has happened on the road.
//
//  Nothing here makes a sound. `systems/Music` hands it to the clock.

/** How many bars before the whole thing comes round again. */
export const LOOP_BARS = 16;

/** The drums have no pitch worth the name; this is what they are given. */
const DRUM = 0;

/**
 * Where the bass sits in each bar of the two halves.
 *
 * Two bars to a chord, so the line moves half as often as the tune does - the
 * whole point of a descending bass is that it is slow enough to be followed.
 */
const LINE = [
    [ -12, -12, -13, -13, -14, -14, -16, -16 ],
    [ -9, -9, -10, -10, -12, -12, -14, -14 ]
];

/**
 * The tune, in eighths, as a question and an answer.
 *
 * Eight bars of the same shape twice over, the second time ending differently:
 * that is how a chip soundtrack keeps two channels interesting for twenty
 * minutes, and it is the cheapest way there is to stop something sounding like
 * a loop. `null` is a rest, and there are a lot of them on purpose.
 */
const TUNE: Array<Array<Array<number | null>>> = [
    [
        [ 0, null, 3, null, 7, null, 3, null ],
        [ 5, null, 3, null, 2, null, null, null ],
        [ 0, null, 3, null, 7, null, 10, null ],
        [ 7, null, null, null, null, null, null, null ],
        [ 12, null, 10, null, 7, null, 10, null ],
        [ 5, null, 7, null, 3, null, null, null ],
        [ 0, null, 3, null, 7, null, 12, null ],
        [ 10, null, 7, null, 3, null, 0, null ]
    ],
    [
        [ 15, null, 12, null, 10, null, 12, null ],
        [ 15, null, null, 17, null, 15, null, null ],
        [ 12, null, 15, null, 19, null, 15, null ],
        [ 12, null, null, null, 10, null, null, null ],
        [ 19, null, 17, null, 15, null, 12, null ],
        [ 15, null, 12, null, 10, null, null, null ],
        [ 12, null, 15, null, 19, null, 22, null ],
        [ 19, null, 15, null, 12, null, 10, null ]
    ]
];

/** What the bass plays across a bar, as offsets from that bar's own note. */
const WALK = [ 0, 0, 12, 0, 7, 0, 12, 0 ];

/** And on the eighth bar, where it runs back up instead: the turnaround. */
const TURN = [ 0, 0, 12, 0, 7, 0, 3, 5 ];

/**
 * The title tune: the opening phrase, with a hit under it.
 *
 * Written in seconds because a title screen has no bars - it is played once,
 * on its own, while nothing is moving.
 */
export const THEME: Strike[] = [
    ...[ 0, 3, 7, 3, 5, 3, 2 ].map((semitones, i) => ({
        semitones, at: i * 0.14, gain: 0.7, timbre: 'lead' as Timbre
    })),
    { semitones: DRUM, at: 0, gain: 0.8, timbre: 'kick' },
    { semitones: DRUM, at: 0.56, gain: 0.5, timbre: 'snare' },
    { semitones: -12, at: 1.02, gain: 0.9, timbre: 'bass' },
    { semitones: DRUM, at: 1.02, gain: 0.85, timbre: 'kick' },
    { semitones: 0, at: 1.04, gain: 0.8, timbre: 'lead' }
];

/** A note in the backing: which note, which beat of the bar, how hard. */
export interface Beat
{
    semitones: number;

    /** Beats from the start of the bar. */
    beat: number;

    gain: number;

    timbre: Timbre;
}

/**
 * One bar of the soundtrack: drums, a walking bass, and the tune over them.
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
    const half = step >= 8 ? 1 : 0;
    const place = step % 8;
    const last = place === 7;
    const lift = 1 + (FINALE_LIFT * finale);

    const notes: Beat[] = [];

    //  Kick on one and three, snare on two and four. The beat every arcade
    //  game has ever had, and the reason everything else can be this simple.
    for (const beat of [ 0, 2 ]) { notes.push({ semitones: DRUM, beat, gain: 0.8, timbre: 'kick' }); }
    for (const beat of [ 1, 3 ]) { notes.push({ semitones: DRUM, beat, gain: 0.55, timbre: 'snare' }); }

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

    //  The fill: the last beat of the eighth bar is snare drops instead of the
    //  pattern, which is what tells the ear the loop is coming round. In the
    //  run-in to the finish, every bar gets one.
    if (last || finale > 0.5)
    {
        for (const beat of [ 3, 3.25, 3.5, 3.75 ])
        {
            notes.push({ semitones: DRUM, beat, gain: (0.3 + ((beat - 3) * 0.7)) * lift, timbre: 'snare' });
        }
    }

    const root = LINE[half][place];
    const walk = last ? TURN : WALK;

    for (let i = 0; i < 8; i++)
    {
        notes.push({
            semitones: root + walk[i],
            beat: i * 0.5,
            gain: (i === 0 ? 0.85 : (i % 2 === 0 ? 0.6 : 0.38)) * lift,
            timbre: 'bass'
        });
    }

    TUNE[half][place].forEach((semitones, i) => {

        if (semitones === null) { return; }

        //  The bright half is played a shade softer, or the lift reads as the
        //  game getting louder rather than as it getting brighter.
        notes.push({
            semitones,
            beat: i * 0.5,
            gain: (half ? 0.36 : 0.42) * lift,
            timbre: 'lead'
        });

    });

    return notes.filter((note) => note.beat < MUSIC_BEATS_PER_BAR);
}
