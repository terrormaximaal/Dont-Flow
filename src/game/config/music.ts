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
 * Minor, and it does not resolve: it climbs to the octave, falls back, and
 * ends on the fifth rather than on the root - hanging, the way a synth line
 * over a title card does. A tune that comes home says the story is over, and
 * this one is played before the player has started.
 */
export const THEME: Strike[] = [
    { semitones: HOME, at: 0, gain: 0.7 },
    { semitones: HOME + 3, at: 0.20, gain: 0.7 },
    { semitones: HOME + 7, at: 0.40, gain: 0.75 },
    { semitones: HOME + 10, at: 0.60, gain: 0.8 },
    { semitones: HOME + 7, at: 0.90, gain: 0.7 },
    { semitones: HOME + 12, at: 1.10, gain: 0.85 },
    { semitones: HOME + 10, at: 1.45, gain: 0.7 },
    { semitones: HOME + 7, at: 1.65, gain: 0.7 },
    { semitones: HOME + 3, at: 1.90, gain: 0.7 },
    { semitones: HOME + 7, at: 2.20, gain: 0.9 },

    //  The floor under it, struck twice, which is what makes the line sound
    //  like it is standing on something.
    { semitones: HOME - 12, at: 0, gain: 0.5, timbre: 'bass' },
    { semitones: HOME - 12, at: 1.10, gain: 0.45, timbre: 'bass' }
];

/** Seconds as beats, for anything written in one that is played in the other. */
export function beatsOf (seconds: number): number
{
    return (seconds * MUSIC_BPM) / 60;
}

/**
 * The chords the backing circles through, one to a bar.
 *
 * i - III - VII - v, which is the minor loop behind more or less every big
 * minor-key song of the last twenty years. It walks away from home and leans
 * back towards it without ever arriving, which is what a backing wants - a
 * progression that lands every four bars announces itself, and anything that
 * announces itself during a level is competing with the level.
 */
const CHORDS: Array<{ root: number; shape: number[] }> = [
    { root: HOME, shape: [ 0, 3, 7 ] },
    { root: HOME + 3, shape: [ 0, 4, 7 ] },

    //  These two are voiced without their thirds - fourths and fifths stacked
    //  instead. A third would be a semitone away from a note the player can
    //  play, and with a three-second room something is always still sounding:
    //  the chord under a run has to be built from the same five notes the run
    //  is, or a good streak lands on a clash sooner or later.
    { root: HOME + 10, shape: [ 0, 5, 7 ] },
    { root: HOME + 7, shape: [ 0, 3, 5 ] }
];

/** How many bars before the whole thing comes round again. */
export const LOOP_BARS = 8;

/** A note in the backing: which note, which beat of the bar, how hard. */
export interface Beat
{
    semitones: number;

    /** Beats from the start of the bar. */
    beat: number;

    gain: number;

    /** The backing is never the sound the player triggers. */
    timbre?: Timbre;
}

/**
 * One bar of the backing: a chord, and the bass it stands on.
 *
 * The bass is struck twice a bar and the chord once, and that is the entire
 * rhythm of it. The game already makes a sound every time an orb goes past -
 * up to eight a second on the hardest levels - and a backing with a pattern of
 * its own underneath that is what made the whole thing sound busy.
 *
 * @param bar Which bar of the run, counted from the first. Loops on its own.
 */
export function barNotes (bar: number): Beat[]
{
    const step = ((bar % LOOP_BARS) + LOOP_BARS) % LOOP_BARS;
    const chord = CHORDS[step % CHORDS.length];

    const notes: Beat[] = [
        { semitones: chord.root - 12, beat: 0, gain: 0.7, timbre: 'bass' },
        { semitones: chord.root - 12, beat: MUSIC_BEATS_PER_BAR / 2, gain: 0.45, timbre: 'bass' }
    ];

    //  Laid down together, barely spread, so the chord is heard as one thing
    //  rather than as three notes that happen to agree.
    chord.shape.forEach((interval, i) => {

        notes.push({ semitones: chord.root + interval, beat: 0.05 * i, gain: 0.4, timbre: 'pad' });

    });

    return notes.filter((note) => note.beat < MUSIC_BEATS_PER_BAR);
}
