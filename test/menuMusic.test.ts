import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

//  A clock the test owns, so bars can be made to pass without a sound card.
//
//  `systems/Music` writes bars to the audio clock ahead of time and asks the
//  sound system what time it is. With no audio there is no clock and nothing is
//  ever written, so a test of what the music does over time has to supply one -
//  both halves of it: the audio clock here, and the timer that tops the music
//  up, which vitest drives.
let now = 0;

/** Every time the music was told to fade out what it had already booked. */
let faded = 0;

vi.mock('../src/game/systems/Audio', () => ({
    audioTime: () => now,
    playAt: () => undefined,
    fadeMusic: () => { faded += 1; }
}));

const {
    isMusicPlaying,
    musicBar,
    playingTrack,
    startMenuMusic,
    startMusic,
    stopMusic
} = await import('../src/game/systems/Music');

const { MUSIC_BEATS_PER_BAR, MUSIC_BPM, MUSIC_TICK_MS } = await import('../src/game/config/constants');

const BAR_SECONDS = (60 / MUSIC_BPM) * MUSIC_BEATS_PER_BAR;

/** Lets `seconds` of audio go by, waking the music as its own timer would. */
function pass (seconds: number): void
{
    const steps = Math.ceil((seconds * 1000) / MUSIC_TICK_MS);

    for (let i = 0; i < steps; i++)
    {
        now += MUSIC_TICK_MS / 1000;

        vi.advanceTimersByTime(MUSIC_TICK_MS);
    }
}

describe('the music the menus share', () => {

    beforeEach(() => {

        vi.useFakeTimers();

        stopMusic();

        now = 0;
        faded = 0;

    });

    afterEach(() => {

        stopMusic();

        vi.useRealTimers();

    });

    //  Stopping the timer is only half of stopping. A piece is written to the
    //  clock a bar and a half early, so up to three seconds of it are already
    //  booked and will play whatever the timer does - which is exactly what the
    //  menu did over the opening of a level.
    it('fades out what it has already booked when it stops', () => {

        startMenuMusic();

        pass(BAR_SECONDS * 2);

        faded = 0;

        stopMusic();

        expect(faded, 'told the sound system to let go of it').toBe(1);

    });

    it('does that when a run takes it over, too', () => {

        startMenuMusic();

        pass(BAR_SECONDS * 2);

        faded = 0;

        startMusic('play');

        expect(faded, 'the menu piece is not left sounding over the level').toBe(1);

    });

    it('starts when a menu screen asks for it', () => {

        expect(playingTrack()).toBe(null);

        startMenuMusic();

        expect(isMusicPlaying()).toBe(true);
        expect(playingTrack()).toBe('select');

    });

    //  The thing this exists for. Both menu screens call it on the way in and
    //  neither stops it, so walking from the title to the level select and back
    //  has to leave the music exactly where it was - not send it back to its
    //  first note every time somebody changes their mind.
    it('carries on where it was when the other screen asks again', () => {

        startMenuMusic();

        pass(BAR_SECONDS * 6);

        const reached = musicBar();

        expect(reached, 'bars have gone by').toBeGreaterThan(3);

        //  The other menu screen opening.
        startMenuMusic();

        expect(musicBar(), 'still where it was').toBeGreaterThanOrEqual(reached);

        pass(BAR_SECONDS * 2);

        expect(musicBar(), 'and still going').toBeGreaterThan(reached);

    });

    it('goes back to the top when a run takes it over', () => {

        startMenuMusic();

        pass(BAR_SECONDS * 6);

        const reached = musicBar();

        startMusic('play');

        expect(playingTrack()).toBe('play');
        expect(musicBar(), 'a level begins where its music begins').toBeLessThan(reached);
        expect(musicBar()).toBeLessThanOrEqual(1);

    });

    //  And coming back out of a run starts the menu piece over rather than
    //  resuming it, because the run stopped it - which is right: the tune
    //  opening the game again is how the menu says the level is behind you.
    it('starts the menu piece afresh after a run', () => {

        startMusic('play');

        pass(BAR_SECONDS * 6);

        expect(musicBar()).toBeGreaterThan(3);

        stopMusic();
        startMenuMusic();

        expect(playingTrack()).toBe('select');
        expect(musicBar()).toBeLessThanOrEqual(1);

    });

});
