import { MUSIC_BEATS_PER_BAR, MUSIC_BPM, ORB_BASE_SEMITONES } from './constants';
import { Strike } from './audio';
import { Timbre } from '../systems/voice';

//  The tune, and the music under a run.
//
//  Both are written here as numbers - which note, on which beat, how hard -
//  and played by the same struck voice as everything else. Nothing in this
//  file makes a sound; `systems/Music` hands it to the clock.
//
//  Everything is in semitones from the root, and every note is drawn from the
//  same five-note scale the game's own sounds use. That is the whole reason
//  the backing can be left running while the player collects: a collected orb
//  cannot land a semitone away from the chord under it, because neither of
//  them has a note the other lacks.

/**
 * The key the whole game is in: wherever a collected orb starts.
 *
 * Everything - the tune, the chords under it, every cue - is written from
 * here, which is what makes the guarantee hold. The five notes a streak plays
 * and the five the backing is built from are the same five, so no note the
 * player triggers can land a semitone against whatever the room is still
 * holding. Written in one place because two keys a fifth apart sound perfectly
 * fine on their own and awful together.
 */
const HOME = ORB_BASE_SEMITONES;

/**
 * The theme.
 *
 * Bubbles rising: the same three-note figure three times over, each one
 * starting where the last one ended, and a single low one to finish. Written
 * as a shape rather than a melody line because that is what it has to be
 * recognisable as - the title plays it, and the run is made of the same
 * gesture over and over.
 */
export const THEME: Strike[] = [
    { semitones: HOME, at: 0, gain: 0.6 },
    { semitones: HOME + 4, at: 0.13, gain: 0.6 },
    { semitones: HOME + 7, at: 0.26, gain: 0.65 },

    { semitones: HOME + 7, at: 0.60, gain: 0.6 },
    { semitones: HOME + 9, at: 0.73, gain: 0.6 },
    { semitones: HOME + 12, at: 0.86, gain: 0.7 },

    { semitones: HOME + 12, at: 1.20, gain: 0.6 },
    { semitones: HOME + 16, at: 1.33, gain: 0.65 },
    { semitones: HOME + 19, at: 1.46, gain: 0.75 },

    { semitones: HOME + 12, at: 1.85, gain: 0.9 },
    { semitones: HOME - 12, at: 1.85, gain: 0.5, timbre: 'deep' }
];

/** Seconds as beats, for anything written in one that is played in the other. */
export function beatsOf (seconds: number): number
{
    return (seconds * MUSIC_BPM) / 60;
}

/**
 * Where the water sits, one entry per four bars.
 *
 * Two of them, and that is the whole harmony. A stream does not have a chord
 * progression; what it has is a note it settles around, and moving that note
 * every four bars is enough to keep a run from feeling like it is standing
 * still. Anything faster would be music the player has to listen to.
 */
const ROOTS = [ HOME, HOME - 3 ];

/** How many bars before the whole thing comes round again. */
export const LOOP_BARS = 8;

/** A note in the backing: which note, which beat of the bar, how hard. */
export interface Beat
{
    semitones: number;

    /** Beats from the start of the bar. */
    beat: number;

    gain: number;

    /** What kind of water it is. The backing is never a bubble. */
    timbre?: Timbre;
}

/**
 * One bar of the backing: running water, and the note under it.
 *
 * There is no rhythm here on purpose. The game already makes a sound every
 * time an orb goes past - up to eight a second on the hardest levels - and a
 * backing with a pattern of its own underneath that was the thing that made it
 * all sound busy. This is a colour rather than a part.
 *
 * @param bar Which bar of the run, counted from the first. Loops on its own.
 */
export function barNotes (bar: number): Beat[]
{
    const step = ((bar % LOOP_BARS) + LOOP_BARS) % LOOP_BARS;
    const root = ROOTS[Math.floor(step / 4) % ROOTS.length];

    const notes: Beat[] = [
        { semitones: root - 12, beat: 0, gain: 0.5, timbre: 'deep' },
        { semitones: root, beat: 0, gain: 0.55, timbre: 'stream' },

        //  A second low note halfway through, a fifth up, so the floor moves
        //  once a bar without anything above it having to.
        { semitones: root - 5, beat: MUSIC_BEATS_PER_BAR / 2, gain: 0.3, timbre: 'deep' }
    ];

    return notes.filter((note) => note.beat < MUSIC_BEATS_PER_BAR);
}
