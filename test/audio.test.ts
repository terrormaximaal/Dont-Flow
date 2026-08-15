import { describe, expect, it } from 'vitest';
import { Cue, CUES, DETUNE_CENTS, MASTER_VOLUME, ORB_BASE_HZ, pitchFor, variesOnRepeat, voiceFor } from '../src/game/config/audio';

describe('the note an orb is worth', () => {

    it('starts on the base note and climbs from there', () => {

        expect(pitchFor(0)).toBeCloseTo(ORB_BASE_HZ, 4);
        expect(pitchFor(3)).toBeGreaterThan(pitchFor(0));

    });

    it('never falls as a streak grows', () => {

        for (let combo = 1; combo < 60; combo++)
        {
            expect(pitchFor(combo), `combo ${combo}`).toBeGreaterThanOrEqual(pitchFor(combo - 1));
        }

    });

    //  Past two octaves it stops being a reward and starts being a noise
    //  complaint. A long streak is the case that matters here, since it is the
    //  one a good player will actually reach.
    it('stops climbing before it becomes a whistle', () => {

        expect(pitchFor(9999)).toBeLessThanOrEqual(ORB_BASE_HZ * 4.2);

    });

    //  The whole point of a pentatonic scale: five notes that cannot sound
    //  wrong against each other in any order. A chromatic climb would be in
    //  tune with nothing and would grate by the fourth orb.
    it('uses five notes to the octave rather than twelve', () => {

        const withinFirstOctave = new Set<number>();

        for (let combo = 0; combo < 5; combo++)
        {
            withinFirstOctave.add(Math.round(pitchFor(combo) * 100));
        }

        expect(withinFirstOctave.size, 'distinct notes before it repeats').toBe(5);

        //  And the sixth is the first one again, an octave up.
        expect(pitchFor(5) / pitchFor(0)).toBeCloseTo(2, 2);

    });

    it('answers for a nonsense combo rather than throwing', () => {

        expect(Number.isFinite(pitchFor(-4))).toBe(true);
        expect(Number.isFinite(pitchFor(0.5))).toBe(true);

    });

});

describe('what each moment sounds like', () => {

    it('has a voice for every cue there is', () => {

        for (const cue of CUES)
        {
            const voice = voiceFor(cue);

            expect(voice, cue).toBeDefined();
            expect(voice.seconds, `${cue} length`).toBeGreaterThan(0);
            expect(voice.gain, `${cue} volume`).toBeGreaterThan(0);
            expect(voice.from, `${cue} pitch`).toBeGreaterThan(0);
            expect(voice.to, `${cue} pitch`).toBeGreaterThan(0);
        }

    });

    //  A test that would otherwise quietly stop covering things: a cue added to
    //  the union without being added to CUES is a cue nothing above checks.
    it('lists every cue the table can answer', () => {

        //  Every cue named in the type, written out. If the union grows and
        //  this does not, the compiler fails here rather than the suite
        //  silently testing less than it used to.
        const named: Record<Cue, true> = {
            orb: true, wrong: true, gate: true, jump: true, land: true,
            rainbow: true, life: true, fail: true, finish: true, press: true
        };

        expect([ ...CUES ].sort()).toEqual(Object.keys(named).sort());

    });

    //  Everything here happens while the player is reading the road, and a
    //  sound still ringing when the next one starts is mud. The two that end a
    //  run are excused: they have nothing left to talk over.
    it('keeps every in-play sound short enough not to overlap the next', () => {

        for (const cue of CUES)
        {
            if (cue === 'fail' || cue === 'finish' || cue === 'life')
            {
                continue;
            }

            expect(voiceFor(cue).seconds, `${cue}`).toBeLessThanOrEqual(0.3);
        }

    });

    //  The orb is the sound the player hears constantly. Anything that plays
    //  hundreds of times a run has to sit under the things that play once.
    it('keeps the constant sound quieter than the rare ones', () => {

        expect(voiceFor('orb').gain).toBeLessThan(voiceFor('life').gain);
        expect(voiceFor('orb').gain).toBeLessThan(voiceFor('fail').gain);

        //  And the menu click quieter still. A menu that clicks loudly is a
        //  menu people turn off.
        expect(voiceFor('press').gain).toBeLessThan(voiceFor('orb').gain);

    });

    //  Down for a mistake, up for a reward. The player should be able to tell
    //  what happened without looking, which is most of what sound is for here.
    it('falls for a mistake and rises for a reward', () => {

        expect(voiceFor('wrong').to, 'a wrong colour').toBeLessThan(voiceFor('wrong').from);
        expect(voiceFor('fail').to, 'a run ending').toBeLessThan(voiceFor('fail').from);
        expect(voiceFor('life').to, 'a life going').toBeLessThan(voiceFor('life').from);

        expect(voiceFor('finish').to, 'a level finished').toBeGreaterThan(voiceFor('finish').from);
        expect(voiceFor('rainbow').to, 'a rainbow taken').toBeGreaterThan(voiceFor('rainbow').from);
        expect(voiceFor('jump').to, 'leaving the ground').toBeGreaterThan(voiceFor('jump').from);

    });

    //  A jump and its landing are one gesture with two ends, not two events.
    it('lands lower and shorter than it took off', () => {

        expect(voiceFor('land').from).toBeLessThan(voiceFor('jump').from);
        expect(voiceFor('land').seconds).toBeLessThan(voiceFor('jump').seconds);

    });

    it('follows the combo for the orb and ignores it everywhere else', () => {

        expect(voiceFor('orb', 4).from).toBeGreaterThan(voiceFor('orb', 0).from);

        for (const cue of CUES)
        {
            if (cue === 'orb')
            {
                continue;
            }

            expect(voiceFor(cue, 9).from, `${cue}`).toBe(voiceFor(cue, 0).from);
        }

    });

    //  This is a game played on a phone in public, and the first thing a player
    //  does with one that starts loud is silence it for good.
    it('never asks for more than half volume, cue and master together', () => {

        for (const cue of CUES)
        {
            expect(voiceFor(cue).gain * MASTER_VOLUME, `${cue}`).toBeLessThanOrEqual(0.5);
        }

    });

});

