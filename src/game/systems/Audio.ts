import { Cue, DETUNE_CENTS, Strike, thinned, variesOnRepeat, voiceFor } from '../config/audio';
import { CROWD_SECONDS } from '../config/audio';
import { PIANO_GAIN } from '../config/constants';
import { buildMixer, Mixer } from './mixer';
import { strike } from './voice';

//  The thing that makes the noise.
//
//  Everything here is written to be optional. Web Audio can be absent, it can
//  throw on construction, and it is not allowed to make a sound at all until
//  the player has touched the page - so every path through this file has to end
//  with the game carrying on regardless. A game that fails to start because a
//  browser would not give it an oscillator is a worse game than a silent one.
//
//  One context for the whole session, held statically. Browsers cap how many a
//  page may have and a scene restart would otherwise leak one per run.

let context: AudioContext | null = null;
let mixer: Mixer | null = null;
let unavailable = false;
let muted = false;
let listening = false;

/** When the last cue was played, on the audio clock, to hear a crowd coming. */
let lastCueAt = -1;

/** Asked for before the browser would allow it, and owed once it does. */
let owed: (() => void) | null = null;

/** The context, made on first use, or null where there is none to be had. */
function audio (): AudioContext | null
{
    if (unavailable)
    {
        return null;
    }

    if (context !== null)
    {
        return context;
    }

    try
    {
        const Ctor = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (Ctor === undefined)
        {
            unavailable = true;

            return null;
        }

        context = new Ctor();
    }
    catch
    {
        //  Some browsers throw rather than returning nothing. Either way the
        //  answer is the same and it is only asked once.
        unavailable = true;

        return null;
    }

    return context;
}

/**
 * Wake the audio up, on a real user gesture.
 *
 * Browsers start a context suspended and refuse to resume it except from inside
 * a genuine input event, so this has to be called from a tap rather than from
 * scene setup. Calling it more often than needed is harmless.
 */
export function wakeAudio (): void
{
    const ctx = audio();

    if (ctx !== null && ctx.state === 'suspended')
    {
        void ctx.resume().catch(() => undefined);
    }

    const pending = owed;

    owed = null;
    pending?.();
}

/**
 * Wakes the audio on whatever gesture arrives first, wherever it arrives.
 *
 * The buttons already wake it when they are pressed, which covers a phone -
 * every touch on this game is a button. A keyboard player never presses one:
 * the title is started with Enter and the road is steered with arrows, so
 * without this the whole game is silent on a desktop until something is
 * clicked. Left attached rather than taken off after the first one, because a
 * page that has been in the background comes back suspended and needs waking
 * again.
 */
export function listenForGesture (): void
{
    if (typeof window === 'undefined' || listening)
    {
        return;
    }

    listening = true;

    window.addEventListener('pointerdown', () => wakeAudio());
    window.addEventListener('keydown', () => wakeAudio());
}

/**
 * Runs `fn` as soon as there is audio to run it into.
 *
 * The title screen wants to play its phrase the moment it appears, and on a
 * cold load there is no audio yet - a browser will not start any until the
 * player has touched the page. Rather than drop the phrase, it waits for the
 * touch that was going to arrive anyway.
 */
export function onWake (fn: () => void): void
{
    //  Deliberately reading the context rather than asking for one: a context
    //  built before the page has been touched is a context some browsers never
    //  let go of again, and there is nothing to play into yet anyway.
    const ctx = context;

    if (ctx !== null && ctx.state === 'running')
    {
        fn();

        return;
    }

    owed = fn;
}

/** Whether sound is currently off. */
export function isMuted (): boolean
{
    return muted;
}

/** Turn sound on or off. Persisting the choice is the caller's business. */
export function setMuted (value: boolean): void
{
    muted = value;
}

/**
 * Make the noise for a moment.
 *
 * Silent and harmless when muted, when there is no context, or when the context
 * has not been woken yet - all three are ordinary states rather than errors.
 *
 * @param combo Where the run's streak is, for the cues whose pitch follows it.
 */
export function play (cue: Cue, combo = 0): void
{
    if (muted)
    {
        return;
    }

    const ctx = audio();

    if (ctx === null || ctx.state !== 'running')
    {
        return;
    }

    try
    {

        //  A fraction of a semitone either way, so a sound repeating hundreds
        //  of times a run is never byte-for-byte the same twice. Not applied to
        //  the written phrases - those play once and should be the sound the
        //  player remembers rather than a slightly different one each time.
        const drift = variesOnRepeat(cue)
            ? (((Math.random() * 2) - 1) * DETUNE_CENTS) / 100
            : 0;

        //  Thinned when they are arriving on top of each other, and the copy
        //  into the room dropped with them: the room is where a busy stretch
        //  turns into a wash, because every note is held there for three
        //  seconds after the note itself has gone.
        const now = ctx.currentTime;
        const gap = lastCueAt < 0 ? Infinity : now - lastCueAt;
        const crowded = variesOnRepeat(cue) && gap < CROWD_SECONDS;
        const notes = crowded ? thinned(voiceFor(cue, combo), gap) : voiceFor(cue, combo);

        lastCueAt = now;

        schedule(ctx, notes, now, PIANO_GAIN, drift, !crowded);
    }
    catch
    {
        //  A sound that will not play is not worth interrupting a run for.
    }
}

/**
 * The audio clock, or null when there is nothing running to read it from.
 *
 * Music has to be handed to the sound card before it is due, so the thing
 * writing it needs to know what time the card thinks it is - which is not the
 * same clock as the game's.
 */
export function audioTime (): number | null
{
    return context !== null && context.state === 'running' ? context.currentTime : null;
}

/**
 * Notes at a given moment on that clock, rather than now.
 *
 * The backing is written ahead of itself, which is the only way a browser
 * plays anything in time: a note handed over a second early lands exactly when
 * it was asked to, however busy the frame that asked is.
 */
export function playAt (notes: Strike[], when: number, gain = 1): void
{
    if (muted)
    {
        return;
    }

    const ctx = audio();

    if (ctx === null || ctx.state !== 'running')
    {
        return;
    }

    try
    {
        schedule(ctx, notes, when, gain * PIANO_GAIN, 0, true);
    }
    catch
    {
        //  As above: a sound that will not play is not worth a broken run.
    }
}

/**
 * Hands a set of notes to the clock, twice over: once straight out, once into
 * the room. The room is the loud half, which is why a note is sent there
 * rather than passed through it.
 */
function schedule (
    ctx: AudioContext,
    notes: Strike[],
    from: number,
    gain: number,
    drift: number,
    room: boolean
): void
{
    const chain = mixer ??= buildMixer(ctx, ctx.destination);
    const offset = from - ctx.currentTime;

    for (const note of notes)
    {
        //  Anything already in the past is dropped rather than played late: a
        //  phone that was asleep comes back with a backlog, and a bar's worth
        //  of music arriving at once is worse than a missing bar.
        if (note.at + offset < -0.05)
        {
            continue;
        }

        strike(ctx, chain.dry, note.semitones + drift, note.at + offset, note.gain * gain, note.timbre);

        if (room)
        {
            strike(ctx, chain.send, note.semitones + drift, note.at + offset, note.gain * gain, note.timbre);
        }
    }
}

/** Forget everything, so a test can start from nothing. */
export function resetAudioForTest (): void
{
    context = null;
    mixer = null;
    unavailable = false;
    muted = false;
    owed = null;
    listening = false;
    lastCueAt = -1;
}
