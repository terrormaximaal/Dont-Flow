import { frequencyOf } from '../config/audio';
import {
    BASS_ATTACK,
    BASS_DECAY,
    BASS_HOLD,
    CHORD_ATTACK,
    CHORD_DECAY,
    CHORD_FM_FALL,
    CHORD_FM_INDEX,
    CHORD_FM_RATIO,
    CHORD_HOLD,
    HAT_DECAY,
    PLUCK_ATTACK,
    PLUCK_DECAY,
    PLUCK_FM_FALL,
    PLUCK_FM_INDEX,
    PLUCK_FM_RATIO,
    KICK_DECAY,
    LEAD_ATTACK,
    LEAD_DECAY,
    LEAD_HOLD,
    LEAD_MAX_RING,
    KALIMBA_ATTACK,
    KALIMBA_DECAY,
    KALIMBA_FM_FALL,
    KALIMBA_FM_INDEX,
    KALIMBA_FM_RATIO,
    SNARE_DECAY,
    TICK_ATTACK,
    TICK_DECAY,
    TICK_FM_INDEX,
    TICK_FM_RATIO,
    TICK_TAIL
} from '../config/constants';
import { bass, struck } from './instruments';
import { lead } from './wind';
import { kick, rattle } from './kit';

//  The instruments, and the room they stand in.
//
//  Every one is the same three parts: something making a shape, an envelope on
//  how loud it is, and a filter closing over it as it dies. That last part is
//  most of what separates an instrument from a beep - a struck note is bright
//  at the moment it is struck and dark a fraction of a second later, and an
//  oscillator with nothing over it never is.
//
//  Everything takes the context it is to be built in rather than reaching for
//  one, so the same code that plays a note in the game can be rendered offline
//  into a file to listen to.

/**
 * The voices, which are no longer all the same voice.
 *
 * 'lead' is the tune and 'bass' the bottom of it, both filtered; 'chord' is the
 * backing, which is two oscillators rather than a shape - the only way to get a
 * struck key out of a browser is to have one bend the other. 'tick' is the one
 * sound the player's own playing makes, and the drums live in `systems/kit`.
 *
 * 'kalimba' is the same two oscillators again at a ratio that puts the partials
 * two octaves up: a struck wooden bar, and the whole of the phrase that ends a
 * level.
 */
export type Timbre = 'bass' | 'lead' | 'chord' | 'kalimba' | 'pluck' | 'tick' | 'kick' | 'snare' | 'hat';

/**
 * How long a sound of this kind lasts, in seconds.
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
        case 'kalimba': return KALIMBA_ATTACK + KALIMBA_DECAY;
        case 'pluck': return PLUCK_ATTACK + PLUCK_DECAY;
        case 'kick': return KICK_DECAY;
        case 'snare': return SNARE_DECAY;
        case 'hat': return HAT_DECAY;
        default: return TICK_ATTACK + TICK_DECAY;
    }
}

/**
 * How much of a written long note the tune actually holds on to.
 *
 * The tune has notes written six beats long, and six beats of one oscillator is
 * not a held note - it is a test tone. It is given a generous fraction of what
 * was written and then let go.
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

    if (timbre === 'kick') { kick(ctx, destination, at, gain); return; }

    if (timbre === 'snare' || timbre === 'hat')
    {
        rattle(ctx, destination, at, gain, timbre === 'snare');

        return;
    }

    const frequency = frequencyOf(semitones);

    if (timbre === 'bass') { bass(ctx, destination, frequency, at, gain); return; }

    if (timbre === 'lead') { lead(ctx, destination, frequency, at, gain, ringing(held)); return; }

    if (timbre === 'chord') { struck(ctx, destination, frequency, at, gain * 0.5, CHORD_FM_RATIO, CHORD_FM_INDEX, CHORD_FM_FALL, CHORD_ATTACK, CHORD_HOLD, CHORD_DECAY); return; }

    //  A struck wooden bar: the same two oscillators at a ratio that puts what
    //  little brightness there is two octaves up, and takes it away again in a
    //  twentieth of a second.
    if (timbre === 'kalimba') { struck(ctx, destination, frequency, at, gain * 0.45, KALIMBA_FM_RATIO, KALIMBA_FM_INDEX, KALIMBA_FM_FALL, KALIMBA_ATTACK, 0, KALIMBA_DECAY); return; }

    //  A struck bell, plucked: the same two oscillators at a ratio that belongs
    //  to no scale, and a tail long enough to ring after the hand has gone.
    if (timbre === 'pluck') { struck(ctx, destination, frequency, at, gain * 0.4, PLUCK_FM_RATIO, PLUCK_FM_INDEX, PLUCK_FM_FALL, PLUCK_ATTACK, 0, PLUCK_DECAY); return; }

    struck(ctx, destination, frequency, at, gain * 0.6, TICK_FM_RATIO, TICK_FM_INDEX, TICK_DECAY * 0.4, TICK_ATTACK, 0, TICK_DECAY + TICK_TAIL);
}

/** One enveloped oscillator of a given shape, started and stopped. */
export function shape (
    ctx: BaseAudioContext,
    destination: AudioNode,
    frequency: number,
    at: number,
    gain: number,
    wave: OscillatorType | PeriodicWave,
    attack: number,
    hold: number,
    decay: number,
    detune: number
): void
{
    const osc = ctx.createOscillator();
    const level = ctx.createGain();

    if (typeof wave === 'object') { osc.setPeriodicWave(wave); }
    else { osc.type = wave; }

    osc.frequency.value = frequency;
    osc.detune.value = detune;

    envelope(level.gain, at, gain, attack, hold, decay);

    osc.connect(level);
    level.connect(destination);
    osc.start(at);
    osc.stop(at + attack + hold + decay + 0.02);
}

/** Up, along, and away again. Exponential, because loudness is heard that way. */
export function envelope (
    param: AudioParam,
    at: number,
    gain: number,
    attack: number,
    hold: number,
    decay: number
): void
{
    const peak = Math.max(0.0002, gain);

    param.setValueAtTime(0.0001, at);
    param.exponentialRampToValueAtTime(peak, at + attack);

    if (hold > 0) { param.setValueAtTime(peak, at + attack + hold); }

    param.exponentialRampToValueAtTime(0.0001, at + attack + hold + decay);
}
