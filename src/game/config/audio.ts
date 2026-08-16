import { MUSIC_BPM, ORB_SEMITONES, SOUND_ROOT_HZ } from './constants';
import { jingle, THEME } from './musicMenu';
import { Timbre } from '../systems/voice';

//  What the game sounds like.
//
//  Synthesised rather than sampled. The game ships no assets at all - every
//  world, every drop, every panel is drawn from numbers - and a folder of wav
//  files would be the first thing in it, plus a loading screen to fetch them
//  with.
//
//  The division of labour matters more than any of the sounds. The music
//  carries the tune and the beat; the game only ticks along on top of it. What
//  the player did is on the screen, so the sound does not need to narrate it -
//  and a game that narrates every input is a game people mute.

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

    /** Extra ring, in seconds, for a note that was written long. */
    held?: number;
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
    return cue !== 'fail' && cue !== 'finish' && cue !== 'title' && cue !== 'life';
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
 * The note a collected orb plays, which is the same note every time.
 *
 * It used to climb with the streak. That was the single most-heard sound in
 * the game and also the one that changed most, which is backwards: the score
 * is on the screen, and a tick that is different every time is a tick the ear
 * cannot stop listening to. It is the root of the key, so it fits every chord
 * of the backing and can land at any moment.
 */
export function semitonesFor (): number
{
    return ORB_SEMITONES;
}

export function frequencyOf (semitones: number): number
{
    return SOUND_ROOT_HZ * Math.pow(2, semitones / 12);
}

/** The pitch of the tick, in hertz. */
export function pitchFor (): number
{
    return frequencyOf(ORB_SEMITONES);
}

/**
 * The sound each moment makes.
 *
 * Most of them are one note. The instrument rings for a second or more on its
 * own and the room holds it for three, so a cue with several notes in it is a
 * phrase rather than a sound - which is right for the three moments that end
 * something, and wrong for the ones that happen while the player is reading the
 * road.
 */
export function voiceFor (cue: Cue): Strike[]
{
    switch (cue)
    {
        //  The tick. Always the same, always quiet: this is the sound of the
        //  game agreeing with you, not the sound of the game congratulating
        //  you.
        case 'orb':
            return [ { semitones: ORB_SEMITONES, at: 0, gain: 0.55 } ];

        //  The only cue that has to cut through the music, and the only one
        //  that is not in the key: a semitone under the octave of the root,
        //  with the bottom of the bass under it.
        case 'wrong':
            return [
                { semitones: 11, at: 0, gain: 0.7 },
                { semitones: -13, at: 0.04, gain: 0.75, timbre: 'bass' },
                { semitones: 0, at: 0, gain: 0.5, timbre: 'snare' }
            ];

        //  A doorway, at a dozen a level, is the hi-hat of the game: heard
        //  without ever being listened to.
        case 'gate':
            return [ { semitones: 0, at: 0, gain: 0.3, timbre: 'hat' } ];

        //  Nothing at all. Jumping is a thing the player did on purpose and
        //  can see happening; a sound on top of it is the game repeating
        //  itself back at them.
        case 'jump':
            return [];

        case 'land':
            return [];

        case 'rainbow':
            return [ 12, 19, 24, 31 ].map((semitones, i) => ({
                semitones, at: i * 0.05, gain: 0.5, timbre: 'lead' as Timbre
            }));

        //  A chance gone: the kick and the bottom of the bass together, which
        //  is the heaviest thing this instrument can do.
        case 'life':
            return [
                { semitones: 0, at: 0, gain: 0.9, timbre: 'kick' },
                { semitones: -13, at: 0.02, gain: 0.7, timbre: 'bass' },
                { semitones: -25, at: 0.14, gain: 0.6, timbre: 'bass' }
            ];

        //  The two written jingles. They are a pair - the same seven-note shape
        //  going up and coming down - so the game only has to say which of the
        //  two happened and the music says the rest.
        case 'fail':
            return jingle(false, 60 / MUSIC_BPM);

        case 'finish':
            return jingle(true, 60 / MUSIC_BPM);

        //  Barely there. A menu that clicks loudly is a menu people turn off.
        case 'press':
            return [ { semitones: 12, at: 0, gain: 0.22 } ];

        //  The game's tune, unaccompanied, the way a cabinet announces itself
        //  across a room.
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
