import { ORB_BASE_SEMITONES, ORB_MAX_SEMITONES, SOUND_ROOT_HZ } from './constants';
import { THEME } from './music';
import { Timbre } from '../systems/voice';

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

    /**
     * How it is played: struck by default, or held for the notes that are
     * there to be a chord rather than an event.
     */
    timbre?: Timbre;
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
 * Minor pentatonic.
 *
 * The point of it is what it leaves out: there is no semitone anywhere in the
 * scale, so no two notes in it can sound wrong together however they are
 * ordered or overlapped. A streak plays whatever the player happens to collect
 * at whatever speed they collect it, and the room holds each note into the next
 * few - with a scale that has a fourth or a seventh in it, that is a matter of
 * luck, and it comes out sour often enough to be noticed.
 */
const PENTATONIC = [ 0, 3, 5, 7, 10 ];

/**
 * The figure a streak plays once it has climbed as far as it may.
 *
 * All of it inside the top fifth and landing on the ceiling twice, so it reads
 * as arriving rather than as slipping back down the scale.
 */
const CROWN = [ 12, 10, 12, 7, 10, 12 ];

/** The step the climb reaches the ceiling on, after which the figure takes over. */
export const CROWN_FROM = 5;

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
    return SOUND_ROOT_HZ * Math.pow(2, semitones / 12);
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
        //  The one sound the player hears constantly, and the one the whole
        //  instrument is tuned around.
        case 'orb':
            return [ { semitones: semitonesFor(combo), at: 0, gain: 0.75 } ];

        //  A tritone below the root, with the bottom of the range under it.
        //  In a minor palette it is the only interval that sounds like a
        //  warning rather than like music, which is exactly the job.
        case 'wrong':
            return [
                { semitones: -11, at: 0, gain: 0.8 },
                { semitones: -23, at: 0.02, gain: 0.6, timbre: 'bass' }
            ];

        //  A doorway is not a reward or a mistake - it is a door opening, and
        //  at a dozen a level it has to stay under whatever the streak is
        //  doing above it.
        case 'gate':
            return [
                { semitones: -17, at: 0, gain: 0.34, timbre: 'pad' },
                { semitones: -10, at: 0.02, gain: 0.26, timbre: 'pad' }
            ];

        case 'jump':
            return [ { semitones: 15, at: 0, gain: 0.34 } ];

        //  Lower and quieter than the take-off, so an arc reads as one gesture
        //  with two ends rather than as two events.
        case 'land':
            return [ { semitones: 3, at: 0, gain: 0.26 } ];

        //  The one cue that is unmistakably good news: a run up the whole
        //  scale, which is the only time the game plays more than one note at
        //  the player in a row.
        case 'rainbow':
            return [ 0, 3, 7, 10, 12, 15 ].map((semitones, i) => ({
                semitones, at: i * 0.07, gain: 0.42
            }));

        //  The heaviest thing in the game, because losing one of three chances
        //  is the most important thing that happens in a run.
        case 'life':
            return [
                { semitones: -17, at: 0, gain: 0.85 },
                { semitones: -24, at: 0.03, gain: 0.7, timbre: 'bass' }
            ];

        //  Running out: down, and deliberately not ugly. The run ending is
        //  already clear from everything else on the screen, and a harsh sound
        //  on top of it makes the player want to stop playing rather than
        //  press retry.
        case 'fail':
            return [
                { semitones: -5, at: 0, gain: 0.7 },
                { semitones: -9, at: 0.16, gain: 0.65 },
                { semitones: -12, at: 0.34, gain: 0.8 },
                { semitones: -24, at: 0.36, gain: 0.5, timbre: 'bass' }
            ];

        //  Reaching the finish: up through the octave, over a chord that opens
        //  underneath it.
        case 'finish':
            return [
                { semitones: -12, at: 0, gain: 0.5, timbre: 'bass' },
                { semitones: 0, at: 0.02, gain: 0.35, timbre: 'pad' },
                { semitones: 0, at: 0.04, gain: 0.6 },
                { semitones: 7, at: 0.16, gain: 0.6 },
                { semitones: 12, at: 0.28, gain: 0.7 },
                { semitones: 19, at: 0.44, gain: 0.8 }
            ];

        //  Barely there. A menu that clicks loudly is a menu people turn off.
        case 'press':
            return [ { semitones: 7, at: 0, gain: 0.2 } ];

        //  The game's tune, whole. It is also what the backing is built from,
        //  so the title is where the player learns it.
        case 'title':
            return THEME;
    }
}

/**
 * How close two cues have to be before the game starts thinning them.
 *
 * The shipped levels ask for up to eight sounds a second on their busiest
 * stretches, with gaps of an eighth of a second - and every one of those
 * sounds is copied into a room that holds it afterwards. Played in full, a
 * hard stretch is two dozen sounds at once: twice the loudness of a calm one,
 * and a wash rather than a run of collects.
 *
 * A little over an eighth of a second, so an ordinary level never trips it and
 * only the stretches that are genuinely crowded are thinned.
 */
export const CROWD_SECONDS = 0.3;

/** How much a cue gives up when it lands in a crowd. */
export const CROWD_DUCK = 0.72;

/**
 * A cue as it is played when the last one was `sinceLast` seconds ago.
 *
 * Crowded, it keeps the note that has to be heard and drops the chord and the
 * bass underneath it. Those are there to give a single cue a body, and a body
 * is exactly what a stretch of them does not need - eight a second are already
 * holding each other up.
 *
 * The phrases that mark an ending are never thinned; they are handed here
 * unchanged because nothing that plays once a run is what makes it crowded.
 */
export function thinned (notes: Strike[], sinceLast: number): Strike[]
{
    if (sinceLast >= CROWD_SECONDS)
    {
        return notes;
    }

    const heard = notes.filter((note) => note.timbre === undefined);
    const kept = heard.length > 0 ? heard : notes.slice(0, 1);

    return kept.map((note) => ({ ...note, gain: note.gain * CROWD_DUCK }));
}

/** Every cue there is, so a test can hold the table to being complete. */
export const CUES: Cue[] = [
    'orb', 'wrong', 'gate', 'jump', 'land', 'rainbow', 'life', 'fail', 'finish', 'press', 'title'
];
