import {
    SOUND_COMPRESSOR_ATTACK,
    SOUND_COMPRESSOR_KNEE,
    SOUND_COMPRESSOR_RATIO,
    SOUND_COMPRESSOR_RELEASE,
    SOUND_COMPRESSOR_THRESHOLD,
    SOUND_MASTER,
    REVERB_DRY,
    REVERB_PREDELAY,
    REVERB_WET
} from '../config/constants';
import { room } from './voice';

/** The two places a note is played into: straight out, and into the room. */
export interface Mixer
{
    /** The note itself, heard immediately. */
    dry: GainNode;

    /** A copy of it, heard as the room a moment later. */
    send: GainNode;
}

/**
 * Everything between a note and the speaker, built once per audio context.
 *
 * Sending a copy of the note into the room rather than passing the note itself
 * through it is what lets the reverb be as large as it is without the note
 * going soft and distant with it - the difference between a piano in a hall
 * and a piano in another building.
 *
 * Built here rather than inside the sound system so the same chain can be
 * rendered offline: what is checked by listening has to be the thing that
 * plays, not a second copy of it that has drifted.
 */
export function buildMixer (ctx: BaseAudioContext, destination: AudioNode): Mixer
{
    //  A limiter across the whole game, because notes are played by the player
    //  and not by an arranger: a good run lands orbs fast enough that half a
    //  dozen notes and their tails overlap, and six notes at full level add up
    //  to a crackle. Set gently, so it holds the peaks down without being
    //  audible as pumping on a single note.
    const limiter = ctx.createDynamicsCompressor();

    limiter.threshold.value = SOUND_COMPRESSOR_THRESHOLD;
    limiter.knee.value = SOUND_COMPRESSOR_KNEE;
    limiter.ratio.value = SOUND_COMPRESSOR_RATIO;
    limiter.attack.value = SOUND_COMPRESSOR_ATTACK;
    limiter.release.value = SOUND_COMPRESSOR_RELEASE;

    const master = ctx.createGain();

    master.gain.value = SOUND_MASTER;

    limiter.connect(master);
    master.connect(destination);

    const dry = ctx.createGain();

    dry.gain.value = REVERB_DRY;
    dry.connect(limiter);

    //  The room arrives a moment after the note does, as it would in any space
    //  large enough to hear. Without the gap the reverb sits on top of the
    //  attack and softens it, and the note stops reading as struck.
    const predelay = ctx.createDelay(1);

    predelay.delayTime.value = REVERB_PREDELAY;

    const wet = ctx.createGain();

    wet.gain.value = REVERB_WET;

    const convolver = room(ctx);
    const send = ctx.createGain();

    send.connect(predelay);
    predelay.connect(convolver);
    convolver.connect(wet);
    wet.connect(limiter);

    return { dry, send };
}
