import { MUSIC_BEATS_PER_BAR, MUSIC_BPM, ORB_BASE_SEMITONES } from './constants';
import { Strike } from './audio';

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

/** The theme's opening, which is the part anybody would hum back. */
export const HOOK = THEME.slice(0, 4);

/** Seconds as beats, so the hook keeps the theme's own speed inside a bar. */
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

/** Where in the bar the three chord notes fall, in beats. */
const ARPEGGIO = [ 1, 2.5, 3.5 ];

/** How many bars before the whole thing comes round again. */
export const LOOP_BARS = 8;

/** A note in the backing: which note, which beat of the bar, how hard. */
export interface Beat
{
    semitones: number;

    /** Beats from the start of the bar. */
    beat: number;

    gain: number;
}

/**
 * One bar of the backing.
 *
 * Bass on the downbeat, three chord notes spread across the rest of it, and
 * the theme's opening over the top once every eight bars - often enough that
 * the run has a tune in it, rarely enough that it is never the thing being
 * listened to.
 *
 * @param bar Which bar of the run, counted from the first. Loops on its own.
 */
export function barNotes (bar: number): Beat[]
{
    const step = ((bar % LOOP_BARS) + LOOP_BARS) % LOOP_BARS;
    const chord = CHORDS[step % CHORDS.length];

    //  An octave down, and quiet: this is the floor the rest stands on rather
    //  than something to be heard on its own. Struck twice a bar because a low
    //  note on this instrument has stopped ringing before the bar is out, and
    //  a floor with a hole in it is heard as the music stopping.
    const notes: Beat[] = [
        { semitones: chord.root - 12, beat: 0, gain: 0.75 },
        { semitones: chord.root - 12, beat: MUSIC_BEATS_PER_BAR / 2, gain: 0.45 }
    ];

    chord.shape.forEach((interval, i) => {

        notes.push({ semitones: chord.root + interval, beat: ARPEGGIO[i], gain: 0.4 });

    });

    //  The hook, an octave up, on the first bar of every loop. Its own timing
    //  is in seconds, so it is placed by the bar it starts on and left alone.
    if (step === 0)
    {
        for (const note of HOOK)
        {
            notes.push({ semitones: note.semitones + 12, beat: beatsOf(note.at), gain: 0.3 });
        }
    }

    return notes.filter((note) => note.beat < MUSIC_BEATS_PER_BAR);
}
