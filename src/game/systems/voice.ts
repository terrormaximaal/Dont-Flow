import { frequencyOf } from '../config/audio';
import {
    BASS_ATTACK,
    BASS_DECAY,
    BASS_HOLD,
    CHORD_ATTACK,
    CHORD_DECAY,
    CHORD_HOLD,
    HAT_DECAY,
    KICK_DECAY,
    LEAD_ATTACK,
    LEAD_DECAY,
    LEAD_DETUNE,
    LEAD_HOLD,
    LEAD_MAX_RING,
    REVERB_SECONDS,
    SNARE_DECAY,
    TICK_ATTACK,
    TICK_DECAY
} from '../config/constants';
import { kick, rattle } from './kit';
import { impulseChannels } from './reverb';

//  The cabinet: four channels and a kit, and the room it stands in.
//
//  Everything takes the context it is to be built in rather than reaching for
//  one, so the same code that plays a note in the game can be rendered offline
//  into a file to listen to - and so nothing here has to know whether it is
//  being heard live.

/**
 * The voices, which are almost all the same voice.
 *
 * 'lead' is the tune, 'chord' the backing under it and 'bass' the bottom of
 * it; 'tick' is the one sound the player's own playing makes, and the three
 * drums are noise and a sine. A chip soundtrack is this and nothing else, and
 * that is the point: there is no depth here to turn into mud.
 */
export type Timbre = 'bass' | 'lead' | 'chord' | 'tick' | 'kick' | 'snare' | 'hat';

/**
 * How long a sound of this kind lasts, in seconds.
 *
 * The pitch is taken but never read: on this instrument nothing rings longer
 * for being lower, because nothing rings. It stays in the signature because
 * every other version of this game's voice needed it and the next one might.
 *
 * @param held Extra ring asked for by a note that was written long, in
 *             seconds, before it is capped.
 */
export function decayOf (_semitones: number, timbre: Timbre = 'tick', held = 0): number
{
    switch (timbre)
    {
        case 'bass': return BASS_ATTACK + BASS_HOLD + BASS_DECAY;
        case 'lead': return LEAD_ATTACK + LEAD_HOLD + ringing(held) + LEAD_DECAY;
        case 'chord': return CHORD_ATTACK + CHORD_HOLD + CHORD_DECAY;
        case 'kick': return KICK_DECAY;
        case 'snare': return SNARE_DECAY;
        case 'hat': return HAT_DECAY;
        default: return TICK_ATTACK + TICK_DECAY;
    }
}

/**
 * How much of a written note's length the tune actually holds on to.
 *
 * The tune has notes written six beats long, and six beats of square wave is
 * not a held note - it is a test tone. It is given a generous fraction of what
 * was written and then let go, which reads as a long note without ever
 * becoming a drone.
 */
function ringing (held: number): number
{
    return Math.min(Math.max(0, held - LEAD_HOLD), LEAD_MAX_RING);
}

/**
 * One sound into `destination`.
 *
 * @param when Seconds from now.
 * @param gain 0 to 1, on top of whatever the destination is set to.
 */
export function strike (
    ctx: BaseAudioContext,
    destination: AudioNode,
    semitones: number,
    when: number,
    gain: number,
    timbre: Timbre = 'tick',
    held = 0
): void
{
    const at = ctx.currentTime + when;

    if (timbre === 'kick')
    {
        kick(ctx, destination, at, gain);

        return;
    }

    if (timbre === 'snare' || timbre === 'hat')
    {
        rattle(ctx, destination, at, gain, timbre === 'snare');

        return;
    }

    const frequency = frequencyOf(semitones);

    if (timbre === 'bass')
    {
        //  A square for the edge and a triangle an octave down for the body.
        //  On a phone the square alone is a buzz with no bottom to it.
        pulse(ctx, destination, frequency, at, gain * 0.4, 'square', BASS_ATTACK, BASS_HOLD, BASS_DECAY, 0);
        pulse(ctx, destination, frequency / 2, at, gain * 0.72, 'triangle', BASS_ATTACK, BASS_HOLD + 0.03, BASS_DECAY + 0.06, 0);

        return;
    }

    if (timbre === 'lead')
    {
        const hold = LEAD_HOLD + ringing(held);

        pulse(ctx, destination, frequency, at, gain * 0.3, 'square', LEAD_ATTACK, hold, LEAD_DECAY, LEAD_DETUNE);

        return;
    }

    //  The backing. A triangle rather than a square: it is four voices at once
    //  under a tune, and four squares at once is the buzz this game used to be.
    if (timbre === 'chord')
    {
        pulse(ctx, destination, frequency, at, gain * 0.3, 'triangle', CHORD_ATTACK, CHORD_HOLD, CHORD_DECAY, 0);

        return;
    }

    pulse(ctx, destination, frequency, at, gain * 0.34, 'square', TICK_ATTACK, 0, TICK_DECAY, 0);
}

/** One enveloped oscillator, started and stopped. */
export function pulse (
    ctx: BaseAudioContext,
    destination: AudioNode,
    frequency: number,
    at: number,
    gain: number,
    type: OscillatorType,
    attack: number,
    hold: number,
    decay: number,
    detune: number
): void
{
    const osc = ctx.createOscillator();
    const level = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;

    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);

    if (hold > 0)
    {
        level.gain.setValueAtTime(Math.max(0.0002, gain), at + attack + hold);
    }

    level.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + decay);

    osc.connect(level);
    level.connect(destination);
    osc.start(at);
    osc.stop(at + attack + hold + decay + 0.02);
}

/** The convolver every sound is sent through, loaded with a generated room. */
export function room (ctx: BaseAudioContext): ConvolverNode
{
    const length = Math.floor(ctx.sampleRate * REVERB_SECONDS);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    const channels = impulseChannels(length);

    buffer.copyToChannel(channels[0], 0);
    buffer.copyToChannel(channels[1], 1);

    const convolver = ctx.createConvolver();

    convolver.buffer = buffer;

    return convolver;
}
