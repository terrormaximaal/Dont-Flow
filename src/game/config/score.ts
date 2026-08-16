//  The music, as it was written.
//
//  Four pieces came in as MIDI and were transcribed here by machine rather than
//  by ear, so what the game plays is what was written: a sixteen-bar backing,
//  a thirty-two bar topline over it, an eight-bar figure for the level select,
//  and two short jingles. Nothing was invented in this file and nothing was
//  tidied - where the top voice of a chord changes in the eleventh bar for no
//  reason anybody could name, it changes here too.
//
//  Everything is in G minor, on Gm - Bb - Eb - F, at a hundred and fifty. Every
//  number below is semitones from G3, which is where `SOUND_ROOT_HZ` sits.
//
//  Nothing here makes a sound. `config/music` arranges it, `systems/Music`
//  hands it to the clock.

/** A note as it was written: which beat of its bar, how high, how long. */
export type Written = [ beat: number, semitones: number, beats: number ];

/**
 * The backing, one entry per chord of the four-bar turn.
 *
 * Every bar of it is built the same way: the bass on the first and third beat,
 * the top voice with it, and a three-note figure running underneath on the
 * eighths between. That is not a simplification - checked against all sixteen
 * bars of the original, note for note, it is exactly what is there.
 */
export const CHORDS: Array<{ bass: number[]; inner: number[] }> = [
    { bass: [ -12 ], inner: [ 0, -5, 0 ] },      //  Gm
    { bass: [ -9 ], inner: [ -2, -5, -2 ] },     //  Bb
    { bass: [ -16, -9 ], inner: [ 3, 0, 3 ] },   //  Eb
    { bass: [ -14 ], inner: [ 2, -2, 2 ] }       //  F
];

/**
 * The note on top of each of the sixteen bars.
 *
 * Four times round the same four chords, and the only thing that moves is this.
 * The last two turns are where it stops climbing to the same place each time,
 * which is the whole reason sixteen bars do not sound like four played over.
 */
export const BACKING_TOPS = [ 7, 10, 12, 14, 7, 10, 12, 14, 7, 7, 12, 14, 12, 7, 7, 10 ];

/** How many bars of backing before it comes round. */
export const BACKING_BARS = BACKING_TOPS.length;

/**
 * The tune, thirty-two bars of it: a low phrase, a chorus an octave up, and
 * the low phrase again with a run down out of it.
 *
 * Twice the length of the backing, so the two only line up again every
 * thirty-two bars - which at this tempo is nearly a minute of music before
 * anything the player has already heard comes back in the same place.
 */
