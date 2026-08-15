import { Strike } from '../config/audio';
import {
    MUSIC_BEATS_PER_BAR,
    MUSIC_BPM,
    MUSIC_GAIN,
    MUSIC_LOOKAHEAD,
    MUSIC_TICK_MS
} from '../config/constants';
import { barNotes } from '../config/music';
import { audioTime, playAt } from './Audio';

//  The backing, handed to the clock a bar or so before it is due.
//
//  Music cannot be played from the game loop. A frame that arrives late puts
//  a note late, and a run of late notes is not music - it is the same tune
//  with a limp. So the browser's own audio clock keeps time, a timer wakes up
//  four times a second, and every bar that falls due inside the next second
//  and a half is written down in advance. Nothing here is on the game's clock
//  at all, which is also why it holds its shape while the road is speeding up.

const BEAT_SECONDS = 60 / MUSIC_BPM;
const BAR_SECONDS = BEAT_SECONDS * MUSIC_BEATS_PER_BAR;

let timer: ReturnType<typeof setInterval> | null = null;

/** When the next bar is due on the audio clock, and which bar it is. */
let nextBarAt = 0;
let bar = 0;

/**
 * Starts the backing from the top.
 *
 * Called on every level start rather than once for the session: the tune
 * beginning where the run begins is most of what makes it feel like the run's
 * own music instead of something already playing that the game was dropped
 * into.
 */
export function startMusic (): void
{
    stopMusic();

    bar = 0;
    nextBarAt = 0;

    timer = setInterval(fill, MUSIC_TICK_MS);

    fill();
}

/** Stops it, and forgets where it was. */
export function stopMusic (): void
{
    if (timer !== null)
    {
        clearInterval(timer);

        timer = null;
    }
}

/** Whether the backing is running, which is what a paused run has to know. */
export function isMusicPlaying (): boolean
{
    return timer !== null;
}

/**
 * Writes down every bar that falls due soon.
 *
 * Silence rather than a catch-up when there is no audio yet: on a cold load
 * the player has not touched the page, so there is no clock to write on and
 * the first bar is simply the first one after they do.
 */
function fill (): void
{
    const now = audioTime();

    if (now === null)
    {
        return;
    }

    //  A first bar, or one after the clock has run on without us - a phone
    //  that was in another app comes back with minutes on it, and the backing
    //  should carry on from here rather than play all of them.
    if (nextBarAt < now)
    {
        nextBarAt = now + 0.05;
    }

    while (nextBarAt < now + MUSIC_LOOKAHEAD)
    {
        playAt(barStrikes(bar), nextBarAt, MUSIC_GAIN);

        nextBarAt += BAR_SECONDS;
        bar += 1;
    }
}

/** One bar of the backing, with its beats turned into seconds. */
function barStrikes (index: number): Strike[]
{
    return barNotes(index).map((note) => ({
        semitones: note.semitones,
        at: note.beat * BEAT_SECONDS,
        gain: note.gain
    }));
}
