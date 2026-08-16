import { REVERB_DECAY, REVERB_SEED } from '../config/constants';
import { seeded } from './noise';

//  The room every note is played into.
//
//  A convolver needs a recording of a room to work with, and this game ships no
//  files - so the room is generated: noise that falls away, which is what the
//  tail of a real recorded room mostly is. It is written as plain numbers here
//  so its shape can be checked without an audio context, and so the two
//  channels can be built from the same rule with different seeds.

/**
 * One channel of the room, as samples between -1 and 1.
 *
 * The fall is a power curve rather than a straight line: a room does not empty
 * evenly, it loses most of its energy quickly and then hangs on quietly for a
 * long time. That long quiet part is the whole reason for the effect - it is
 * what holds one orb's note under the next one.
 *
 * @param length How many samples, which sets how long the tail is.
 * @param seed   Fixed, so the room is identical on every device and every run.
 * @param decay  Higher is a smaller, deader room.
 */
export function impulseChannel (length: number, seed: number, decay = REVERB_DECAY): Float32Array
{
    const samples = new Float32Array(length);
    const random = seeded(seed);

    for (let i = 0; i < length; i++)
    {
        const remaining = 1 - (i / length);

        //  Noise either side of zero, faded by whatever is left of the room.
        samples[i] = ((random() * 2) - 1) * Math.pow(remaining, decay);
    }

    return samples;
}

/**
 * A buffer of noise, for anything that needs the sound of water rather than a
 * note: the stream under a run, and the droplet on the front of a bubble.
 *
 * Deterministic like everything else here, so two runs of the same level sound
 * the same as each other.
 */
export function noiseBuffer (ctx: BaseAudioContext, seconds: number, seed: number): AudioBuffer
{
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const random = seeded(seed);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++)
    {
        data[i] = (random() * 2) - 1;
    }

    return buffer;
}

/**
 * Both channels, from seeds far enough apart to be uncorrelated.
 *
 * Two different noises rather than one copied to both ears is the whole
 * difference between a room and a mono effect sitting in the middle of the
 * player's head.
 */
export function impulseChannels (length: number, decay = REVERB_DECAY): [ Float32Array, Float32Array ]
{
    return [
        impulseChannel(length, REVERB_SEED, decay),
        impulseChannel(length, REVERB_SEED * 7, decay)
    ];
}
