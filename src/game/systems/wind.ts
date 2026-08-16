import {
    LEAD_ATTACK,
    LEAD_BREATH,
    LEAD_BREATH_DECAY,
    LEAD_DECAY,
    LEAD_FILTER_FROM,
    LEAD_FILTER_Q,
    LEAD_FILTER_TO,
    LEAD_HOLD,
    LEAD_VIBRATO_CENTS,
    LEAD_VIBRATO_FROM,
    LEAD_VIBRATO_HZ
} from '../config/constants';
import { sweep } from './instruments';
import { noiseBuffer } from './reverb';
import { envelope } from './voice';
import { waveFor } from './waves';

//  The one instrument here that is blown rather than struck.
//
//  It plays the tune, and only where there is room to listen to one: the level
//  select, the title, and the two jingles. Under a run there is no tune at all.

/**
 * The tune: something blown.
 *
 * Three things make a wind instrument, and none of them is the waveform. It
 * takes a moment to speak rather than starting at full volume. There is air in
 * the sound at the front, before the note settles. And a held note is never
 * quite still - a player's breath moves it, slightly and regularly, and an ear
 * hearing that steadiness knows a person is doing it.
 *
 * Kept deliberately soft above: a bright reed at this pitch over a phone
 * speaker is the shrillest thing this game could make, and the tune is the one
 * voice that plays for minutes at a time.
 */
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

    const osc = ctx.createOscillator();
    const level = ctx.createGain();

    osc.setPeriodicWave(waveFor(ctx, 'lead'));
    osc.frequency.value = frequency;

    envelope(level.gain, at, gain * 0.42, LEAD_ATTACK, hold, LEAD_DECAY);

    osc.connect(level);
    level.connect(filter);
    osc.start(at);
    osc.stop(at + total + 0.02);

    //  Vibrato, and only on the notes long enough to want it - a wind player
    //  does not vibrato a passing eighth, and one that did would sound seasick.
    if (ring > LEAD_VIBRATO_FROM)
    {
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();

        lfo.type = 'sine';
        lfo.frequency.value = LEAD_VIBRATO_HZ;

        //  Held back until the note has spoken, then eased in. Vibrato present
        //  from the first instant is a wobble; vibrato arriving after the note
        //  is a player leaning on it.
        depth.gain.setValueAtTime(0.0001, at);
        depth.gain.setValueAtTime(0.0001, at + LEAD_ATTACK + 0.06);
        depth.gain.linearRampToValueAtTime(LEAD_VIBRATO_CENTS, at + LEAD_ATTACK + 0.22);

        lfo.connect(depth);
        depth.connect(osc.detune);
        lfo.start(at);
        lfo.stop(at + total + 0.02);
    }

    breath(ctx, filter, frequency, at, gain * LEAD_BREATH);
}

/**
 * The air at the front of a blown note.
 *
 * A short hiss around the note's own pitch, gone before the note has properly
 * started. It is a small thing and it is most of the difference between a
 * flute and an organ: without it the note simply exists, and with it somebody
 * started it.
 */
function breath (
    ctx: BaseAudioContext,
    destination: AudioNode,
    frequency: number,
    at: number,
    gain: number
): void
{
    const source = ctx.createBufferSource();
    const band = ctx.createBiquadFilter();
    const level = ctx.createGain();

    source.buffer = noiseBuffer(ctx, LEAD_BREATH_DECAY + 0.05, 23);

    //  On the note rather than up where a hiss lives, so it reads as air moving
    //  through the instrument instead of as noise laid over the top of it.
    band.type = 'bandpass';
    band.frequency.value = Math.min(frequency * 2, ctx.sampleRate * 0.4);
    band.Q.value = 0.8;

    envelope(level.gain, at, gain, 0.008, 0, LEAD_BREATH_DECAY);

    source.connect(band);
    band.connect(level);
    level.connect(destination);
    source.start(at);
    source.stop(at + LEAD_BREATH_DECAY + 0.05);
}
