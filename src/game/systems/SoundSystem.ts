import { PIANO_GAIN, SOUND_ENABLED } from '../config/constants';
import { buildMixer } from './mixer';
import { Note } from './piano';
import { strike } from './voice';

/**
 * The game's one voice, and everything standing between it and the speaker.
 *
 * There is a single instance for the whole page rather than one per scene: a
 * browser allows only a handful of audio contexts, and a tail three seconds
 * long has to survive the scene that started it - a note collected on the last
 * orb of a level is still ringing while the completion panel arrives.
 *
 * Nothing here does anything until `unlock` has been called from inside a real
 * tap or keypress. Every mobile browser refuses to start audio otherwise, and
 * a context created too early is not just silent, it is permanently suspended.
 */
export class SoundSystem
{
    private ctx: AudioContext | null = null;
    private dry: GainNode | null = null;
    private wet: GainNode | null = null;
    private muted = false;

    /** True once a gesture has been seen, whether or not audio then worked. */
    private armed = false;

    /** Asked for before the browser would allow it, and owed once it does. */
    private pending: (() => void) | null = null;

    /**
     * Waits for the first tap or key and starts the audio there.
     *
     * Safe to call more than once; the listeners take themselves off.
     */
    listen (): void
    {
        if (typeof window === 'undefined')
        {
            return;
        }

        const wake = () => this.unlock();

        window.addEventListener('pointerdown', wake, { once: true });
        window.addEventListener('keydown', wake, { once: true });
    }

    /**
     * Starts, or resumes, the audio context. Must be inside a user gesture.
     *
     * Resuming matters as much as creating: a context is suspended again
     * whenever the page is backgrounded, which on a phone is every time the
     * player takes a call or switches app mid-level.
     */
    unlock (): void
    {
        if (!SOUND_ENABLED)
        {
            return;
        }

        if (this.ctx === null)
        {
            this.build();
        }

        void this.ctx?.resume();

        this.armed = true;

        const owed = this.pending;

        this.pending = null;
        owed?.();
    }

    /**
     * Runs `fn` as soon as there is audio to run it into.
     *
     * The title screen wants to play its phrase the moment it appears, and on a
     * cold load there is no audio yet - a browser will not start any until the
     * player has touched the page. Rather than drop the phrase, it waits for
     * the tap that was going to arrive anyway.
     */
    whenAwake (fn: () => void): void
    {
        if (this.armed)
        {
            fn();

            return;
        }

        this.pending = fn;
    }

    setMuted (muted: boolean): void
    {
        this.muted = muted;
    }

    isMuted (): boolean
    {
        return this.muted;
    }

    /**
     * One note, `semitones` from the root.
     *
     * @param when Seconds from now, for phrases that space themselves out.
     */
    note (semitones: number, gain = 1, when = 0): void
    {
        if (this.muted || !this.armed || this.ctx === null || this.dry === null || this.wet === null)
        {
            return;
        }

        //  A tab in the background stops the clock, so a note asked for there
        //  would be scheduled in the past and arrive all at once on return.
        if (this.ctx.state !== 'running')
        {
            return;
        }

        strike(this.ctx, this.dry, semitones, when, gain * PIANO_GAIN);
        strike(this.ctx, this.wet, semitones, when, gain * PIANO_GAIN);
    }

    /** A written phrase, played from now. */
    phrase (notes: Note[], transpose = 0): void
    {
        for (const note of notes)
        {
            this.note(note.semitones + transpose, note.gain, note.at);
        }
    }

    /** The signal path, built once, on the first gesture that allows it. */
    private build (): void
    {
        try
        {
            const ctx = new AudioContext();
            const mixer = buildMixer(ctx, ctx.destination);

            this.ctx = ctx;
            this.dry = mixer.dry;
            this.wet = mixer.send;
        }
        catch
        {
            //  No audio on this device, or the browser refused. The game is
            //  played without it rather than not played.
            this.ctx = null;
        }
    }
}

let instance: SoundSystem | null = null;

/** The one instance, made on first use. */
export function sound (): SoundSystem
{
    instance ??= new SoundSystem();

    return instance;
}
