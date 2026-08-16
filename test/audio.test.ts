import { describe, expect, it } from 'vitest';
import { MUSIC_LOOKAHEAD, MUTE_FADE, ORB_SEMITONES, SOUND_MASTER } from '../src/game/config/constants';
import {
    CROWD_DUCK,
    CROWD_SECONDS,
    Cue,
    CUES,
    DETUNE_CENTS,
    frequencyOf,
    pitchFor,
    semitonesFor,
    Strike,
    thinned,
    variesOnRepeat,
    voiceFor
} from '../src/game/config/audio';

/** How loud the cue is at its loudest, which is what it competes on. */
function loudest (cue: Cue): number
{
    const notes = voiceFor(cue);

    return notes.length === 0 ? 0 : Math.max(...notes.map((note: Strike) => note.gain));
}

describe('turning the sound off', () => {

    //  Refusing to schedule new notes is not enough on its own. The soundtrack
    //  is written down a bar or so before it is due - measured in a live run,
    //  between 1.4 and 2.7 seconds of it is on the audio clock at any moment -
    //  so a player who pressed the switch went on hearing music. The master
    //  gain is turned down as well, and the only thing about that which can be
    //  checked away from a speaker is that the fade is the right size.
    it('fades far faster than the music is written ahead', () => {

        expect(MUTE_FADE, 'against the lookahead').toBeLessThan(MUSIC_LOOKAHEAD / 10);

    });

    //  And it is a fade rather than a cut. A gain dropped to zero between one
    //  sample and the next is a step in the waveform, which is heard as a
    //  click - a strange last thing to hear on the way into silence.
    it('is a fade rather than a cut', () => {

        expect(MUTE_FADE, 'seconds').toBeGreaterThan(0);

    });

});

describe('the tick a collected orb makes', () => {

    //  The whole point of this version of the sound: the most-heard sound in
    //  the game is also the least eventful one. It used to climb with the
    //  streak, which made the thing heard hundreds of times a run the thing
    //  that changed most - and a tick that is different every time is a tick
    //  the ear cannot stop listening to.
    it('is the same note however the run is going', () => {

        expect(semitonesFor()).toBe(ORB_SEMITONES);
        expect(voiceFor('orb')).toHaveLength(1);
        expect(voiceFor('orb')[0].semitones).toBe(ORB_SEMITONES);

    });

    it('is one sound rather than a chord', () => {

        expect(voiceFor('orb')).toHaveLength(1);
        expect(voiceFor('orb')[0].timbre).toBe(undefined);

    });

    it('sits where a phone speaker is at its best', () => {

        expect(pitchFor()).toBeGreaterThan(400);
        expect(pitchFor()).toBeLessThan(1200);

    });

    //  Under the music rather than over it. The soundtrack carries the run;
    //  this is the game agreeing with the player, not congratulating them.
    it('is quieter than the things that only happen once', () => {

        expect(loudest('orb')).toBeLessThan(loudest('wrong'));
        expect(loudest('orb')).toBeLessThan(loudest('life'));
        expect(loudest('orb')).toBeLessThan(loudest('finish'));

    });

});

