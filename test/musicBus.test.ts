import { beforeEach, describe, expect, it } from 'vitest';

//  Just enough of Web Audio to build the mixer and hand it a note.
//
//  Node has none of it, and the thing being checked is a wiring question rather
//  than a sound one: which gain a note is played through, and whether a piece
//  that has been stopped can be brought back by the piece that replaces it.
//  None of that needs a sample to be produced.

let built: FakeGain[] = [];

class FakeParam
{
    value = 1;

    /** Every ramp asked for, in order, as the target value. */
    readonly ramps: number[] = [];

    setValueAtTime (v: number): void { this.value = v; }
    cancelScheduledValues (): void { /* nothing to cancel here */ }

    linearRampToValueAtTime (v: number): void
    {
        this.ramps.push(v);
        this.value = v;
    }

    exponentialRampToValueAtTime (v: number): void { this.value = v; }
}

class FakeNode
{
    readonly outputs: FakeNode[] = [];

    connect (to: FakeNode): void { this.outputs.push(to); }
    disconnect (): void { this.outputs.length = 0; }
}

class FakeGain extends FakeNode
{
    readonly gain = new FakeParam();

    constructor () { super(); built.push(this); }
}

class FakeContext
{
    sampleRate = 44100;
    currentTime = 0;
    state = 'running';
    destination = new FakeNode();

    createGain (): FakeGain { return new FakeGain(); }
    createDelay (): FakeNode { return withParam('delayTime'); }
    createBiquadFilter (): FakeNode { return withParams([ 'frequency', 'Q', 'gain', 'detune' ], 'type'); }
    createConvolver (): FakeNode { return new FakeNode(); }
    createOscillator (): FakeNode { return oscillator(); }
    createBufferSource (): FakeNode { return source(); }
    createPeriodicWave (): FakeNode { return new FakeNode(); }
    createDynamicsCompressor (): FakeNode
    {
        return withParams([ 'threshold', 'knee', 'ratio', 'attack', 'release' ]);
    }

    createBuffer (): { getChannelData: () => Float32Array; copyToChannel: () => void }
    {
        return { getChannelData: () => new Float32Array(8), copyToChannel: () => undefined };
    }
}

function withParam (name: string): FakeNode
{
    const node = new FakeNode() as FakeNode & Record<string, unknown>;

    node[name] = new FakeParam();

    return node;
}

function withParams (names: string[], ...plain: string[]): FakeNode
{
    const node = new FakeNode() as FakeNode & Record<string, unknown>;

    for (const name of names) { node[name] = new FakeParam(); }
    for (const name of plain) { node[name] = ''; }

    return node;
}

function oscillator (): FakeNode
{
    const node = withParams([ 'frequency', 'detune' ], 'type') as FakeNode & Record<string, unknown>;

    node.start = () => undefined;
    node.stop = () => undefined;
    node.setPeriodicWave = () => undefined;

    return node;
}

function source (): FakeNode
{
    const node = new FakeNode() as FakeNode & Record<string, unknown>;

    node.buffer = null;
    node.start = () => undefined;
    node.stop = () => undefined;

    return node;
}

const { playAt, resetAudioForTest, setMusicPlaying } = await import('../src/game/systems/Audio');

describe('the way the soundtrack reaches the speaker', () => {

    beforeEach(() => {

        built = [];

        (globalThis as { window?: unknown }).window = { AudioContext: FakeContext };

        resetAudioForTest();

    });

    //  The bug this exists for, which had already been fixed twice in other
    //  places and came back here. Starting a level stops the menu's piece and
    //  starts the level's in the same tick, so on one audio clock reading the
    //  fade-out is cancelled by the fade-in before it has moved at all - and
    //  the menu bars already written a second or two ahead carry on at full
    //  volume over the opening of the level.
    it('never lets a stopped piece be brought back by the one replacing it', () => {

        playAt([ { semitones: 0, at: 0, gain: 0.5 } ], 0, 1);

        const first = built.filter((g) => g.outputs.length > 0);

        expect(first.length, 'the music found a way out').toBeGreaterThan(0);

        //  What starting a level does, in the order it does it.
        setMusicPlaying(false);
        setMusicPlaying(true);

        const faded = first.filter((g) => g.gain.ramps.includes(0));

        expect(faded.length, 'the old piece was taken down').toBeGreaterThan(0);

        for (const gain of faded)
        {
            expect(gain.gain.ramps, 'and never brought back up').not.toContain(1);
        }

    });

    it('gives the piece that follows a way out of its own', () => {

        //  Which gains a piece was played through, read off the graph by the
        //  one mark only a bus carries: it was taken down when the piece
        //  stopped. Counting nodes would not do - a note builds a handful of
        //  its own every time, so the total climbs whether the bus is fresh
        //  or the old one handed back.
        const takenDown = (): FakeGain[] => {

            playAt([ { semitones: 0, at: 0, gain: 0.5 } ], 0, 1);
            setMusicPlaying(false);

            return built.filter((g) => g.gain.ramps.includes(0));
        };

        const first = takenDown();

        expect(first.length, 'the first piece had a bus').toBeGreaterThan(0);

        const next = takenDown().filter((g) => !first.includes(g));

        expect(next.length, 'and the second a different one').toBeGreaterThan(0);

    });

    //  A run coming back from a pause has not let go of anything, so there is
    //  something to raise and it is the same piece it was.
    it('brings a paused piece back up rather than starting another', () => {

        playAt([ { semitones: 0, at: 0, gain: 0.5 } ], 0, 1);

        const bus = built.filter((g) => g.outputs.length > 0);
        const made = built.length;

        setMusicPlaying(true);

        expect(built.length, 'nothing new was built').toBe(made);
        expect(bus.some((g) => g.gain.ramps.includes(1)), 'the same pair came back up').toBe(true);

    });

});
