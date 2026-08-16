import {
    ECHO_DAMP,
    ECHO_FEEDBACK,
    ECHO_SECONDS,
    ECHO_WET,
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

    //  One short echo, dark and quiet, fed from the same send.
    //
    //  Water in a space repeats before it blurs: a single reflection is the
    //  difference between a room and a cave. It also quietly fills the gap
    //  between two collects without the game having to make another sound -
    //  which is the cheapest way there is to sound less empty and not one bit
    //  busier.
    const echo = ctx.createDelay(1);
    const feedback = ctx.createGain();
    const damp = ctx.createBiquadFilter();
    const echoLevel = ctx.createGain();

    echo.delayTime.value = ECHO_SECONDS;
    feedback.gain.value = ECHO_FEEDBACK;
    damp.type = 'lowpass';
    damp.frequency.value = ECHO_DAMP;
    echoLevel.gain.value = ECHO_WET;

    send.connect(echo);
    echo.connect(damp);
    damp.connect(feedback);
    feedback.connect(echo);
    damp.connect(echoLevel);
    echoLevel.connect(limiter);

    //  And into the room as well, so the echo lands in the same space rather
    //  than in front of it.
    echoLevel.connect(predelay);

    return { dry, send };
}
