import { FINALE_LIFT, MUSIC_BEATS_PER_BAR, MUSIC_BPM, ORB_BASE_SEMITONES } from './constants';
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
const CHORDS: Array<{ root: number; shape: number[]; extra: number[] }> = [
    //  `extra` is what the chord grows in the run-in to the finish: more of
    //  itself, never anything new. Every one of these is a note of the same
    //  five-note scale the player is collecting in, for the reason below.
    { root: HOME, shape: [ 0, 3, 7 ], extra: [ 10, 15 ] },
    { root: HOME + 3, shape: [ 0, 4, 7 ], extra: [ 12, 16 ] },

    //  These two are voiced without their thirds - fourths and fifths stacked
    //  instead. A third would be a semitone away from a note the player can
    //  play, and with a three-second room something is always still sounding:
    //  the chord under a run has to be built from the same five notes the run
    //  is, or a good streak lands on a clash sooner or later.
    { root: HOME + 10, shape: [ 0, 5, 7 ], extra: [ 12, 17 ] },
    { root: HOME + 7, shape: [ 0, 3, 5 ], extra: [ 12, 15 ] }
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
 * @param bar    Which bar of the run, counted from the first. Loops on its own.
 * @param finale How far into the run-in to the finish, 0 to 1. Above zero the
 *               bar changes chord halfway through and each chord carries more
 *               of itself - see `chordAt`.
 */
export function barNotes (bar: number, finale = 0): Beat[]
{
    const step = ((bar % LOOP_BARS) + LOOP_BARS) % LOOP_BARS;
    const half = MUSIC_BEATS_PER_BAR / 2;
    const lift = 1 + (FINALE_LIFT * finale);

    const notes: Beat[] = [
        { semitones: CHORDS[step % CHORDS.length].root - 12, beat: 0, gain: 0.7 * lift, timbre: 'bass' }
    ];

    //  Ordinarily one chord a bar with the bass struck again halfway through.
    //  In the run-in the halfway point becomes the next chord instead, so the
    //  progression moves at twice the speed without a single new sound being
    //  introduced - which is what makes it read as arriving rather than as
    //  something else starting.
    laid(CHORDS[step % CHORDS.length], 0, finale, lift, notes);

    if (finale > 0)
    {
        const next = CHORDS[(step + 1) % CHORDS.length];

        notes.push({ semitones: next.root - 12, beat: half, gain: 0.55 * lift, timbre: 'bass' });
        laid(next, half, finale, lift, notes);
    }
    else
    {
        notes.push({ semitones: CHORDS[step % CHORDS.length].root - 12, beat: half, gain: 0.45, timbre: 'bass' });
    }

    return notes.filter((note) => note.beat < MUSIC_BEATS_PER_BAR);
}

/**
 * Lays one chord down at `beat`, with as much of it as the finale asks for.
 *
 * The extra notes come in one at a time rather than all at once, so the last
 * ten seconds of a level are a chord thickening rather than a switch being
 * thrown.
 */
function laid (
    chord: { root: number; shape: number[]; extra: number[] },
    beat: number,
    finale: number,
    lift: number,
    into: Beat[]
): void
{
    const grown = chord.extra.slice(0, Math.round(finale * chord.extra.length));

    //  Laid down together, barely spread, so the chord is heard as one thing
    //  rather than as several notes that happen to agree.
    [ ...chord.shape, ...grown ].forEach((interval, i) => {

        into.push({
            semitones: chord.root + interval,
            beat: beat + (0.05 * i),
            gain: (i < chord.shape.length ? 0.4 : 0.3) * lift,
            timbre: 'pad'
        });

    });
}
