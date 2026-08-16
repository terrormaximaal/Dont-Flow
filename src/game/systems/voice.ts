import { frequencyOf } from '../config/audio';
import {
    BASS_ATTACK,
    BASS_DECAY,
    BASS_HOLD,
    HAT_BAND,
    HAT_DECAY,
    KICK_DECAY,
    KICK_FALL,
    KICK_FROM,
    KICK_TO,
    LEAD_ATTACK,
    LEAD_DECAY,
    LEAD_DETUNE,
    LEAD_HOLD,
    REVERB_SECONDS,
    SNARE_BAND,
    SNARE_DECAY,
    SNARE_TONE,
    TICK_ATTACK,
    TICK_DECAY
} from '../config/constants';
import { impulseChannels, noiseBuffer } from './reverb';

//  The cabinet: four channels and a kit, and the room it stands in.
//
//  Everything takes the context it is to be built in rather than reaching for
//  one, so the same code that plays a note in the game can be rendered offline
//  into a file to listen to - and so nothing here has to know whether it is
//  being heard live.

/**
 * The voices, which are almost all the same voice.
 *
 * 'bass' and 'lead' are the two channels the music is written on, 'tick' is
 * the one sound the player's own playing makes, and the three drums are noise
 * and a sine. A chip soundtrack is this and nothing else, and that is the
 * point: there is no depth here to turn into mud.
 */
export type Timbre = 'bass' | 'lead' | 'tick' | 'kick' | 'snare' | 'hat';

/**
 * How long a sound of this kind lasts, in seconds.
 *
 * The pitch is taken but never read: on this instrument nothing rings longer
 * for being lower, because nothing rings. It stays in the signature because
 * every other version of this game's voice needed it and the next one might.
 */
export function decayOf (_semitones: number, timbre: Timbre = 'tick'): number
{
    switch (timbre)
    {
        case 'bass': return BASS_ATTACK + BASS_HOLD + BASS_DECAY;
        case 'lead': return LEAD_ATTACK + LEAD_HOLD + LEAD_DECAY;
        case 'kick': return KICK_DECAY;
        case 'snare': return SNARE_DECAY;
        case 'hat': return HAT_DECAY;
        default: return TICK_ATTACK + TICK_DECAY;
    }
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
    timbre: Timbre = 'tick'
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
        pulse(ctx, destination, frequency, at, gain * 0.3, 'square', LEAD_ATTACK, LEAD_HOLD, LEAD_DECAY, LEAD_DETUNE);

        return;
    }

    pulse(ctx, destination, frequency, at, gain * 0.34, 'square', TICK_ATTACK, 0, TICK_DECAY, 0);
}

/** One enveloped oscillator, started and stopped. */
function pulse (
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

/** The kick: a sine falling off a cliff. */
function kick (ctx: BaseAudioContext, destination: AudioNode, at: number, gain: number): void
{
    const osc = ctx.createOscillator();
    const level = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(KICK_FROM, at);
    osc.frequency.exponentialRampToValueAtTime(KICK_TO, at + KICK_FALL);

    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.002);
    level.gain.exponentialRampToValueAtTime(0.0001, at + KICK_DECAY);

    osc.connect(level);
    level.connect(destination);
    osc.start(at);
    osc.stop(at + KICK_DECAY + 0.05);
}

/** The snare and the hat: the same noise, filtered differently. */
function rattle (
    ctx: BaseAudioContext,
    destination: AudioNode,
    at: number,
    gain: number,
    snare: boolean
): void
{
    const decay = snare ? SNARE_DECAY : HAT_DECAY;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const level = ctx.createGain();

    source.buffer = noiseBuffer(ctx, decay + 0.05, snare ? 7 : 11);

    filter.type = snare ? 'bandpass' : 'highpass';
    filter.frequency.value = snare ? SNARE_BAND : HAT_BAND;
    filter.Q.value = snare ? 0.9 : 1;

    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * (snare ? 0.55 : 0.26)), at + 0.001);
    level.gain.exponentialRampToValueAtTime(0.0001, at + decay);

    source.connect(filter);
    filter.connect(level);
    level.connect(destination);
    source.start(at);
    source.stop(at + decay + 0.05);

    //  A little tone under the noise, or a snare is a hiss rather than a drum.
    if (snare)
    {
        pulse(ctx, destination, SNARE_TONE, at, gain * 0.3, 'triangle', 0.001, 0, 0.08, 0);
    }
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