describe('what each moment sounds like', () => {

    it('has a voice for every cue that should have one', () => {

        for (const cue of CUES)
        {
            const notes = voiceFor(cue);

            for (const note of notes)
            {
                expect(note.gain, `${cue} volume`).toBeGreaterThan(0);
                expect(note.gain, `${cue} volume`).toBeLessThanOrEqual(1);
                expect(note.at, `${cue} timing`).toBeGreaterThanOrEqual(0);
            }
        }

    });

    //  Asked for by name: jumping is a thing the player did on purpose and can
    //  see happening, so the game saying it back is the game repeating itself.
    it('says nothing at all about a jump', () => {

        expect(voiceFor('jump')).toHaveLength(0);
        expect(voiceFor('land')).toHaveLength(0);

    });

    //  A test that would otherwise quietly stop covering things: a cue added to
    //  the union without being added to CUES is a cue nothing above checks.
    it('lists every cue the table can answer', () => {

        const named: Record<Cue, true> = {
            orb: true, wrong: true, gate: true, jump: true, land: true,
            rainbow: true, life: true, fail: true, finish: true, press: true
        };

        expect([ ...CUES ].sort()).toEqual(Object.keys(named).sort());

    });

    //  Everything in play happens while the player is reading the road, so
    //  each of those has to be one event rather than something to listen to.
    it('lands every in-play cue in a single moment', () => {

        for (const cue of [ 'orb', 'gate', 'wrong', 'press' ] as Cue[])
        {
            const notes = voiceFor(cue);

            if (notes.length === 0) { continue; }

            const spread = notes[notes.length - 1].at - notes[0].at;

            expect(spread, cue).toBeLessThanOrEqual(0.05);
        }

    });

    it('finishes every phrase before what follows it arrives', () => {

        for (const cue of CUES)
        {
            const notes = voiceFor(cue);

            if (notes.length === 0) { continue; }

            const room = 1.5;

            expect(notes[notes.length - 1].at, cue).toBeLessThan(room);
        }

    });

    //  A wrong colour is the only thing that has to be heard over the music,
    //  and the only note in the game that is not in the key.
    it('puts a mistake outside the key and under the tick', () => {

        const wrong = voiceFor('wrong')[0].semitones;

        expect(((wrong % 12) + 12) % 12, 'a semitone under the root').toBe(11);
        expect(wrong).toBeLessThan(ORB_SEMITONES);

    });

    //  A doorway happens a dozen times a level. Anything that frequent has to
    //  sit under the things that mark a moment.
    it('keeps the doorway among the quietest things there are', () => {

        expect(loudest('gate')).toBeLessThan(loudest('orb'));
        expect(loudest('press')).toBeLessThan(loudest('orb'));

    });

    //  This is a game played on a phone in public, and the first thing a player
    //  does with one that starts loud is silence it for good.
    it('never asks for more than full scale, cue and master together', () => {

        for (const cue of CUES)
        {
            expect(loudest(cue) * SOUND_MASTER, `${cue}`).toBeLessThanOrEqual(1);
        }

    });

});

describe('a stretch of road that is asking for a lot at once', () => {

    it('leaves a cue alone when there is room around it', () => {

        expect(thinned(voiceFor('orb'), 0.5)).toEqual(voiceFor('orb'));
        expect(thinned(voiceFor('orb'), CROWD_SECONDS)).toEqual(voiceFor('orb'));

    });

    //  What is dropped is whatever is not the sound itself: the drum under a
    //  cue and the bass under it are what accumulate, in the mix and in the
    //  room both.
    it('drops the body of a cue that lands in a crowd', () => {

        for (const cue of CUES)
        {
            const full = voiceFor(cue);

            if (full.length === 0) { continue; }

            const crowded = thinned(full, 0.1);
            const heard = full.filter((note) => note.timbre === undefined);

            if (heard.length > 0)
            {
                expect(crowded, cue).toEqual(heard.map((note) => ({ ...note, gain: note.gain * CROWD_DUCK })));
            }
            else
            {
                expect(crowded, cue).toHaveLength(1);
            }
        }

    });

    it('ducks what is left rather than only thinning it', () => {

        expect(thinned(voiceFor('orb'), 0.1)[0].gain).toBeLessThan(voiceFor('orb')[0].gain);

    });

    it('changes what is played rather than what it says', () => {

        const full = voiceFor('wrong');
        const crowded = thinned(full, 0.05);

        expect(crowded[0].semitones).toBe(full[0].semitones);
        expect(crowded[0].at).toBe(full[0].at);

    });

});

describe('the things that stop a repeat becoming a machine', () => {

    //  A hundred cents is a semitone. This has to be a fraction of one - the
    //  point is that a repeat is not identical, not that it is a different note.
    it('nudges a repeat off pitch without changing the note', () => {

        expect(DETUNE_CENTS).toBeGreaterThan(0);
        expect(DETUNE_CENTS, 'well under a semitone').toBeLessThan(50);

    });

    //  The ones that mark the end of something play once each and are the only
    //  sounds anybody will remember. They should be the same every time.
    it('leaves the sounds that end a run exactly as they are', () => {

        expect(variesOnRepeat('fail')).toBe(false);
        expect(variesOnRepeat('finish')).toBe(false);
        expect(variesOnRepeat('life')).toBe(false);

        expect(variesOnRepeat('orb'), 'the one heard most').toBe(true);
        expect(variesOnRepeat('gate')).toBe(true);

    });

});

describe('semitones as frequencies', () => {

    it('doubles every octave', () => {

        expect(frequencyOf(12) / frequencyOf(0)).toBeCloseTo(2);
        expect(frequencyOf(-12) / frequencyOf(0)).toBeCloseTo(0.5);

    });

});
