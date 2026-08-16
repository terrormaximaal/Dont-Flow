import { afterEach, beforeEach, describe, expect, it } from 'vitest';

//  A browser that counts how many audio contexts a page asks it for.
//
//  The environment here is node, so there is no window at all until this puts
//  one there - which suits the thing being checked, because what matters is
//  only whether the sound system reaches for a context, not what it does with
//  one.
let built = 0;
let resumed = 0;

class FakeContext
{
    state = 'suspended';
    currentTime = 0;

    constructor ()
    {
        built += 1;
    }

    resume (): Promise<void>
    {
        resumed += 1;
        this.state = 'running';

        return Promise.resolve();
    }
}

const {
    resetAudioForTest,
    setMuted,
    setMusicPlaying,
    wakeAudio
} = await import('../src/game/systems/Audio');

describe('when the game is allowed to reach for a sound card', () => {

    beforeEach(() => {

        built = 0;
        resumed = 0;

        (globalThis as { window?: unknown }).window = { AudioContext: FakeContext };

        resetAudioForTest();

    });

    afterEach(() => {

        delete (globalThis as { window?: unknown }).window;

    });

    //  The rule this game already wrote down once and then broke twice: a
    //  context built before the page has been touched comes up suspended, and
    //  in some browsers never resumes. A player who reloads into one of those
    //  has no sound for the whole session, and nothing on screen says why.
    //
    //  Both of these run on the way in to the title screen - one restoring a
    //  remembered choice, the other starting the menus' music - and both used
    //  to build a context to do it.
    it('does not build one before anybody has touched the page', () => {

        setMuted(true);
        setMuted(false);
        setMusicPlaying(false);
        setMusicPlaying(true);

        expect(built, 'contexts built before the first gesture').toBe(0);

    });

    //  And the gesture is what builds it, so nothing is lost by waiting.
    it('builds one on the first gesture, and only one', () => {

        wakeAudio();

        expect(built).toBe(1);
        expect(resumed, 'and starts it, since it comes up suspended').toBe(1);

        wakeAudio();

        expect(built, 'the same one afterwards').toBe(1);

    });

});
