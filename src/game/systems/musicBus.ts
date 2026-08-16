import { MUSIC_FADE } from '../config/constants';
import { Mixer } from './mixer';

//  The way music reaches the mixer, and the only way to unsay it.
//
//  Nothing in Web Audio can unschedule a note: an oscillator handed to the
//  clock is going to run. A piece is written a bar and a half ahead, so a scene
//  that stops its timer still has seconds of music booked - which is why the
//  menu could be heard over the opening of a level, and why mute had the same
//  problem one layer up.
//
//  So music plays through a gain of its own. Stopping a piece turns that gain
//  down and lets go of it; everything still to come is attached to it and
//  arrives at nothing. The next piece asks for a bus, does not find one, and
//  gets a new one at full volume.

/** The pair of ways music reaches the mixer: the plain one and the wet one. */
let bus: { plain: GainNode; airy: GainNode } | null = null;

/**
 * That pair, made on demand - which is what makes a new piece start at full.
 *
 * Two rather than one, because the tune takes a wetter path to the room than
 * everything else and a single gain cannot fan into two different chains
 * without sending every note down both.
 */
export function musicInto (ctx: BaseAudioContext, chain: Mixer): { plain: GainNode; airy: GainNode }
{
    if (bus !== null)
    {
        return bus;
    }

    const plain = ctx.createGain();
    const airy = ctx.createGain();

    plain.connect(chain.both);
    airy.connect(chain.airy);

    bus = { plain, airy };

    return bus;
}

/**
 * Turns the current bus down and forgets it.
 *
 * Over a third of a second rather than instantly, because one piece giving way
 * to another is a transition and should sound like one - and because a gain cut
 * to zero between two samples is a click.
 */
export function fadeMusicBus (ctx: BaseAudioContext): void
{
    const going = bus;

    bus = null;

    if (going === null)
    {
        return;
    }

    for (const gain of [ going.plain.gain, going.airy.gain ])
    {
        //  From where it actually is rather than from the value it was last
        //  set to: a ramp already under way makes those two different.
        gain.cancelScheduledValues(ctx.currentTime);
        gain.setValueAtTime(gain.value, ctx.currentTime);
        gain.linearRampToValueAtTime(0, ctx.currentTime + MUSIC_FADE);
    }
}

/** Forget it entirely, so a test can start from nothing. */
export function resetMusicBus (): void
{
    bus = null;
}
