import {
    HAT_BAND,
    HAT_DECAY,
    HAT_RATIOS,
    HAT_TOP,
    KICK_CLICK,
    KICK_DECAY,
    KICK_FALL,
    KICK_FROM,
    KICK_TO,
    SNARE_BAND,
    SNARE_DECAY,
    SNARE_SNAP,
    SNARE_TONE
} from '../config/constants';
import { noiseBuffer } from './reverb';
import { envelope, shape } from './voice';

//  The kit.
//
//  Each of the three is built the way the machine that made it famous built it,
//  because those recipes are what an ear recognises as drums. A kick is a sine
//  falling off a cliff with a click on the front. A snare is two bands of noise
//  at once - a body and a snap - with a tone under them. And a hat is not noise
//  at all: it is a handful of squares at ratios that make no chord, which is
//  why it rings like metal instead of hissing like static.

/**
 * The kick: a pitch falling from a knock to a thud, with a click on the front.
 *
 * The fall is the drum. The click is what makes it audible on a phone, where
 * everything below about two hundred hertz simply is not there - without it a
 * kick on a handset is a gap in the bar.
 */
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

    burst(ctx, destination, at, gain * KICK_CLICK, 'highpass', 1400, 1, 0.012);
}

/**
 * The snare and the hat.
 *
 * A snare is a body, a snap and a tone together; a hat is six squares through a
 * highpass. They share a function because the game only ever asks for one or
 * the other, and because what they have in common - short, unpitched, on the
 * off-beat - is more of the sound than what separates them.
 */
export function rattle (
    ctx: BaseAudioContext,
    destination: AudioNode,
    at: number,
    gain: number,
    snare: boolean
): void
{
    if (!snare)
    {
        hat(ctx, destination, at, gain);

        return;
    }

    //  The body: a wide band around two kilohertz, which is the wood and the
    //  skin. Then the snap: a thin band much higher and much shorter, which is
    //  the wires underneath. One without the other is a box or a hiss.
    burst(ctx, destination, at, gain * 0.5, 'bandpass', SNARE_BAND, 0.9, SNARE_DECAY);
    burst(ctx, destination, at, gain * SNARE_SNAP, 'highpass', 6000, 1, SNARE_DECAY * 0.5);

    shape(ctx, destination, SNARE_TONE, at, gain * 0.3, 'triangle', 0.001, 0, 0.06, 0);
}

/**
 * The hat: six squares at ratios that belong to no scale.
 *
 * This is how every drum machine of the era made one, and the reason is that
 * noise has no pitch at all while metal has too many at once. Ratios chosen so
 * no two of them are a whole number apart - the moment two are, the ear hears
 * a note.
 *
 * Worked out once and kept as a sample rather than built each time. There are
 * eight of these to a bar and sixteen in the run-in to a finish, and six
 * oscillators apiece is by a distance the most expensive thing in the game's
 * sound. Played from a buffer it is one node, and identical to listen to.
 */
function hat (ctx: BaseAudioContext, destination: AudioNode, at: number, gain: number): void
{
    const source = ctx.createBufferSource();
    const level = ctx.createGain();

    source.buffer = metal(ctx);

    envelope(level.gain, at, gain * 0.22, 0.001, 0, HAT_DECAY);

    source.connect(level);
    level.connect(destination);
    source.start(at);
    source.stop(at + HAT_DECAY + 0.05);
}

const hats = new WeakMap<BaseAudioContext, AudioBuffer>();

/** The six squares through the highpass, worked out by hand into a buffer. */
function metal (ctx: BaseAudioContext): AudioBuffer
{
    const held = hats.get(ctx);

    if (held !== undefined) { return held; }

    const rate = ctx.sampleRate;
    const length = Math.floor(rate * (HAT_DECAY + 0.05));
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);

    //  A square is the sign of a sine, and six of them added up is the whole
    //  oscillator bank. Then a one-pole highpass over it, which is the same
    //  filter the graph would have applied and a great deal less machinery.
    let last = 0;
    let out = 0;
    const a = 1 / (1 + ((2 * Math.PI * HAT_BAND) / rate));

    for (let i = 0; i < length; i++)
    {
        let sum = 0;

        for (const ratio of HAT_RATIOS)
        {
            sum += Math.sign(Math.sin(2 * Math.PI * HAT_TOP * ratio * (i / rate)));
        }

        const raw = sum / HAT_RATIOS.length;

        out = a * (out + raw - last);
        last = raw;
        data[i] = out;
    }

    hats.set(ctx, buffer);

    return buffer;
}

/** One filtered burst of noise, which is most of a drum. */
function burst (
    ctx: BaseAudioContext,
    destination: AudioNode,
    at: number,
    gain: number,
    type: BiquadFilterType,
    frequency: number,
    q: number,
    decay: number
): void
{
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const level = ctx.createGain();

    source.buffer = noiseBuffer(ctx, decay + 0.05, Math.round(frequency));

    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;

    envelope(level.gain, at, gain, 0.001, 0, decay);

    source.connect(filter);
    filter.connect(level);
    level.connect(destination);
    source.start(at);
    source.stop(at + decay + 0.05);
}
