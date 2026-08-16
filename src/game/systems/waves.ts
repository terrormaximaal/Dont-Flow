import { BASS_PARTIALS, LEAD_PARTIALS } from '../config/constants';

//  The shapes the oscillators are given, instead of the four a browser ships
//  with.
//
//  A square wave holds every odd harmonic at full strength forever, which is
//  why one sounds like a buzzer and a dozen at once sound like an alarm. A
//  written-out table lets the top of the sound be rolled off deliberately: the
//  first few harmonics are what make a note sound like an instrument, and the
//  twentieth is only what makes it sting.
//
//  Waves belong to the context that made them and building one costs an FFT,
//  so each is made once and kept.

const cache = new WeakMap<BaseAudioContext, Map<string, PeriodicWave>>();

/** The named shape, built on first use and kept for the life of the context. */
export function waveFor (ctx: BaseAudioContext, name: 'lead' | 'bass'): PeriodicWave
{
    let made = cache.get(ctx);

    if (made === undefined)
    {
        made = new Map();

        cache.set(ctx, made);
    }

    const held = made.get(name);

    if (held !== undefined)
    {
        return held;
    }

    const wave = build(ctx, name === 'lead' ? LEAD_PARTIALS : BASS_PARTIALS);

    made.set(name, wave);

    return wave;
}

/**
 * A wave from a list of harmonic strengths, the first being the fundamental.
 *
 * All of it goes in the sine half of the pair and the cosine half is left at
 * zero, which puts every harmonic at the same phase. Nothing here is heard as
 * phase - the ear cannot tell two of these apart - but it does mean the peak of
 * the wave is predictable, which is what keeps the mix from clipping when four
 * of them land on the same beat.
 */
function build (ctx: BaseAudioContext, partials: number[]): PeriodicWave
{
    const real = new Float32Array(partials.length + 1);
    const imag = new Float32Array(partials.length + 1);

    partials.forEach((strength, i) => { imag[i + 1] = strength; });

    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}
