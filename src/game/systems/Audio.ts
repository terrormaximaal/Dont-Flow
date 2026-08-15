import { Cue, DETUNE_CENTS, variesOnRepeat, voiceFor } from '../config/audio';
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
        const chain = mixer ??= buildMixer(ctx, ctx.destination);

        //  A fraction of a semitone either way, so a sound repeating hundreds
        //  of times a run is never byte-for-byte the same twice. Not applied to
        //  the written phrases - those play once and should be the sound the
        //  player remembers rather than a slightly different one each time.
        const drift = variesOnRepeat(cue)
            ? (((Math.random() * 2) - 1) * DETUNE_CENTS) / 100
            : 0;

        for (const note of voiceFor(cue, combo))
        {
            //  Twice over: once straight out, once into the room. The room is
            //  the loud half, which is why the note is sent there rather than
            //  passed through it.
            strike(ctx, chain.dry, note.semitones + drift, note.at, note.gain * PIANO_GAIN);
            strike(ctx, chain.send, note.semitones + drift, note.at, note.gain * PIANO_GAIN);
        }
    }
    catch
    {
        //  A sound that will not play is not worth interrupting a run for.
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
}
