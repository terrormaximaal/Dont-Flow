import { Cue, DETUNE_CENTS, Strike, thinned, variesOnRepeat, voiceFor } from '../config/audio';
import { CROWD_SECONDS } from '../config/audio';
import { MUSIC_FADE, MUTE_FADE, SOUND_GAIN, SOUND_MASTER } from '../config/constants';
import { buildMixer, Mixer } from './mixer';
import { strike } from './voice';

//  The thing that makes the noise.
//
//  Everything here is written to be optional. Web Audio can be absent, it can
//  throw on construction, and it is not allowed to make a sound at all until
//  the player has touched the page - so every path through this file has to end
//  with the game carrying on regardless. A game that fails to start because a
//  browser would not give it an oscillator is a worse game than a silent one.
//
//  One context for the whole session, held statically. Browsers cap how many a
//  page may have and a scene restart would otherwise leak one per run.

let context: AudioContext | null = null;
let mixer: Mixer | null = null;
let unavailable = false;
let muted = false;
let listening = false;

/** When the last cue was played, on the audio clock, to hear a crowd coming. */
let lastCueAt = -1;

/** The context, made on first use, or null where there is none to be had. */
function audio (): AudioContext | null
{
    if (unavailable)
    {
        return null;
    }

    if (context !== null)
    {
        return context;
    }

    try
    {
        const Ctor = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (Ctor === undefined)
        {
            unavailable = true;

            return null;
        }

        context = new Ctor();
    }
    catch
    {
        //  Some browsers throw rather than returning nothing. Either way the
        //  answer is the same and it is only asked once.
        unavailable = true;

        return null;
    }

    return context;
}

/**
 * Wake the audio up, on a real user gesture.
 *
 * Browsers start a context suspended and refuse to resume it except from inside
 * a genuine input event, so this has to be called from a tap rather than from
 * scene setup. Calling it more often than needed is harmless.
 */
export function wakeAudio (): void
{
    const ctx = audio();

    if (ctx !== null && ctx.state === 'suspended')
    {
        void ctx.resume().catch(() => undefined);
    }
}

/**
 * Wakes the audio on whatever gesture arrives first, wherever it arrives.
 *
 * The buttons already wake it when they are pressed, which covers a phone -
 * every touch on this game is a button. A keyboard player never presses one:
 * the title is started with Enter and the road is steered with arrows, so
 * without this the whole game is silent on a desktop until something is
 * clicked. Left attached rather than taken off after the first one, because a
 * page that has been in the background comes back suspended and needs waking
 * again.
 */
export function listenForGesture (): void
{
    if (typeof window === 'undefined' || listening)
    {
        return;
    }

    listening = true;

    window.addEventListener('pointerdown', () => wakeAudio());
    window.addEventListener('keydown', () => wakeAudio());
}

/** Whether sound is currently off. */
export function isMuted (): boolean
{
    return muted;
}

/**
 * Turn sound on or off. Persisting the choice is the caller's business.
 *
 * Refusing to schedule anything new is not enough on its own. The soundtrack
 * is handed to the audio clock a bar and a half before it is due, so a player
 * who pressed the switch went on hearing music for the better part of two
 * seconds - measured at 1.90 - which is a long time to sit next to somebody
 * who has just asked you to be quiet.
 *
 * So the last gain before the speaker is turned down as well. Over a few
 * milliseconds rather than instantly: cutting a sounding note to zero on one
 * sample is a click, and a click is a worse noise than the note was.
 */
export function setMuted (value: boolean): void
{
    muted = value;

    //  Nothing has been built yet, so there is nothing sounding to silence.
    //  The flag above is the whole answer until the first note asks for a
    //  chain, and buildMixer starts it wherever the flag says.
    //
    //  Deliberately reading the context rather than asking for one. The title
    //  screen calls this on the way in to restore a remembered choice, and a
    //  context built before the page has been touched is a context some
    //  browsers never let go of again - it comes up suspended and stays that
    //  way, which is a game that is simply silent for the whole session. The
    //  first gesture is what builds one, and there is nothing to silence
    //  before then anyway.
    const ctx = context;

    if (mixer === null || ctx === null)
    {
        return;
    }

    const gain = mixer.master.gain;

    //  From wherever it actually is right now, not from the value it was last
    //  set to: a ramp already under way means those two are different, and
    //  starting from the stale one is the click this is here to avoid.
    gain.cancelScheduledValues(ctx.currentTime);
    gain.setValueAtTime(gain.value, ctx.currentTime);
    gain.linearRampToValueAtTime(value ? 0 : SOUND_MASTER, ctx.currentTime + MUTE_FADE);
}

/**
 * Bring the soundtrack in or take it away, leaving the game's own sounds alone.
 *
 * Clearing the timer that writes bars down does not unwrite the bars already
 * on the audio clock: measured through the pause button, the backing was still
 * due to play for 1.73 seconds after the game had stopped. Two comments in the
 * play scene say otherwise - that pausing stops the music, and that the phrase
 * ending a run is the only thing playing when it lands - and neither was true.
 *
 * Faded rather than cut, and over longer than the mute: this one happens while
 * the player is listening to something else - an overlay opening, a run ending
 * - and a soundtrack that disappears between two samples is heard as a fault.
 */
