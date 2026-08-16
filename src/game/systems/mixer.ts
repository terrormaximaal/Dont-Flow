import {
    ECHO_DAMP,
    ECHO_FEEDBACK,
    ECHO_SECONDS,
    ECHO_WET,
    HALL_DRY,
    HALL_PREDELAY,
    HALL_WET,
    LEAD_ROOM,
    REVERB_DRY,
    REVERB_PREDELAY,
    REVERB_WET,
    SOUND_COMPRESSOR_ATTACK,
    SOUND_COMPRESSOR_KNEE,
    SOUND_COMPRESSOR_RATIO,
    SOUND_COMPRESSOR_RELEASE,
    SOUND_COMPRESSOR_THRESHOLD,
    SOUND_MASTER
} from '../config/constants';
import { hall, room } from './reverb';

/** Where a note is played into. */
export interface Mixer
{
    /** The note itself, heard immediately. */
    dry: GainNode;

    /** The room, heard a moment later. */
    send: GainNode;

    /**
     * The two of those together, which is where nearly everything goes.
     *
     * A note used to be built twice - once for the dry side and once for the
     * room - which is a whole second instrument per note, and a hi-hat is six
     * oscillators. One permanent junction wired to both costs nothing per note
     * and halves what the game asks of a phone.
     */
    both: GainNode;

    /** The same again with more of the room in it, which the tune alone takes. */
    airy: GainNode;

    /**
     * The way into the large space, which only the phrase ending a level takes.
     *
     * A separate convolver rather than more send on the one above: the room
     * everything else uses is a cabinet on purpose, and lengthening it would
     * put a tail under every collected orb in the game.
     */
    hall: GainNode;

    /**
     * The last thing before the speaker, and the only way to silence a note
     * that has already been handed to the clock.
     *
     * The soundtrack is written down a bar and a half in advance, so refusing
     * to schedule anything new leaves whatever is already booked to play out.
     * Turning this down stops all of it at once, which is what a player asking
     * for silence is asking for.
     */
    master: GainNode;

    /**
     * The soundtrack's way in to the two junctions above, and the only thing
     * that can silence it without silencing the game with it.
     *
     * Set together, always to the same value. Two of them only because a note
     * chooses its junction by what it is, so there is no single point upstream
     * of that choice to put one bus at.
     */
    musicBoth: GainNode;
    musicAiry: GainNode;
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

    //  The junction everything that is not crowded plays into. Permanent, so
    //  no note ever pays to make one.
    const both = ctx.createGain();

    both.connect(dry);
    both.connect(send);

    //  And the same again with more of the room in it, for the tune alone.
    //
    //  A wind instrument is the one voice here that belongs in a space rather
    //  than in front of one - it is a held sound, and a held sound with no room
    //  around it is a test tone. Everything else is struck and wants to stay
    //  dry, so this is a second junction rather than more reverb on the lot.
    const airy = ctx.createGain();
    const airySend = ctx.createGain();

    airySend.gain.value = LEAD_ROOM;

    airy.connect(dry);
    airy.connect(airySend);
    airySend.connect(send);

    //  The large space, for the one phrase in the game that has the road to
    //  itself. Its own predelay as well: a big room answers later than a small
    //  one, and that gap is a large part of how big it sounds.
    const hallIn = ctx.createGain();
    const hallDry = ctx.createGain();
    const hallPre = ctx.createDelay(1);
    const hallWet = ctx.createGain();

    hallDry.gain.value = HALL_DRY;
    hallPre.delayTime.value = HALL_PREDELAY;
    hallWet.gain.value = HALL_WET;

    hallIn.connect(hallDry);
    hallDry.connect(limiter);

    const hallRoom = hall(ctx);

    hallIn.connect(hallPre);
    hallPre.connect(hallRoom);
    hallRoom.connect(hallWet);
    hallWet.connect(limiter);

    //  The soundtrack's own way in to the two junctions above.
    //
    //  Two nodes rather than one because a note picks its junction by what it
    //  is - the tune takes the wetter one - and a single bus upstream of that
    //  choice cannot exist. They are always set together and always to the
    //  same value, which is why they read as one control everywhere else.
    //
    //  Nothing is mixed here: both sit at 1 and pass the music straight
    //  through. They exist so that the music, and only the music, can be
    //  turned off - the bars are written to the audio clock a second or two
    //  before they are due, so stopping the writer leaves everything already
    //  booked to play out, over a pause or over the phrase that ends a run.
    const musicBoth = ctx.createGain();
    const musicAiry = ctx.createGain();

    musicBoth.connect(both);
    musicAiry.connect(airy);

    return { dry, send, both, airy, hall: hallIn, master, musicBoth, musicAiry };
}
