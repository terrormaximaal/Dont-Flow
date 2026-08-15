import { describe, expect, it } from 'vitest';
import { ORB_MAX_SEMITONES, SOUND_MASTER } from '../src/game/config/constants';
import {
    CROWN_FROM,
    Cue,
    CUES,
    DETUNE_CENTS,
    frequencyOf,
    ORB_BASE_HZ,
    pitchFor,
    semitonesFor,
    Strike,
    thinned,
    CROWD_SECONDS,
    variesOnRepeat,
    voiceFor
} from '../src/game/config/audio';
import { decayOf } from '../src/game/systems/voice';

/** The pitch a cue opens on, which is what a player hears it as. */
function opens (cue: Cue, combo = 0): number
{
    return voiceFor(cue, combo)[0].semitones;
}

/** The pitch it ends on, so a phrase can be asked which way it went. */
function closes (cue: Cue, combo = 0): number
{
    const notes = voiceFor(cue, combo);

    return notes[notes.length - 1].semitones;
}

/** How loud the cue is at its loudest, which is what it competes on. */
function loudest (cue: Cue, combo = 0): number
{
    return Math.max(...voiceFor(cue, combo).map((note: Strike) => note.gain));
}

describe('the note an orb is worth', () => {

    it('starts on the base note and climbs from there', () => {

        expect(pitchFor(0)).toBeCloseTo(ORB_BASE_HZ, 4);
        expect(pitchFor(3)).toBeGreaterThan(pitchFor(0));

    });

    it('never falls while it is still climbing', () => {

        for (let combo = 1; combo <= CROWN_FROM; combo++)
        {
            expect(pitchFor(combo), `combo ${combo}`).toBeGreaterThanOrEqual(pitchFor(combo - 1));
        }

    });

    //  What a long streak sounds like, which is the thing worth getting right:
    //  a player who is doing well hears this note more than any other sound in
    //  the game. Holding the ceiling was the honest reading of "it stops
    //  climbing" and it made the reward for playing well the most monotonous
    //  sound in it.
    it('turns around the top rather than repeating one note', () => {

        const played = new Set<number>();

        for (let combo = CROWN_FROM; combo < CROWN_FROM + 12; combo++)
        {
            played.add(semitonesFor(combo));
        }

        expect(played.size, 'notes heard at full streak').toBeGreaterThan(2);

    });

    //  And it stays up there: the figure is a turn around the ceiling, not a
    //  slide back down the scale, which would sound like the streak breaking.
    it('keeps every note of that figure inside the top fifth', () => {

        for (let combo = CROWN_FROM; combo < CROWN_FROM + 40; combo++)
        {
            const above = semitonesFor(combo) - semitonesFor(0);

            expect(above, `combo ${combo}`).toBeGreaterThanOrEqual(ORB_MAX_SEMITONES - 7);
            expect(above, `combo ${combo}`).toBeLessThanOrEqual(ORB_MAX_SEMITONES);
        }

    });

    //  It has to come back to the ceiling often, or the ceiling stops being
    //  where the streak sounds like it is.
    it('lands on the ceiling more than any other note up there', () => {

        const counts = new Map<number, number>();

        for (let combo = CROWN_FROM; combo < CROWN_FROM + 60; combo++)
        {
            const note = semitonesFor(combo);

            counts.set(note, (counts.get(note) ?? 0) + 1);
        }

        const top = semitonesFor(0) + ORB_MAX_SEMITONES;
        const onTop = counts.get(top) ?? 0;

        for (const [ note, count ] of counts)
        {
            if (note !== top)
            {
                expect(onTop, `${note}`).toBeGreaterThanOrEqual(count);
            }
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
            withinFirstOctave.add(semitonesFor(combo));
        }

        expect(withinFirstOctave.size, 'distinct notes before it repeats').toBe(5);

        //  And the sixth is the first one again, an octave up.
        expect(semitonesFor(5) - semitonesFor(0)).toBe(12);

    });

    //  Every note a streak can reach, against every other one: the room holds
    //  each of them into the next few, and a semitone held under a note is the
    //  one interval that would be heard as a mistake rather than as a tune.
    it('can never sound a semitone against itself', () => {

        const reachable = new Set<number>();

        for (let combo = 0; combo < 60; combo++)
        {
            reachable.add(semitonesFor(combo));
        }

        for (const a of reachable)
        {
            for (const b of reachable)
            {
                const apart = Math.abs(a - b) % 12;

                expect(apart === 1 || apart === 11, `${a} against ${b}`).toBe(false);
            }
        }

    });

    it('answers for a nonsense combo rather than throwing', () => {

        expect(Number.isFinite(pitchFor(-4))).toBe(true);
        expect(Number.isFinite(pitchFor(0.5))).toBe(true);

    });

    it('stays inside a range a phone speaker can actually give', () => {

        expect(pitchFor(0)).toBeGreaterThan(80);
        expect(pitchFor(9999)).toBeLessThan(2200);

    });

});

