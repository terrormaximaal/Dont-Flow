import { ORB_BASE_SEMITONES, ORB_MAX_SEMITONES, PIANO_ROOT_HZ } from './constants';
import { THEME } from './music';

//  What the game sounds like.
//
//  Synthesised rather than sampled. The game ships no assets at all - every
//  world, every drop, every panel is drawn from numbers - and a folder of wav
//  files would be the first thing in it, plus a loading screen to fetch them
//  with. Oscillators cost nothing, load instantly, work offline, and can be
//  tuned by changing a number here rather than by opening an audio editor.
//
//  One instrument plays all of it: a struck note built from three partials,
//  into a long room. That is `systems/voice`; this file is only what is played
//  on it and when - which is a design decision, and design decisions that live
//  inside a Web Audio call are ones nobody can check.
//
//  Everything is written as a count of semitones from the root rather than as a
//  frequency, so the whole game can be moved to another key by changing one
//  number, and so two sounds can be compared by reading them.

/** One note in a cue: how high, how far into the cue, and how hard. */
export interface Strike
{
    semitones: number;

    /** Seconds after the cue starts. */
    at: number;

    /** 0 to 1, before the master volume. */
    gain: number;
}

/**
 * How far a repeat is nudged off pitch, in cents.
 *
 * A hundred cents is a semitone, so this is a fraction of one - not a different
 * note, just not the *identical* note. Every sound in this game repeats: orbs
 * hundreds of times a run, gates a dozen times a level. Played back byte-for-
 * byte identical they stop sounding like a game and start sounding like a
 * machine, and the ear notices long before the player could say why.
 *
 * Deliberately not applied to the three written phrases. Those play once and
 * are the only sounds here anybody will remember, so they should be the same
 * every time.
 */
export const DETUNE_CENTS = 9;

/** Whether a cue is nudged off pitch on repeat. */
export function variesOnRepeat (cue: Cue): boolean
{
    return cue !== 'fail' && cue !== 'finish' && cue !== 'title';
}

/** Everything the game can make a noise about. */
export type Cue =
    | 'orb'
    | 'wrong'
    | 'gate'
    | 'jump'
    | 'land'
    | 'rainbow'
    | 'life'
    | 'fail'
    | 'finish'
    | 'press'
    | 'title';

/**
 * Major pentatonic.
 *
 * The point of it is what it leaves out: there is no semitone anywhere in the
 * scale, so no two notes in it can sound wrong together however they are
 * ordered or overlapped. A streak plays whatever the player happens to collect
 * at whatever speed they collect it, and the room holds each note into the next
 * few - with a scale that has a fourth or a seventh in it, that is a matter of
 * luck, and it comes out sour often enough to be noticed.
 */
const PENTATONIC = [ 0, 2, 4, 7, 9 ];

/**
 * The figure a streak plays once it has climbed as far as it may.
 *
 * All of it inside the top fifth and landing on the ceiling twice, so it reads
 * as arriving rather than as slipping back down the scale.
 */
const CROWN = [ 24, 21, 24, 19, 21, 24 ];

/** The step the climb reaches the ceiling on, after which the figure takes over. */
export const CROWN_FROM = 10;

/**
 * The note an orb is worth, from the combo it lands on, in semitones.
 *
 * Capped two octaves up. Past that it stops being a reward and starts being a
 * noise complaint.
 *
 * The cap is on the whole interval rather than on the octave, which is where
 * the first version of this was wrong: clamping the octave while letting the
 * note carry on cycling meant the top of the second octave overshot the cap and
 * then *fell* when the octave clamped - a fifteen-orb streak sounded lower than
 * a fourteen-orb one. Clamping the total holds the last note instead, which is
 * what "stops climbing" is supposed to mean.
 */
export function semitonesFor (combo: number): number
{
    const step = Math.max(0, Math.floor(combo));
    const note = PENTATONIC[step % PENTATONIC.length];
    const octave = Math.floor(step / PENTATONIC.length);

    const climbed = note + (octave * 12);

    if (climbed < ORB_MAX_SEMITONES)
    {
        return ORB_BASE_SEMITONES + climbed;
    }

    //  At the top it turns around the top rather than repeating the top note.
    //
    //  Holding one note was the honest reading of "it stops climbing", and it
    //  is what a long streak actually sounds like: the same note, once an orb,
    //  for as long as the player keeps playing well. Rewarding a good run with
    //  the most monotonous sound in the game is exactly backwards. This keeps
    //  it up there and keeps it moving - a small figure that always comes back
    //  to the top note, so the ceiling is still heard as a ceiling.
    const turned = step - CROWN_FROM;

    return ORB_BASE_SEMITONES + CROWN[((turned % CROWN.length) + CROWN.length) % CROWN.length];
}

