import { PIANO_MISS_SEMITONES, PIANO_ROOT_HZ, PIANO_STREAK_CAP } from '../config/constants';
import { clamp } from '../utils/math';

//  What the game plays, as numbers.
//
//  Kept apart from the thing that makes the noise for the same reason the
//  contact rules are kept out of the entities that draw them: what note a
//  streak is worth is a rule, and a rule that needs a sound card to check is a
//  rule nobody checks.
//
//  Everything is a count of semitones from the root, never a frequency, so the
//  whole game can be moved to another key by changing one constant.

/**
 * Major pentatonic.
 *
 * The point of it is what it leaves out: there is no semitone anywhere in the
 * scale, so no two notes in it can sound wrong together however they are
 * ordered or overlapped. A streak plays whatever the player happens to collect
 * at whatever speed they collect it, and the reverb holds each note into the
 * next few - with a scale that has a fourth or a seventh in it, that is a
 * matter of luck, and it comes out sour often enough to be noticed.
 */
const SCALE = [ 0, 2, 4, 7, 9 ];

/** A note in a written phrase: how high, how far in, and how hard. */
export interface Note
{
    semitones: number;

    /** Seconds after the phrase starts. */
    at: number;

    gain: number;
}

/**
 * How many steps up the scale a streak of `streak` collected orbs has climbed.
 *
 * The first orb of a run is step 0 - the root - so the scale starts where the
 * jingles do rather than one note above it. Held at the cap rather than wrapped
 * back down: a long streak that suddenly dropped an octave would read as having
 * been lost.
 */
export function stepFor (streak: number): number
{
    return clamp(Math.floor(streak) - 1, 0, PIANO_STREAK_CAP);
}

/**
 * The note at a given step of the scale, in semitones from the root.
 *
 * Steps past the end of the scale carry on into the next octave, which is what
 * makes an unbroken streak climb rather than run out of notes after five orbs.
 */
export function semitonesAt (step: number): number
{
    const octave = Math.floor(step / SCALE.length);

    return SCALE[step % SCALE.length] + (octave * 12);
}

/** The note a correct orb plays, given the streak it is part of. */
export function collectSemitones (streak: number): number
{
    return semitonesAt(stepFor(streak));
}

/** The note a wrong colour plays. Low, and not in the scale the streak climbs. */
export function missSemitones (): number
{
    return PIANO_MISS_SEMITONES;
}

export function frequencyOf (semitones: number): number
{
    return PIANO_ROOT_HZ * Math.pow(2, semitones / 12);
}

/**
 * The title's phrase: the drop falling, in five notes.
 *
 * Open fifths and octaves rather than thirds, so it states the key without
 * saying whether the game is happy or sad about it - and the last two are the
 * same note an octave apart, which is the most final way a phrase can end
 * without a chord under it.
 */
export const TITLE_JINGLE: Note[] = [
    { semitones: 0, at: 0, gain: 0.9 },
    { semitones: 7, at: 0.16, gain: 0.8 },
    { semitones: 12, at: 0.32, gain: 0.85 },
    { semitones: 16, at: 0.50, gain: 0.7 },
    { semitones: 24, at: 0.76, gain: 1 }
];

/** Reaching the finish: the same shape, faster, and it lands on top. */
export const FINISH_JINGLE: Note[] = [
    { semitones: 12, at: 0, gain: 0.8 },
    { semitones: 16, at: 0.11, gain: 0.8 },
    { semitones: 19, at: 0.22, gain: 0.9 },
    { semitones: 24, at: 0.34, gain: 1 }
];

/**
 * Running out: the finish phrase upside down, and low.
 *
 * Deliberately not ugly. The run ending is already clear from everything else
 * on screen, and a harsh sound on top of it makes the player want to stop
 * playing rather than press retry.
 */
export const FAIL_JINGLE: Note[] = [
    { semitones: -5, at: 0, gain: 0.8 },
    { semitones: -8, at: 0.14, gain: 0.7 },
    { semitones: -12, at: 0.30, gain: 0.9 }
];

/** Passing through a gate: one quiet note, well under the melody. */
export const GATE_SEMITONES = -12;
