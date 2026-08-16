import { frequencyOf } from '../config/audio';
import {
    BUBBLE_ATTACK,
    BUBBLE_DECAY_BASE,
    BUBBLE_DECAY_MAX,
    BUBBLE_DECAY_SPAN,
    BUBBLE_FROM,
    BUBBLE_TO,
    DEEP_ATTACK,
    DEEP_DECAY,
    DEEP_HARMONIC,
    DEEP_HOLD,
    DROPLET_BAND,
    DROPLET_DECAY,
    DROPLET_GAIN,
    DROPLET_Q,
    REVERB_SECONDS,
    STREAM_ATTACK,
    STREAM_BAND_HIGH,
    STREAM_BAND_LOW,
    STREAM_DECAY,
    STREAM_HOLD,
    STREAM_Q,
    STREAM_SECONDS
} from '../config/constants';
import { impulseChannels, noiseBuffer } from './reverb';

//  The instrument: water, in three states, and the room it moves in.
//
//  Everything takes the context it is to be built in rather than reaching for
//  one, so the same code that plays a note in the game can be rendered offline
//  into a file to listen to - and so nothing here has to know whether it is
//  being heard live.

/**
 * The four things water does here.
 *
 * 'bubble' rises and 'sink' falls, which is the entire vocabulary the player
 * needs: something went well, or it did not. 'stream' is running water and
 * carries the backing; 'deep' is the note under all of it.
 *
 * None of them has a hammer on it, which is the point. A struck note repeated
 * once a second into a long room is what turned this game into an alarm, and
 * no amount of retuning the pitch fixed that.
 */
export type Timbre = 'bubble' | 'sink' | 'stream' | 'deep';

/** How long a sound of this kind lasts, in seconds. */
export function decayOf (semitones: number, timbre: Timbre = 'bubble'): number
{
    if (timbre === 'stream')
    {
        return STREAM_ATTACK + STREAM_HOLD + STREAM_DECAY;
    }

    if (timbre === 'deep')
    {
        return DEEP_ATTACK + DEEP_HOLD + DEEP_DECAY;
    }

    //  A big bubble takes longer to rise than a small one, so a low note lasts
    //  longer than a high one - which is also what keeps a fast streak from
    //  silting up: the notes at the top of it are the shortest.
    return Math.min(BUBBLE_DECAY_MAX, (BUBBLE_DECAY_SPAN / frequencyOf(semitones)) + BUBBLE_DECAY_BASE);
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
    timbre: Timbre = 'bubble'
): void
{
    const at = ctx.currentTime + when;
    const frequency = frequencyOf(semitones);

    if (timbre === 'stream')
    {
        stream(ctx, destination, frequency, at, gain);

        return;
    }

    if (timbre === 'deep')
    {
        deep(ctx, destination, frequency, at, gain);

        return;
    }

    bubble(ctx, destination, frequency, at, gain, timbre === 'sink');
}

/**
 * A bubble: one sine whose pitch slides while it fades, with a tick of noise
 * on the front.
 *
 * The slide is the whole sound. A bubble in water shrinks as it rises and its
 * resonance climbs with it, which is why every bubble anyone has ever heard
 * goes up - and why one that goes down is heard as wrong before the player has
 * looked at the screen.
 */
function bubble (
    ctx: BaseAudioContext,
    destination: AudioNode,
    frequency: number,
    at: number,
    gain: number,
    sinking: boolean
): void
{
    const decay = Math.min(BUBBLE_DECAY_MAX, (BUBBLE_DECAY_SPAN / frequency) + BUBBLE_DECAY_BASE);

    const osc = ctx.createOscillator();
    const level = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency * (sinking ? BUBBLE_TO : BUBBLE_FROM), at);
    osc.frequency.exponentialRampToValueAtTime(
        frequency * (sinking ? BUBBLE_FROM * 0.6 : BUBBLE_TO),
        at + decay
    );

    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + BUBBLE_ATTACK);
    level.gain.exponentialRampToValueAtTime(0.0001, at + decay);

    osc.connect(level);
    level.connect(destination);
    osc.start(at);
    osc.stop(at + decay + 0.05);

    //  The droplet landing on it.
    const tick = ctx.createBufferSource();
    const band = ctx.createBiquadFilter();
    const tickLevel = ctx.createGain();

    tick.buffer = noiseBuffer(ctx, DROPLET_DECAY * 2, Math.round(frequency));
    band.type = 'bandpass';
    band.frequency.value = Math.min(5000, frequency * DROPLET_BAND);
    band.Q.value = DROPLET_Q;

    tickLevel.gain.setValueAtTime(0.0001, at);
    tickLevel.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * DROPLET_GAIN), at + 0.001);
    tickLevel.gain.exponentialRampToValueAtTime(0.0001, at + DROPLET_DECAY);

    tick.connect(band);
    band.connect(tickLevel);
    tickLevel.connect(destination);
    tick.start(at);
    tick.stop(at + (DROPLET_DECAY * 2) + 0.01);
}

/**
 * Running water: noise through a resonance that drifts.
 *
 * Broadband noise with a moving peak in it *is* the sound of a stream, which
 * is why this needs no oscillator at all. It carries the harmony by where the
 * peak sits rather than by playing a note.
 */
function stream (ctx: BaseAudioContext, destination: AudioNode, frequency: number, at: number, gain: number): void
{
    const source = ctx.createBufferSource();
    const band = ctx.createBiquadFilter();
    const level = ctx.createGain();
    const length = STREAM_ATTACK + STREAM_HOLD + STREAM_DECAY;

    source.buffer = noiseBuffer(ctx, STREAM_SECONDS, Math.round(frequency * 11));

    band.type = 'bandpass';
    band.Q.value = STREAM_Q;
    band.frequency.setValueAtTime(frequency * STREAM_BAND_LOW, at);
    band.frequency.linearRampToValueAtTime(frequency * STREAM_BAND_HIGH, at + (length / 2));
    band.frequency.linearRampToValueAtTime(frequency * STREAM_BAND_LOW, at + length);

    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + STREAM_ATTACK);
    level.gain.setValueAtTime(Math.max(0.0002, gain), at + STREAM_ATTACK + STREAM_HOLD);
    level.gain.exponentialRampToValueAtTime(0.0001, at + length);

    source.connect(band);
    band.connect(level);
    level.connect(destination);
    source.start(at);
    source.stop(at + length + 0.05);
}

/** The note under everything: a sine with one soft harmonic over it. */
function deep (ctx: BaseAudioContext, destination: AudioNode, frequency: number, at: number, gain: number): void
{
    const length = DEEP_ATTACK + DEEP_HOLD + DEEP_DECAY;

    for (const [ multiple, level ] of [ [ 1, 1 ], [ 2, DEEP_HARMONIC ] ])
    {
        const osc = ctx.createOscillator();
        const envelope = ctx.createGain();

        osc.type = multiple === 1 ? 'sine' : 'triangle';
        osc.frequency.value = frequency * multiple;

        envelope.gain.setValueAtTime(0.0001, at);
        envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * level), at + DEEP_ATTACK);
        envelope.gain.setValueAtTime(Math.max(0.0002, gain * level), at + DEEP_ATTACK + DEEP_HOLD);
        envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);

        osc.connect(envelope);
        envelope.connect(destination);
        osc.start(at);
        osc.stop(at + length + 0.05);
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
