import { Cue, DETUNE_CENTS, MASTER_VOLUME, variesOnRepeat, voiceFor } from '../config/audio';

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
let unavailable = false;
let muted = false;

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
        const voice = voiceFor(cue, combo);
        const now = ctx.currentTime;
        const until = now + voice.seconds;

        const osc = ctx.createOscillator();
        const level = ctx.createGain();

        osc.type = voice.wave;
        osc.frequency.setValueAtTime(voice.from, now);

        //  A fraction of a semitone either way, so a sound repeating hundreds
        //  of times a run is never byte-for-byte the same twice. Not applied to
        //  the two that end a run - those play once and should be the sound
        //  the player remembers rather than a slightly different one each time.
        if (variesOnRepeat(cue))
        {
            osc.detune.setValueAtTime((Math.random() * 2 - 1) * DETUNE_CENTS, now);
        }

        if (voice.to !== voice.from)
        {
            //  Exponential rather than linear, because pitch is heard
            //  logarithmically: a linear sweep from 300 to 1300 spends most of
            //  its time in the top half and reads as a click into a tone.
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, voice.to), until);
        }

        //  A quick attack and a long tail. Starting at zero rather than at full
        //  is what stops every sound beginning with a click, and ramping to a
        //  small non-zero value is what stops the exponential ramp dividing by
        //  nothing.
        const peak = voice.gain * MASTER_VOLUME;

        level.gain.setValueAtTime(0.0001, now);
        level.gain.exponentialRampToValueAtTime(peak, now + ATTACK);
        level.gain.exponentialRampToValueAtTime(0.0001, until);

        //  The top taken off the harsh waves. See Voice.soften.
        if (voice.soften !== undefined)
        {
            const filter = ctx.createBiquadFilter();

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(voice.soften, now);

            osc.connect(filter);
            filter.connect(level);

            osc.onended = () => {

                osc.disconnect();
                filter.disconnect();
                level.disconnect();

            };
        }
        else
        {
            osc.connect(level);
        }

        level.connect(ctx.destination);

        osc.start(now);
        osc.stop(until);

        //  Released as soon as it has finished. Without this every sound the
        //  game has ever made stays connected to the destination for the life
        //  of the page. Already set above where there is a filter to release
        //  as well.
        osc.onended ??= () => {

            osc.disconnect();
            level.disconnect();

        };
    }
    catch
    {
        //  A sound that will not play is not worth interrupting a run for.
    }
}

/** How quickly a sound reaches full volume. Short enough to feel immediate. */
const ATTACK = 0.008;

/** Forget everything, so a test can start from nothing. */
export function resetAudioForTest (): void
{
    context = null;
    unavailable = false;
    muted = false;
}
