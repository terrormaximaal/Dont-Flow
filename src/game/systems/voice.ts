import { frequencyOf } from '../config/audio';
import {
    PAD_ATTACK,
    PAD_DECAY,
    PAD_PARTIALS,
    PAD_TONE,
    PIANO_ATTACK,
    PIANO_DECAY,
    PIANO_DECAY_TILT,
    PIANO_PARTIALS,
    PIANO_STRETCH,
    PIANO_TONE,
    REVERB_SECONDS
} from '../config/constants';
import { impulseChannels } from './reverb';

//  The instrument: one struck note, and the room it is struck in.
//
//  Both take the context they are to be built in rather than reaching for one,
//  so the same code that plays a note in the game can be rendered offline into
//  a file to listen to - and so nothing here has to know whether it is being
//  heard live.

/**
 * The two ways this game makes a sound.
 *
 * 'struck' is a note with a hammer on it, for the moments that need to be
 * noticed. 'held' is the same three partials with the hammer taken off - it
 * fades in over a third of a second and sits there - and it is what a chord is
 * made of. The difference is almost entirely the attack: the same note, struck
 * fifty times over a run and drenched in a room, is what turns a game into an
 * alarm, and no amount of retuning the pitch fixes that.
 */
export type Timbre = 'struck' | 'held';

/**
 * How long a note rings, in seconds.
 *
 * Falls as the note climbs, the way a shorter string does: at the top of a long
 * streak the notes are arriving quickly, and if they rang as long as the low
 * ones the reverb would silt up into a chord nobody played.
 */
export function decayOf (semitones: number, timbre: Timbre = 'struck'): number
{
    //  A held note is the same length whatever its pitch: it is there to last
    //  a bar and hand over to the next chord, and a bass note that outlasted
    //  the chord above it by twice over would leave two harmonies sounding at
    //  once - which is most of what "muddy" is.
    if (timbre === 'held')
    {
        return PAD_DECAY;
    }

    return PIANO_DECAY * Math.pow(2, (-semitones / 12) * PIANO_DECAY_TILT);
}

/**
 * One struck note into `destination`.
 *
 * Three sine partials, each quieter and slightly sharper than a whole multiple
 * of the one below it. Real strings are stiff, so their overtones sit a little
 * above where the arithmetic says they should - copying that is most of what
 * separates a note that sounds struck from a note that sounds generated.
 *
 * The whole thing is thrown away when it has finished sounding: an oscillator
 * is cheap to make and cannot be restarted once stopped, so a note is a new one
 * every time rather than a voice being reused.
 *
 * @param when  Seconds from now.
 * @param gain  0 to 1, on top of whatever the destination is set to.
 */
export function strike (
    ctx: BaseAudioContext,
    destination: AudioNode,
    semitones: number,
    when: number,
    gain: number,
    timbre: Timbre = 'struck'
): void
{
    const held = timbre === 'held';
    const start = ctx.currentTime + when;
    const decay = decayOf(semitones, timbre);
    const frequency = frequencyOf(semitones);
    const attack = held ? PAD_ATTACK : PIANO_ATTACK;

    //  The top taken off, so what is left of a note after the room has had it
    //  is warm rather than glassy. The cutoff follows the note rather than
    //  sitting at a fixed frequency, or the same filter would leave a low note
    //  untouched and hollow out a high one.
    const tone = ctx.createBiquadFilter();

    tone.type = 'lowpass';
    tone.frequency.value = frequency * (held ? PAD_TONE : PIANO_TONE);
    tone.connect(destination);

    const envelope = ctx.createGain();

    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(gain, start + attack);

    //  Exponential, because that is how a struck thing loses energy - and
    //  because a linear fade is audible as a note being turned down. It cannot
    //  reach zero, so it aims just under hearing and is cut there.
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + decay);

    envelope.connect(tone);

    const partials = held ? PAD_PARTIALS : PIANO_PARTIALS;

    partials.forEach((level, partial) => {

        const osc = ctx.createOscillator();
        const mix = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = frequency * (partial + 1);
        osc.detune.value = PIANO_STRETCH * partial * partial;

        mix.gain.value = level;

        osc.connect(mix);
        mix.connect(envelope);

        osc.start(start);
        osc.stop(start + decay + 0.05);

    });
}

/** The convolver every note is sent through, loaded with a generated room. */
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
