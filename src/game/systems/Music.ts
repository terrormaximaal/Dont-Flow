import { Strike } from '../config/audio';
import {
    MUSIC_BEATS_PER_BAR,
    MUSIC_GAIN,
    MUSIC_LOOKAHEAD,
    MUSIC_SNAP_BEATS,
    MUSIC_TICK_MS
} from '../config/constants';
import { barNotes, barStart } from '../config/music';
import { audioTime, playAt } from './Audio';

//  The backing, laid along the road and handed to the clock a bar before it is
//  due.
//
//  Two things have to be true at once. Music cannot be played from the game
//  loop - a frame that arrives late puts a note late, and a run of late notes
//  is not music, it is the same tune with a limp - so notes have to be written
//  to the browser's own audio clock in advance. But a bar is a length of
//  *road* rather than a length of time: it is a whole number of orb rows, so
//  every collect lands on a beat, and a level that speeds up plays its music
//  faster rather than sliding out of step with the road it is laid over.
//
//  So bars are counted in track pixels, and turned into a time only at the
//  moment they are handed over, from how fast the road is moving right then.

let timer: ReturnType<typeof setInterval> | null = null;

/** How long a bar is, in track pixels, and where the next one starts. */
let barLength = 0;
let nextBarAt = 0;
let bar = 0;

/** Where the drop is and how fast it is going, as of the last frame. */
let distance = 0;
let speed = 0;

/**
 * Every row of orbs on the road, sorted. The bars are pulled onto these.
 */
let rows: number[] = [];

/** How far into the run-in to the finish the level is, 0 to 1. */
let finale = 0;

/**
 * Starts the backing, laid out along this level's own road.
 *
 * @param length A bar in track pixels: a whole number of rows, so the music
 *               and the level share a grid.
 * @param from   Where the first bar begins - the first row of orbs, so the
 *               backing lands with the first thing the player collects rather
 *               than wherever the road happened to start.
 */
export function startMusic (length: number, from: number, onRows: number[] = []): void
{
    stopMusic();

    rows = [ ...onRows ].sort((a, b) => a - b);
    barLength = Math.max(1, length);
    nextBarAt = from;
    bar = 0;
    finale = 0;
    distance = from;
    speed = 0;

    timer = setInterval(fill, MUSIC_TICK_MS);
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

/**
 * More road to lay bars along, for a run that is still being generated.
 *
 * Appended rather than replaced: an endless run is topped up a batch at a
 * time, and the rows already behind the drop are what the bars so far were
 * placed on.
 */
export function addRows (more: number[]): void
{
    rows = [ ...rows, ...more ].sort((a, b) => a - b);
}

/** Whether the backing is running, which is what a paused run has to know. */
export function isMusicPlaying (): boolean
{
    return timer !== null;
}

/**
 * Where the road is and how fast it is moving, from the game loop.
 *
 * Both are needed: the distance says which bar is due, and the speed says how
 * long it is until the drop gets there. Taken fresh every frame, so a boost is
 * picked up as it arrives rather than a bar later.
 */
export function setRoad (travelled: number, pace: number): void
{
    distance = travelled;
    speed = pace;
}

/**
 * How close the finish is, 0 until the run-in starts and 1 at the line.
 *
 * Read when a bar is written rather than when it is played, so the backing
 * thickens a bar at a time - which is the only way it can change, and also the
 * only way it should: a chord that grew halfway through would be a glitch.
 */
export function setFinale (amount: number): void
{
    finale = Math.max(0, Math.min(1, amount));
}

/**
 * Writes down every bar the drop will reach soon.
 *
 * Silence rather than a catch-up when there is nothing to write on: on a cold
 * load the player has not touched the page, so there is no audio clock yet and
 * the first bar is simply the first one after they do.
 */
function fill (): void
{
    const now = audioTime();

    if (now === null || speed <= 0)
    {
        return;
    }

    //  A bar the drop has already gone past is skipped rather than played
    //  late: a phone coming back from another app should carry on from where
    //  the road is, not play the stretch it missed.
    if (nextBarAt < distance)
    {
        const behind = Math.ceil((distance - nextBarAt) / barLength);

        nextBarAt += behind * barLength;
        bar += behind;
    }

    const reach = distance + (speed * MUSIC_LOOKAHEAD);

    while (nextBarAt <= reach)
    {
        const from = nextBarAt;
        const next = barStart(
            from + barLength,
            rows,
            (barLength / MUSIC_BEATS_PER_BAR) * MUSIC_SNAP_BEATS
        );

        //  Distance into seconds, at the pace being run right now. A bar is
        //  handed over at most a second and a half early, so a change of pace
        //  inside that window is worth a few milliseconds - and the bar after
        //  it is measured from wherever the drop actually got to, so nothing
        //  accumulates.
        playAt(barStrikes(bar, finale, next - from), now + ((from - distance) / speed), MUSIC_GAIN);

        nextBarAt = next;
        bar += 1;
    }
}

/**
 * One bar of the backing, with its beats turned into seconds.
 *
 * The beats are spaced by the road as well - a bar's pixels divided by the
 * beats in it - so the whole bar arrives in step with the rows it is laid over
 * rather than only starting in step with them.
 */
function barStrikes (index: number, into: number, length: number): Strike[]
{
    const beatSeconds = (length / MUSIC_BEATS_PER_BAR) / Math.max(1, speed);

    return barNotes(index, into).map((note) => ({
        semitones: note.semitones,
        at: note.beat * beatSeconds,
        gain: note.gain,
        timbre: note.timbre
    }));
}