describe('what each moment sounds like', () => {

    it('has a voice for every cue there is', () => {

        for (const cue of CUES)
        {
            const notes = voiceFor(cue);

            expect(notes.length, cue).toBeGreaterThan(0);

            for (const note of notes)
            {
                expect(note.gain, `${cue} volume`).toBeGreaterThan(0);
                expect(note.at, `${cue} timing`).toBeGreaterThanOrEqual(0);
                expect(frequencyOf(note.semitones), `${cue} pitch`).toBeGreaterThan(60);
                expect(frequencyOf(note.semitones), `${cue} pitch`).toBeLessThan(2600);
            }
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
            rainbow: true, life: true, fail: true, finish: true, press: true,
            title: true
        };

        expect([ ...CUES ].sort()).toEqual(Object.keys(named).sort());

    });

    //  Everything in play happens while the player is reading the road, so
    //  each of those cues has to be one event. Not one note - a chord is one
    //  event and sounds fuller than a note does - but everything in it has to
    //  arrive together, or the cue becomes something to listen to.
    it('lands every in-play cue as a single event', () => {

        for (const cue of [ 'orb', 'gate', 'wrong', 'jump', 'land', 'press' ] as Cue[])
        {
            const notes = voiceFor(cue);
            const spread = notes[notes.length - 1].at - notes[0].at;

            expect(spread, cue).toBeLessThanOrEqual(0.05);
        }

    });

    //  The ones that mark the end of something are the exception, and even they
    //  have to be over before the panel that follows them arrives. The title is
    //  the exception to the exception: it is the game's tune, and a tune that
    //  has to be over in a second is a jingle nobody can hum back.
    it('finishes every phrase before what follows it arrives', () => {

        for (const cue of CUES)
        {
            const notes = voiceFor(cue);
            const room = cue === 'title' ? 4 : 1.5;

            expect(notes[notes.length - 1].at, cue).toBeLessThan(room);
        }

    });

    //  A phrase whose notes outlast their own spacing is a chord, not a melody.
    it('spaces a phrase closer than its notes ring', () => {

        for (const cue of CUES)
        {
            const notes = voiceFor(cue);

            for (let i = 1; i < notes.length; i++)
            {
                expect(notes[i].at, `${cue} note ${i}`).toBeGreaterThan(notes[i - 1].at);
                expect(notes[i].at - notes[i - 1].at, `${cue} gap ${i}`)
                    .toBeLessThan(decayOf(notes[i - 1].semitones));
            }
        }

    });

    //  The orb is the sound the player hears constantly. Anything that plays
    //  hundreds of times a run has to sit under the things that play once - but
    //  it carries the tune, so nothing in play may be louder than it either.
    it('puts the constant sound under the rare ones and over the quiet ones', () => {

        expect(loudest('orb')).toBeLessThanOrEqual(loudest('life'));
        expect(loudest('press')).toBeLessThan(loudest('orb'));
        expect(loudest('gate')).toBeLessThan(loudest('orb'));

    });

    //  Down for a mistake, up for a reward. The player should be able to tell
    //  what happened without looking, which is most of what sound is for here.
    it('falls for a mistake and rises for a reward', () => {

        expect(closes('wrong'), 'a wrong colour').toBeLessThan(opens('wrong'));
        expect(closes('fail'), 'a run ending').toBeLessThan(opens('fail'));

        expect(closes('finish'), 'a level finished').toBeGreaterThan(opens('finish'));
        expect(closes('rainbow'), 'a rainbow taken').toBeGreaterThan(opens('rainbow'));

    });

    //  And a mistake is below the tune rather than inside it, so it cannot be
    //  mistaken for a collect however high the streak has climbed.
    it('puts a mistake below every note a streak can reach', () => {

        expect(opens('wrong')).toBeLessThan(semitonesFor(0));
        expect(opens('life')).toBeLessThan(semitonesFor(0));

    });

    //  A jump and its landing are one gesture with two ends, not two events.
    //
    //  Lower and quieter rather than lower and shorter, which is what this
    //  asked for while the sounds were sweeps: on a struck instrument how long
    //  a note rings follows its pitch, so a lower landing necessarily rings
    //  longer than the take-off and cannot be told to do otherwise.
    it('lands lower and quieter than it took off', () => {

        expect(opens('land')).toBeLessThan(opens('jump'));
        expect(loudest('land')).toBeLessThan(loudest('jump'));

    });

    it('follows the combo for the orb and ignores it everywhere else', () => {

        expect(opens('orb', 4)).toBeGreaterThan(opens('orb', 0));

        for (const cue of CUES)
        {
            if (cue === 'orb')
            {
                continue;
            }

            expect(opens(cue, 9), `${cue}`).toBe(opens(cue, 0));
        }

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

    //  Measured from the shipped levels: the calm ones leave half a second
    //  between sounds, and the last few ask for eight a second with gaps of an
    //  eighth. The threshold sits between the two, so an easy level is never
    //  thinned and a hard one always is.
    it('leaves a cue alone when there is room around it', () => {

        expect(thinned(voiceFor('orb', 3), 0.5)).toEqual(voiceFor('orb', 3));
        expect(thinned(voiceFor('orb', 3), CROWD_SECONDS)).toEqual(voiceFor('orb', 3));

    });

    //  The held note under a collect is there to give one of them a body. A
    //  stretch of them does not need one: eight a second are already holding
    //  each other up, and played in full they stop being collects and become a
    //  wash.
    it('drops the body of a cue that lands in a crowd', () => {

        const crowded = thinned(voiceFor('orb', 3), 0.1);

        expect(crowded.length).toBeLessThan(voiceFor('orb', 3).length);
        expect(crowded.every((note) => note.timbre !== 'held')).toBe(true);

    });

    it('ducks what is left rather than only thinning it', () => {

        const crowded = thinned(voiceFor('orb', 3), 0.1);

        expect(crowded[0].gain).toBeLessThan(voiceFor('orb', 3)[0].gain);

    });

    //  A cue made entirely of held notes - a gate is one - must still be heard
    //  when it lands in a crowd, or a doorway would silently go by exactly on
    //  the levels where reading one matters most.
    it('never thins a cue away to nothing', () => {

        for (const cue of CUES)
        {
            expect(thinned(voiceFor(cue), 0.02).length, cue).toBeGreaterThan(0);
        }

    });

    //  Every note keeps its pitch and its place. Thinning is about how much is
    //  playing, and a cue that changed pitch under pressure would be a cue the
    //  player cannot learn.
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

    //  The phrases that mark an ending play once each and are the only sounds
    //  anybody will remember. They should be the same every time.
    it('leaves the written phrases exactly as they are', () => {

        expect(variesOnRepeat('fail')).toBe(false);
        expect(variesOnRepeat('finish')).toBe(false);
        expect(variesOnRepeat('title')).toBe(false);

        expect(variesOnRepeat('orb'), 'the one heard most').toBe(true);
        expect(variesOnRepeat('gate')).toBe(true);

    });

    //  A dozen a level. Anything that frequent has to sit under the things that
    //  mark a moment, or it becomes the sound of the game.
    it('keeps the sound of a doorway among the quietest there is', () => {

        const louder = CUES.filter((cue) => loudest(cue) > loudest('gate'));

        expect(louder, 'only the press is quieter').not.toContain('press');
        expect(loudest('gate')).toBeLessThan(loudest('orb'));

    });

});
