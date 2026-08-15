//  What the game sounds like.
//
//  Synthesised rather than sampled. The game ships no assets at all - every
//  world, every drop, every panel is drawn from numbers - and a folder of wav
//  files would be the first thing in it, plus a loading screen to fetch them
//  with. Oscillators cost nothing, load instantly, work offline, and can be
//  tuned by changing a number here rather than by opening an audio editor.
//
//  The trade is real and worth stating: synthesised sound is arcade rather than
//  produced. This will sound like a game from 1985 with a good sense of pitch,
//  not like one from now.
//
//  Kept pure and separate from the thing that plays it, for the usual reason -
//  which sound a moment makes is a design decision, and design decisions that
//  live inside a Web Audio call are ones nobody can check.

/** One sound: a tone that may slide, under an envelope. */
export interface Voice
{
    wave: OscillatorType;

    /** Where the pitch starts and ends, in hertz. Equal for a steady tone. */
    from: number;
    to: number;

    /** How long it lasts, in seconds. */
    seconds: number;

    /** How loud, 0 to 1, before the master volume. */
    gain: number;
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
    | 'press';

/**
 * The note an orb is worth, from the combo it lands on.
 *
 * A pentatonic scale, which is the whole trick: five notes that cannot sound
 * wrong against each other in any order, so a run of collects reads as a tune
 * getting higher rather than as a siren. A chromatic climb would be in tune
 * with nothing and would grate by the fourth orb.
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
export const ORB_BASE_HZ = 392;

const PENTATONIC = [ 0, 2, 4, 7, 9 ];

/** How far above the base a streak may reach, in semitones. Two octaves. */
export const MAX_SEMITONES = 24;

export function pitchFor (combo: number): number
{
    const step = Math.max(0, Math.floor(combo));
    const note = PENTATONIC[step % PENTATONIC.length];
    const octave = Math.floor(step / PENTATONIC.length);

    const semitones = Math.min(MAX_SEMITONES, note + (octave * 12));

    return ORB_BASE_HZ * Math.pow(2, semitones / 12);
}

/**
 * The sound each moment makes.
 *
 * Short, because everything here happens while the player is reading the road
 * and a sound still ringing when the next one starts is mud. Nothing over a
 * third of a second except the two that end a run, which have nothing left to
 * talk over.
 */
export function voiceFor (cue: Cue, combo = 0): Voice
{
    switch (cue)
    {
        //  Rises with the combo. The one sound the player hears constantly, so
        //  it is the quietest thing here and the shortest.
        case 'orb':
            return { wave: 'triangle', from: pitchFor(combo), to: pitchFor(combo), seconds: 0.09, gain: 0.30 };

        //  Down rather than up, and square rather than triangle: a wrong colour
        //  should sound like a wrong colour without anybody having to be told.
        case 'wrong':
            return { wave: 'square', from: 220, to: 110, seconds: 0.20, gain: 0.35 };

        //  A soft swell upwards. A gate is not a reward or a mistake - it is a
        //  door opening, and it happens often enough to need to stay out of the
        //  way.
        case 'gate':
            return { wave: 'sine', from: 300, to: 420, seconds: 0.16, gain: 0.22 };

        case 'jump':
            return { wave: 'sine', from: 340, to: 620, seconds: 0.13, gain: 0.26 };

        //  Lower and shorter than the jump, so an arc reads as one gesture with
        //  two ends rather than as two events.
        case 'land':
            return { wave: 'sine', from: 260, to: 180, seconds: 0.08, gain: 0.20 };

        case 'rainbow':
            return { wave: 'triangle', from: 660, to: 1320, seconds: 0.28, gain: 0.32 };

        //  The heaviest thing in the game, because losing one of three chances
        //  is the most important thing that happens in a run.
        case 'life':
            return { wave: 'sawtooth', from: 180, to: 60, seconds: 0.45, gain: 0.42 };

        case 'fail':
            return { wave: 'sawtooth', from: 300, to: 70, seconds: 0.75, gain: 0.38 };

        case 'finish':
            return { wave: 'triangle', from: 523, to: 1046, seconds: 0.55, gain: 0.36 };

        //  Barely there. A menu that clicks loudly is a menu people turn off.
        case 'press':
            return { wave: 'sine', from: 520, to: 520, seconds: 0.05, gain: 0.16 };
    }
}

/** Every cue there is, so a test can hold the table to being complete. */
export const CUES: Cue[] = [
    'orb', 'wrong', 'gate', 'jump', 'land', 'rainbow', 'life', 'fail', 'finish', 'press'
];

/**
 * Master volume.
 *
 * Low. This is a game played on a phone in public, and the first thing a player
 * does with one that starts loud is silence it for good.
 */
export const MASTER_VOLUME = 0.5;