export function setMusicPlaying (playing: boolean): void
{
    //  Reading the context rather than asking for one, as the mute switch does
    //  and for the same reason: the menus start their music on the way in, and
    //  a context built before the page has been touched comes up suspended and
    //  in some browsers never resumes. With no mixer there is no soundtrack to
    //  bring in or take away, and the first note builds both.
    const ctx = context;

    if (mixer === null || ctx === null)
    {
        return;
    }

    for (const node of [ mixer.musicBoth, mixer.musicAiry ])
    {
        const gain = node.gain;

        gain.cancelScheduledValues(ctx.currentTime);
        gain.setValueAtTime(gain.value, ctx.currentTime);
        gain.linearRampToValueAtTime(playing ? 1 : 0, ctx.currentTime + MUSIC_FADE);
    }
}

/**
 * Make the noise for a moment.
 *
 * Silent and harmless when muted, when there is no context, or when the context
 * has not been woken yet - all three are ordinary states rather than errors.
 */
export function play (cue: Cue): void
{
    if (muted)
    {
        return;
    }

    const ctx = audio();

    if (ctx === null || ctx.state !== 'running')
    {
        return;
    }

    try
    {

        //  A fraction of a semitone either way, so a sound repeating hundreds
        //  of times a run is never byte-for-byte the same twice. Not applied to
        //  the written phrases - those play once and should be the sound the
        //  player remembers rather than a slightly different one each time.
        const drift = variesOnRepeat(cue)
            ? (((Math.random() * 2) - 1) * DETUNE_CENTS) / 100
            : 0;

        //  Thinned when they are arriving on top of each other, and the copy
        //  into the room dropped with them: the room is where a busy stretch
        //  turns into a wash, because every note is held there for three
        //  seconds after the note itself has gone.
        const now = ctx.currentTime;
        const gap = lastCueAt < 0 ? Infinity : now - lastCueAt;
        const crowded = variesOnRepeat(cue) && gap < CROWD_SECONDS;

        const notes = crowded ? thinned(voiceFor(cue), gap) : voiceFor(cue);

        lastCueAt = now;

        schedule(ctx, notes, now, SOUND_GAIN, drift, !crowded);
    }
    catch
    {
        //  A sound that will not play is not worth interrupting a run for.
    }
}

/**
 * The audio clock, or null when there is nothing running to read it from.
 *
 * Music has to be handed to the sound card before it is due, so the thing
 * writing it needs to know what time the card thinks it is - which is not the
 * same clock as the game's.
 */
export function audioTime (): number | null
{
    return context !== null && context.state === 'running' ? context.currentTime : null;
}

/**
 * Notes at a given moment on that clock, rather than now.
 *
 * The backing is written ahead of itself, which is the only way a browser
 * plays anything in time: a note handed over a second early lands exactly when
 * it was asked to, however busy the frame that asked is.
 */
export function playAt (notes: Strike[], when: number, gain = 1): void
{
    if (muted)
    {
        return;
    }

    const ctx = audio();

    if (ctx === null || ctx.state !== 'running')
    {
        return;
    }

    try
    {
        schedule(ctx, notes, when, gain * SOUND_GAIN, 0, true, true);
    }
    catch
    {
        //  As above: a sound that will not play is not worth a broken run.
    }
}

/**
 * Hands a set of notes to the clock, twice over: once straight out, once into
 * the room. The room is the loud half, which is why a note is sent there
 * rather than passed through it.
 */
function schedule (
    ctx: AudioContext,
    notes: Strike[],
    from: number,
    gain: number,
    drift: number,
    room: boolean,
    music = false
): void
{
    //  Built at whatever the switch currently says. Nothing reaches here
    //  while muted today - both entry points refuse first - but a chain that
    //  came up at full volume under a mute would be a loud surprise, and the
    //  cost of not relying on that is one line.
    if (mixer === null)
    {
        mixer = buildMixer(ctx, ctx.destination);
        mixer.master.gain.value = muted ? 0 : SOUND_MASTER;
    }

    const chain = mixer;
    const offset = from - ctx.currentTime;

    //  Once, into a junction that is already wired to both sides - rather than
    //  twice, once per side. A note built twice is a note that costs twice, and
    //  on the busiest stretch of a level that was the difference between a
    //  phone keeping up and a phone dropping the music.
    //  The soundtrack goes in through its own pair, which is what lets it be
    //  turned off on its own. Everything else plays straight into the
    //  junctions, exactly as before.
    const into = room ? (music ? chain.musicBoth : chain.both) : chain.dry;

    for (const note of notes)
    {
        //  Anything already in the past is dropped rather than played late: a
        //  phone that was asleep comes back with a backlog, and a bar's worth
        //  of music arriving at once is worse than a missing bar.
        if (note.at + offset < -0.05)
        {
            continue;
        }

        //  Three ways out, and a note picks one by what it is for.
        //
        //  The phrase that ends a level goes into the large space: it plays
        //  once, with the road stopped and the music taken away, and there is
        //  nothing for a long tail to blur. The two voices that carry a tune
        //  take the wetter of the ordinary junctions, because both ring on
        //  after they are struck and a ringing note with no room around it is a
        //  test tone. Everything else is a short event, which a room only
        //  smears.
        const sings = note.timbre === 'lead' || note.timbre === 'pluck';
        const bus = note.hall === true
            ? chain.hall
            : (room && sings ? (music ? chain.musicAiry : chain.airy) : into);

        strike(ctx, bus, note.semitones + drift, note.at + offset, note.gain * gain, note.timbre, note.held);
    }
}

/** Forget everything, so a test can start from nothing. */
export function resetAudioForTest (): void
{
    context = null;
    mixer = null;
    unavailable = false;
    muted = false;
    listening = false;
    lastCueAt = -1;
}