export function frequencyOf (semitones: number): number
{
    return PIANO_ROOT_HZ * Math.pow(2, semitones / 12);
}

/** The note an orb is worth, in hertz. */
export function pitchFor (combo: number): number
{
    return frequencyOf(semitonesFor(combo));
}

/** Where a streak starts, in hertz. */
export const ORB_BASE_HZ = frequencyOf(ORB_BASE_SEMITONES);

/**
 * The sound each moment makes.
 *
 * Most of them are one note. The instrument rings for a second or more on its
 * own and the room holds it for three, so a cue with several notes in it is a
 * phrase rather than a sound - which is right for the three moments that end
 * something, and wrong for the ones that happen while the player is reading the
 * road.
 */
export function voiceFor (cue: Cue, combo = 0): Strike[]
{
    switch (cue)
    {
        //  Rises with the combo, and is the one sound the player hears
        //  constantly - so it carries the tune and nothing else is allowed to
        //  be louder than it.
        case 'orb':
            return [ { semitones: semitonesFor(combo), at: 0, gain: 1 } ];

        //  Below everything a streak can reach, and the only interval in the
        //  game that is not in the scale: a wrong colour should sound wrong
        //  without anybody having to be told. Two notes, the second lower, so
        //  it is heard as falling rather than as a low note.
        case 'wrong':
            return [
                { semitones: -17, at: 0, gain: 0.85 },
                { semitones: -22, at: 0.10, gain: 0.5 }
            ];

        //  A gate is not a reward or a mistake, it is a door opening - and at a
        //  dozen a level it has to stay under whatever the streak is doing.
        case 'gate':
            return [ { semitones: -12, at: 0, gain: 0.45 } ];

        case 'jump':
            return [ { semitones: 12, at: 0, gain: 0.4 } ];

        //  Lower than the jump and quieter, so an arc reads as one gesture with
        //  two ends rather than as two events.
        case 'land':
            return [ { semitones: 0, at: 0, gain: 0.28 } ];

        //  The one cue that is unmistakably good news, so it gets the only
        //  bright arpeggio in the game.
        case 'rainbow':
            return [
                { semitones: 12, at: 0, gain: 0.6 },
                { semitones: 16, at: 0.07, gain: 0.6 },
                { semitones: 19, at: 0.14, gain: 0.6 },
                { semitones: 24, at: 0.21, gain: 0.7 }
            ];

        //  The heaviest thing in the game, because losing one of three chances
        //  is the most important thing that happens in a run.
        case 'life':
            return [
                { semitones: -24, at: 0, gain: 1 },
                { semitones: -19, at: 0.06, gain: 0.6 }
            ];

        //  Running out: the finish upside down, and low. Deliberately not ugly.
        //  The run ending is already clear from everything else on the screen,
        //  and a harsh sound on top of it makes the player want to stop playing
        //  rather than press retry.
        case 'fail':
            return [
                { semitones: -5, at: 0, gain: 0.8 },
                { semitones: -8, at: 0.14, gain: 0.7 },
                { semitones: -12, at: 0.30, gain: 0.9 }
            ];

        //  Reaching the finish: the theme's arch, taken up instead of down, so
        //  a level ends on the tune it was played to.
        case 'finish':
            return [
                { semitones: 12, at: 0, gain: 0.8 },
                { semitones: 16, at: 0.13, gain: 0.8 },
                { semitones: 19, at: 0.26, gain: 0.85 },
                { semitones: 24, at: 0.39, gain: 0.9 },
                { semitones: 28, at: 0.62, gain: 1 }
            ];

        //  Barely there. A menu that clicks loudly is a menu people turn off.
        case 'press':
            return [ { semitones: 19, at: 0, gain: 0.22 } ];

        //  The game's tune, whole. It is also what the backing quotes under a
        //  run, so the title is where the player learns it.
        case 'title':
            return THEME;
    }
}

/** Every cue there is, so a test can hold the table to being complete. */
export const CUES: Cue[] = [
    'orb', 'wrong', 'gate', 'jump', 'land', 'rainbow', 'life', 'fail', 'finish', 'press', 'title'
];