describe('the things that stop a repeat becoming a machine', () => {

    //  A square carries every odd harmonic at full strength forever, which is
    //  what makes one at low pitch read as a buzz rather than a tone. Only the
    //  waves that have that problem are filtered - a sine has no harmonics to
    //  remove and a triangle's fall away too fast to be worth it.
    it('softens the harsh waves and leaves the gentle ones alone', () => {

        for (const cue of CUES)
        {
            const voice = voiceFor(cue);
            const harsh = voice.wave === 'square' || voice.wave === 'sawtooth';

            expect(voice.soften !== undefined, `${cue} is a ${voice.wave}`).toBe(harsh);
        }

    });

    //  The character of a wave is in its first few harmonics; the ice-pick is
    //  in the rest. A cutoff at or below the fundamental would take the note
    //  itself and leave a thud.
    it('cuts above the note rather than through it', () => {

        for (const cue of CUES)
        {
            const voice = voiceFor(cue);

            if (voice.soften === undefined)
            {
                continue;
            }

            //  Comfortably above the highest pitch the sound reaches, so there
            //  are harmonics left to hear.
            expect(voice.soften, `${cue}`).toBeGreaterThan(Math.max(voice.from, voice.to) * 2);
        }

    });

    //  A hundred cents is a semitone. This has to be a fraction of one - the
    //  point is that a repeat is not identical, not that it is a different note.
    it('nudges a repeat off pitch without changing the note', () => {

        expect(DETUNE_CENTS).toBeGreaterThan(0);
        expect(DETUNE_CENTS, 'well under a semitone').toBeLessThan(50);

    });

    //  The two that end a run play once each and are the only sounds anybody
    //  will remember. They should be the same every time.
    it('leaves the sounds that end a run exactly as they are', () => {

        expect(variesOnRepeat('fail')).toBe(false);
        expect(variesOnRepeat('finish')).toBe(false);

        expect(variesOnRepeat('orb'), 'the one heard most').toBe(true);
        expect(variesOnRepeat('gate')).toBe(true);

    });

    //  A dozen a level. Anything that frequent has to sit under the things that
    //  mark a moment, or it becomes the sound of the game.
    it('keeps the sound of a doorway among the quietest there is', () => {

        const louder = CUES.filter((cue) => voiceFor(cue).gain > voiceFor('gate').gain);

        expect(louder, 'only the press is quieter').not.toContain('press');
        expect(voiceFor('gate').gain).toBeLessThan(voiceFor('orb').gain);

    });

});
