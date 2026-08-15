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
 * An arch: up from the root to the octave, a turn around the top, and back
 * down to where it started. Written as one shape rather than as a bar of
 * chords because it has to be recognisable after hearing it twice - the title
 * plays it, and fragments of it turn up under the run.
 */
export const THEME: Strike[] = [
    { semitones: HOME, at: 0, gain: 0.8 },
    { semitones: HOME + 4, at: 0.17, gain: 0.8 },
    { semitones: HOME + 7, at: 0.34, gain: 0.85 },
    { semitones: HOME + 12, at: 0.51, gain: 0.95 },
    { semitones: HOME + 9, at: 0.85, gain: 0.85 },
    { semitones: HOME + 12, at: 1.02, gain: 0.8 },
    { semitones: HOME + 7, at: 1.36, gain: 0.8 },
    { semitones: HOME + 9, at: 1.53, gain: 0.75 },
    { semitones: HOME + 7, at: 1.70, gain: 0.8 },
    { semitones: HOME + 4, at: 2.04, gain: 0.8 },
    { semitones: HOME + 2, at: 2.38, gain: 0.8 },
    { semitones: HOME, at: 2.72, gain: 1 }
];

/** Seconds as beats, for anything written in one that is played in the other. */
export function beatsOf (seconds: number): number
{
    return (seconds * MUSIC_BPM) / 60;
}

/**
 * The chords the backing circles through, one to a bar, as the note each is
 * built from.
 *
 * C, A minor, G, A minor. It never quite settles, which is what a backing
 * wants: a progression that comes home every four bars announces itself, and
 * anything that announces itself during a level is competing with the level.
 */
const CHORDS: Array<{ root: number; shape: number[] }> = [
    //  The home chord, then the one a third below it, then the one that leans
    //  back towards home. Each shape is only ever the scale's own notes: no
    //  chord here has a note in it that a collected orb could not also play.
    { root: HOME, shape: [ 0, 4, 7 ] },
    { root: HOME - 3, shape: [ 0, 3, 7 ] },
    { root: HOME - 5, shape: [ 0, 2, 7 ] },
    { root: HOME - 3, shape: [ 0, 3, 7 ] }
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

    /** Held unless it says otherwise - the backing is chords, not a part. */
    timbre?: Timbre;
}

/** How far apart the notes of one chord are laid down, in beats. */
const SPREAD = 0.06;

/**
 * One bar of the backing: a chord, and the floor under it.
 *
 * @param bar Which bar of the run, counted from the first. Loops on its own.
 */
export function barNotes (bar: number): Beat[]
{
    const step = ((bar % LOOP_BARS) + LOOP_BARS) % LOOP_BARS;
    const chord = CHORDS[step % CHORDS.length];

    //  The whole chord, held, arriving together on the downbeat.
    //
    //  It used to be a bass note and three plucked ones spread across the bar,
    //  which is a pattern rather than a chord: four more events a bar under a
    //  game that is already making one every time an orb goes past, and the
    //  two of them together were the mess. A held chord has no rhythm to get in
    //  the way of - it is a colour the run happens over, and it changes once a
    //  bar without ever asking to be listened to.
    const notes: Beat[] = chord.shape.map((interval, i) => ({
        semitones: chord.root + interval,

        //  Barely spread, so the chord is heard as one thing that has been
        //  laid down rather than as three notes that happen to agree.
        beat: i * SPREAD,
        gain: i === 0 ? 0.9 : 0.55,
        timbre: 'held' as Timbre
    }));

    //  And the floor under it, an octave below the chord's own root, held for
    //  as long as the chord it carries.
    notes.push({ semitones: chord.root - 12, beat: 0, gain: 0.7, timbre: 'held' });

    return notes.filter((note) => note.beat < MUSIC_BEATS_PER_BAR);
}