export const TOPLINE: Written[][] = [
    [ [ 0, 0, 6.5 ] ],
    [ [ 2.5, 2, 0.5 ], [ 3, 3, 0.5 ], [ 3.5, 5, 0.5 ] ],
    [ [ 0, 7, 6 ] ],
    [ [ 2, 10, 0.5 ], [ 2.5, 7, 0.5 ], [ 3, 3, 0.5 ], [ 3.5, 2, 0.5 ] ],
    [ [ 0, 0, 6 ] ],
    [ [ 2, 0, 0.5 ], [ 2.5, 3, 0.5 ], [ 3, 7, 0.5 ], [ 3.5, 10, 0.5 ] ],
    [ [ 0, 12, 4.5 ] ],
    [ [ 0.5, 10, 0.5 ], [ 1, 7, 0.5 ], [ 1.5, 10, 0.5 ], [ 2, 15, 0.5 ], [ 2.5, 14, 0.5 ], [ 3, 10, 0.5 ], [ 3.5, 12, 0.5 ] ],
    [ [ 0, 19, 1.5 ], [ 1.5, 17, 0.5 ], [ 2, 19, 1.5 ], [ 3.5, 17, 0.5 ] ],
    [ [ 0, 22, 3 ], [ 3, 24, 0.5 ], [ 3.5, 22, 0.5 ] ],
    [ [ 0, 24, 1.5 ], [ 1.5, 22, 0.5 ], [ 2, 24, 1.5 ], [ 3.5, 22, 0.5 ] ],
    [ [ 0, 19, 3 ], [ 3, 19, 0.5 ], [ 3.5, 17, 0.5 ] ],
    [ [ 0, 19, 1.5 ], [ 1.5, 17, 0.5 ], [ 2, 19, 1.5 ], [ 3.5, 17, 0.5 ] ],
    [ [ 0, 22, 3 ], [ 3, 24, 0.5 ], [ 3.5, 22, 0.5 ] ],
    [ [ 0, 24, 1.5 ], [ 1.5, 22, 0.5 ], [ 2, 24, 1.5 ], [ 3.5, 22, 0.5 ] ],
    [ [ 0, 26, 3 ], [ 3, 27, 0.5 ], [ 3.5, 26, 0.5 ] ],
    [ [ 0, 24, 1.5 ], [ 1.5, 22, 0.5 ], [ 2, 24, 1.5 ], [ 3.5, 22, 0.5 ] ],
    [ [ 0, 19, 3 ], [ 3, 27, 0.5 ], [ 3.5, 26, 0.5 ] ],
    [ [ 0, 24, 1.5 ], [ 1.5, 22, 0.5 ], [ 2, 24, 1.5 ], [ 3.5, 22, 0.5 ] ],
    [ [ 0, 26, 3 ], [ 3, 27, 0.5 ], [ 3.5, 26, 0.5 ] ],
    [ [ 0, 24, 1.5 ], [ 1.5, 22, 0.5 ], [ 2, 24, 1.5 ], [ 3.5, 22, 0.5 ] ],
    [ [ 0, 19, 3 ], [ 3, 19, 0.5 ], [ 3.5, 17, 0.5 ] ],
    [ [ 0, 19, 1.5 ], [ 1.5, 17, 0.5 ], [ 2, 19, 1.5 ], [ 3.5, 17, 0.5 ] ],
    [ [ 0, 22, 3 ], [ 3, 17, 0.5 ], [ 3.5, 14, 0.5 ] ],
    [ [ 0, 0, 6.5 ] ],
    [ [ 2.5, 2, 0.5 ], [ 3, 3, 0.5 ], [ 3.5, 5, 0.5 ] ],
    [ [ 0, 7, 6 ] ],
    [ [ 2, 10, 0.5 ], [ 2.5, 7, 0.5 ], [ 3, 3, 0.5 ], [ 3.5, 2, 0.5 ] ],
    [ [ 0, 0, 6.5 ] ],
    [ [ 2.5, 2, 0.5 ], [ 3, 3, 0.5 ], [ 3.5, 5, 0.5 ] ],
    [ [ 0, 7, 4.5 ] ],
    [ [ 0.5, 10, 0.5 ], [ 1, 7, 0.5 ], [ 1.5, 5, 0.5 ], [ 2, 7, 0.5 ], [ 2.5, 3, 0.5 ], [ 3, 2, 0.5 ], [ 3.5, 0, 0.5 ] ]
];

/** Which bar of the topline the chorus starts and ends on. */
export const CHORUS_FROM = 8;
export const CHORUS_TO = 24;

/**
 * The level select: the same four chords, held rather than walked.
 *
 * `full` is struck on the first and fourth beat and `inner` on every eighth
 * between, which is what turns a chord chart into something that moves without
 * anything actually happening - right for a screen where nobody is playing.
 */
export const SELECT: Array<{ full: number[]; inner: number[] }> = [
    { full: [ 0, 7, 12, 19 ], inner: [ 7, 12 ] },
    { full: [ 3, 10, 15 ], inner: [ 10, 15 ] },
    { full: [ -4, 3, 12, 15 ], inner: [ 3, 12 ] },
    { full: [ -2, 5, 14 ], inner: [ 5, 14 ] },
    { full: [ 0, 3, 7, 12 ], inner: [ 3, 7 ] },
    { full: [ 3, 7, 10, 15 ], inner: [ 7, 10 ] },
    { full: [ -4, 3, 8, 12, 15 ], inner: [ 3, 8, 12 ] },
    { full: [ -2, 5, 10, 14 ], inner: [ 5, 10, 14 ] }
];

/**
 * The two jingles, as written: the same seven-note shape twice, once going up
 * and once coming down.
 *
 * They are a pair rather than two pieces, which is why one is the sound of
 * finishing a level and the other the sound of not. Both start on the same
 * note; the ear hears the second one as the first one going wrong.
 */
export const JINGLE_WIN: Written[] = [
    [ 0, 10, 0.5 ], [ 0.5, 7, 0.5 ], [ 1, 10, 0.5 ], [ 1.5, 15, 0.5 ],
    [ 2, 14, 0.5 ], [ 2.5, 10, 0.5 ], [ 3, 12, 1.5 ]
];

export const JINGLE_LOSE: Written[] = [
    [ 0, 10, 0.5 ], [ 0.5, 7, 0.5 ], [ 1, 5, 0.5 ], [ 1.5, 7, 0.5 ],
    [ 2, 3, 0.5 ], [ 2.5, 2, 0.5 ], [ 3, 0, 0.5 ]
];

/** How hard each note of a jingle is struck, as written. Both grow. */
export const JINGLE_WIN_GAINS = [ 0.79, 0.80, 0.93, 0.98, 1, 1, 1 ];
export const JINGLE_LOSE_GAINS = [ 0.79, 0.82, 0.91, 0.96, 0.98, 1, 1 ];
