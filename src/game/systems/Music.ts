import { Strike } from '../config/audio';
import {
    MUSIC_BEATS_PER_BAR,
    MUSIC_BPM,
    MUSIC_GAIN,
    MUSIC_LOOKAHEAD,
    MUSIC_SELECT_GAIN,
    MUSIC_TICK_MS
} from '../config/constants';
import { Beat, barNotes } from '../config/music';
import { selectBar } from '../config/musicMenu';
import { audioTime, playAt } from './Audio';

//  The soundtrack, handed to the clock a bar or so before it is due.
//
//  Music cannot be played from the game loop. A frame that arrives late puts a
//  note late, and a run of late notes is not music - it is the same tune with
//  a limp. So the browser's own audio clock keeps time, a timer wakes up four
//  times a second, and every bar falling due inside the next second and a half
//  is written down in advance.
//
//  Two pieces, one at a time: the run has drums and a tune, the level select
//  has the same chords with neither. Which one is playing is the only thing a
//  scene has to say.

const BEAT_SECONDS = 60 / MUSIC_BPM;
const BAR_SECONDS = BEAT_SECONDS * MUSIC_BEATS_PER_BAR;

/** Which of the two pieces is playing. */
export type Track = 'play' | 'select';

let timer: ReturnType<typeof setInterval> | null = null;
let track: Track = 'play';

/** When the next bar is due on the audio clock, and which bar it is. */
let nextBarAt = 0;
let bar = 0;

/** How far into the run-in to the finish the level is, 0 to 1. */
let finale = 0;

/**
 * Starts a piece from the top.
 *
 * Called on every level start rather than once for the session: the tune
 * beginning where the run begins is most of what makes it feel like this run's
 * music rather than something already playing that the game was dropped into.
 */
export function startMusic (which: Track = 'play'): void
{
    stopMusic();

    track = which;
    bar = 0;
    nextBarAt = 0;
    finale = 0;

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

/** Whether the soundtrack is running, which is what a paused run has to know. */
export function isMusicPlaying (): boolean
{
    return timer !== null;
}

/** Which piece is playing, so a scene can leave one that is already right. */
export function playingTrack (): Track | null
{
    return timer === null ? null : track;
}

/**
 * How far into the piece it has got, in bars.
 *
 * Read by nothing in the game. It is here so that a test can tell the
 * difference between music that carried on across a screen change and music
 * that started again from its first note - which from the outside are
 * otherwise identical, and are the whole point of `startMenuMusic`.
 */
export function musicBar (): number
{
    return bar;
}

/**
 * The menus' music, started only if it is not already going.
 *
 * Both menu screens call this and neither stops it, so walking from the title
 * to the level select and back leaves the music entirely alone: it carries on
 * from where it is, the way music in a building does when you walk between two
 * rooms. Starting it again on every screen would restart the tune from its
 * first note every time somebody changed their mind, which is the surest way
 * to make a thirty-two bar piece sound like four.
 *
 * A run is what interrupts it. `startMusic('play')` stops this and puts the
 * level's own music up instead.
 */
export function startMenuMusic (): void
{
    if (playingTrack() !== 'select')
    {
        startMusic('select');
    }
}

/**
 * How close the finish is, 0 until the run-in starts and 1 at the line.
 *
 * Read when a bar is written rather than when it is played, so the drums pick
 * up a bar at a time - which is the only way a pattern can change without it
 * being heard as a glitch.
 */
export function setFinale (amount: number): void
{
    finale = Math.max(0, Math.min(1, amount));
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
    //  that was in another app comes back with minutes on it, and the music
    //  should carry on from here rather than play all of them.
    if (nextBarAt < now)
    {
        nextBarAt = now + 0.05;
    }

    const gain = track === 'play' ? MUSIC_GAIN : MUSIC_SELECT_GAIN;

    while (nextBarAt < now + MUSIC_LOOKAHEAD)
    {
        playAt(seconds(track === 'play' ? barNotes(bar, finale) : selectBar(bar)), nextBarAt, gain);

        nextBarAt += BAR_SECONDS;
        bar += 1;
    }
}

/** One bar, with its beats turned into seconds. */
function seconds (notes: Beat[]): Strike[]
{
    return notes.map((note) => ({
        semitones: note.semitones,
        at: note.beat * BEAT_SECONDS,
        gain: note.gain,
        timbre: note.timbre,
        held: (note.held ?? 0) * BEAT_SECONDS
    }));
}
