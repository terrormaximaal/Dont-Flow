import { frequencyOf } from '../config/audio';
import {
    BASS_ATTACK,
    BASS_DECAY,
    BASS_SUB,
    PAD_ATTACK,
    PAD_DECAY,
    PAD_HOLD,
    PAD_OPEN,
    PAD_Q,
    PAD_SHUT,
    REVERB_SECONDS,
    SYNTH_ATTACK,
    SYNTH_DECAY_BASE,
    SYNTH_DECAY_MAX,
    SYNTH_DECAY_SPAN,
    SYNTH_DETUNE,
    SYNTH_OPEN,
    SYNTH_PAD_DETUNE,
    SYNTH_Q,
    SYNTH_SHUT,
    SYNTH_SWEEP
} from '../config/constants';
import { impulseChannels } from './reverb';

//  The instrument, and the room it is played in.
//
//  Everything takes the context it is to be built in rather than reaching for
//  one, so the same code that plays a note in the game can be rendered offline
//  into a file to listen to - and so nothing here has to know whether it is
//  being heard live.

/**
 * The three parts of the instrument.
 *
 * 'pluck' is what the player triggers, 'pad' is the chord under the run, and
 * 'bass' is the note the chord stands on. They are the same two sawtooths
 * every time; what separates them is how fast the filter moves and how long
 * the note is allowed to last.
 */
export type Timbre = 'pluck' | 'pad' | 'bass';

/** How long a sound of this kind lasts, in seconds. */
export function decayOf (semitones: number, timbre: Timbre = 'pluck'): number
{
    if (timbre === 'pad')
    {
        return PAD_ATTACK + PAD_HOLD + PAD_DECAY;
    }

    if (timbre === 'bass')
    {
        return BASS_ATTACK + BASS_DECAY;
    }

    //  High notes are shorter than low ones, which is true of nearly every
    //  instrument there is - and which is also what stops the top of a fast
    //  streak silting up into a chord nobody played.
    return Math.min(
        SYNTH_DECAY_MAX,
        (SYNTH_DECAY_SPAN / frequencyOf(semitones)) + SYNTH_DECAY_BASE
    );
}

/**
 * One note into `destination`.
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
    timbre: Timbre = 'pluck'
): void
{
    const at = ctx.currentTime + when;
    const frequency = frequencyOf(semitones);
    const pad = timbre === 'pad';
    const bass = timbre === 'bass';
    const decay = decayOf(semitones, timbre);

    const filter = ctx.createBiquadFilter();
    const level = ctx.createGain();

    filter.type = 'lowpass';
    filter.Q.value = pad ? PAD_Q : SYNTH_Q;

    //  The whole character of the instrument is in this one line and the two
    //  under it: where the filter starts, and where it ends up. Everything
    //  else here is plumbing.
    const open = frequency * (pad ? PAD_OPEN : SYNTH_OPEN);
    const shut = frequency * (pad ? PAD_SHUT : SYNTH_SHUT);

    if (pad)
    {
        //  Opening slowly and closing again, so the chord under the run is
        //  never quite the same twice without anything having changed.
        filter.frequency.setValueAtTime(shut, at);
        filter.frequency.linearRampToValueAtTime(open, at + (decay / 2));
        filter.frequency.linearRampToValueAtTime(shut, at + decay);
    }
    else
    {
        filter.frequency.setValueAtTime(Math.min(6000, open), at);
        filter.frequency.exponentialRampToValueAtTime(Math.max(120, shut), at + SYNTH_SWEEP);
    }

    const attack = pad ? PAD_ATTACK : (bass ? BASS_ATTACK : SYNTH_ATTACK);
    const hold = pad ? PAD_HOLD : 0;

    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);

    if (hold > 0)
    {
        level.gain.setValueAtTime(Math.max(0.0002, gain), at + attack + hold);
    }

    level.gain.exponentialRampToValueAtTime(0.0001, at + decay);

    filter.connect(level);
    level.connect(destination);

    const spread = pad ? SYNTH_PAD_DETUNE : SYNTH_DETUNE;
    const until = at + decay + 0.05;

    for (const detune of [ -spread, spread ])
    {
        const osc = ctx.createOscillator();

        osc.type = 'sawtooth';
        osc.frequency.value = frequency;
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(at);
        osc.stop(until);
    }

    //  A sine an octave down under the parts that carry the bottom end. A saw
    //  down there would be mud; a sine is felt without being heard.
    if (pad || bass)
    {
        const sub = ctx.createOscillator();
        const subLevel = ctx.createGain();

        sub.type = 'sine';
        sub.frequency.value = frequency / 2;
        subLevel.gain.value = BASS_SUB;

        sub.connect(subLevel);
        subLevel.connect(filter);
        sub.start(at);
        sub.stop(until);
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
