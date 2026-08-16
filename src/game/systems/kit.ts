import { pulse } from './voice';
import {
    HAT_BAND,
    HAT_DECAY,
    KICK_DECAY,
    KICK_FALL,
    KICK_FROM,
    KICK_TO,
    SNARE_BAND,
    SNARE_DECAY,
    SNARE_TONE
} from '../config/constants';
import { noiseBuffer } from './reverb';

//  The kit: a sine dropped off a cliff, and noise through two filters.
//
//  Nothing here is pitched. A kick is that fall and nothing else, and a snare
//  and a hat are the same noise burst - what separates them is where the filter
//  sits and how long it is allowed to last. That is the whole drum machine.

/** The kick: a sine falling off a cliff. */
export function kick (ctx: BaseAudioContext, destination: AudioNode, at: number, gain: number): void
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
export function rattle (
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
