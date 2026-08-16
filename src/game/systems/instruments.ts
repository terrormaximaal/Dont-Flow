import {
    BASS_ATTACK,
    BASS_DECAY,
    BASS_FILTER_FROM,
    BASS_FILTER_Q,
    BASS_FILTER_TO,
    BASS_HOLD,
    LEAD_ATTACK,
    LEAD_DECAY,
    LEAD_DETUNE,
    LEAD_FILTER_FROM,
    LEAD_FILTER_Q,
    LEAD_FILTER_TO,
    LEAD_HOLD
} from '../config/constants';
import { envelope, shape } from './voice';
import { waveFor } from './waves';

//  The three pitched instruments.
//
//  Each is the same three parts: something making a shape, an envelope on how
//  loud it is, and a filter closing over it as it dies. That last part is most
//  of what separates an instrument from a beep - a struck note is bright at the
//  moment it is struck and dark a fraction of a second later, and an oscillator
//  with nothing over it never is.

/**
 * The bass: a rolled-off saw with a sine under it, behind a filter that opens
 * at the strike and shuts again immediately.
 *
 * That shut is the whole sound. A bass note as bright at the end as it was at
 * the start is a buzz; one that loses its top in a twentieth of a second is a
 * plucked string, and it is the same oscillator either way.
 */
export function bass (ctx: BaseAudioContext, destination: AudioNode, frequency: number, at: number, gain: number): void
{
    const total = BASS_ATTACK + BASS_HOLD + BASS_DECAY;
    const filter = sweep(ctx, destination, frequency, at, BASS_FILTER_FROM, BASS_FILTER_TO, BASS_FILTER_Q, total);

    shape(ctx, filter, frequency, at, gain * 0.5, waveFor(ctx, 'bass'), BASS_ATTACK, BASS_HOLD, BASS_DECAY, 0);

    //  A sine an octave down, straight past the filter. This is the part a
    //  phone speaker cannot reproduce and a pair of headphones lives on.
    shape(ctx, destination, frequency / 2, at, gain * 0.5, 'sine', BASS_ATTACK, BASS_HOLD + 0.03, BASS_DECAY + 0.06, 0);
}

/** The tune: the same idea, brighter, and two of them a few cents apart. */
export function lead (
    ctx: BaseAudioContext,
    destination: AudioNode,
    frequency: number,
    at: number,
    gain: number,
    ring: number
): void
{
    const hold = LEAD_HOLD + ring;
    const total = LEAD_ATTACK + hold + LEAD_DECAY;
    const filter = sweep(ctx, destination, frequency, at, LEAD_FILTER_FROM, LEAD_FILTER_TO, LEAD_FILTER_Q, total);
    const wave = waveFor(ctx, 'lead');

    //  Two, detuned against each other. One oscillator is a machine; two a few
    //  cents apart beat slowly against each other, and that beating is most of
    //  what an ear hears as an instrument being played rather than a frequency
    //  being produced.
    shape(ctx, filter, frequency, at, gain * 0.26, wave, LEAD_ATTACK, hold, LEAD_DECAY, LEAD_DETUNE);
    shape(ctx, filter, frequency, at, gain * 0.26, wave, LEAD_ATTACK, hold, LEAD_DECAY, -LEAD_DETUNE);
}

/**
 * A key being struck: one sine bending another.
 *
 * The modulator is tuned to a multiple of the note, so what comes out is still
 * that note, and its depth collapses in a fraction of a second - bright at the
 * strike, a plain sine by the time the next eighth arrives. At a whole-number
 * ratio this is an electric piano; at a ratio that is deliberately not whole it
 * is struck metal, which is what the tick a collected orb makes wants to be.
 */
export function struck (
    ctx: BaseAudioContext,
    destination: AudioNode,
    frequency: number,
    at: number,
    gain: number,
    ratio: number,
    index: number,
    fall: number,
    attack: number,
    hold: number,
    decay: number
): void
{
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const depth = ctx.createGain();
    const level = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.value = frequency;

    modulator.type = 'sine';
    modulator.frequency.value = frequency * ratio;

    depth.gain.setValueAtTime(frequency * index, at);
    depth.gain.exponentialRampToValueAtTime(frequency * 0.01, at + fall);

    envelope(level.gain, at, gain, attack, hold, decay);

    modulator.connect(depth);
    depth.connect(carrier.frequency);
    carrier.connect(level);
    level.connect(destination);

    for (const osc of [ carrier, modulator ])
    {
        osc.start(at);
        osc.stop(at + attack + hold + decay + 0.02);
    }
}

/**
 * A lowpass opening at the strike and closing over the note, in place between
 * the voice and where it is going.
 *
 * Both ends are multiples of the note rather than fixed hertz, so a note two
 * octaves up is filtered the same distance above itself as one two octaves
 * down - which is the difference between an instrument and a rack of sounds
 * that get duller the higher you play.
 */
function sweep (
    ctx: BaseAudioContext,
    destination: AudioNode,
    frequency: number,
    at: number,
    from: number,
    to: number,
    q: number,
    over: number
): BiquadFilterNode
{
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.Q.value = q;

    //  Nyquist is a hard ceiling: what a biquad does with a corner above it is
    //  undefined, and on a device running at a low rate a high note would ask.
    const ceiling = ctx.sampleRate * 0.45;

    filter.frequency.setValueAtTime(Math.min(frequency * from, ceiling), at);
    filter.frequency.exponentialRampToValueAtTime(Math.min(Math.max(frequency * to, 40), ceiling), at + over);

    filter.connect(destination);

    return filter;
}

/** One enveloped oscillator of a given shape, started and stopped. */