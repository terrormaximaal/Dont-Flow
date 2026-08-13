import { describe, expect, it } from 'vitest';
import { SCORE_PENALTY, SCORE_START, SCORE_WARNING } from '../src/game/config/constants';
import { BANK_SEGMENTS, bankFraction, bankUrgency, mistakesLeft } from '../src/game/systems/bank';
import { ScoreSystem } from '../src/game/systems/ScoreSystem';

describe('how many mistakes are left', () => {

    //  The whole reason the meter is segments rather than a bar. A player
    //  reading it should learn "three more", which changes how they play the
    //  next stretch of road, rather than "about half", which does not.
    it('is exactly the number of penalties the bank can still absorb', () => {

        for (let charged = 0; charged <= BANK_SEGMENTS; charged++)
        {
            const scoring = new ScoreSystem();

            for (let i = 0; i < charged; i++)
            {
                scoring.penalise();
            }

            expect(mistakesLeft(scoring.getScore()), `after ${charged} mistakes`)
                .toBe(BANK_SEGMENTS - charged);
        }

    });

    it('starts at one segment per mistake a full bank holds', () => {

        expect(mistakesLeft(SCORE_START)).toBe(BANK_SEGMENTS);
        expect(BANK_SEGMENTS).toBe(SCORE_START / SCORE_PENALTY);

    });

    //  A bank holding less than a full penalty still absorbs one more hit; it
    //  just does not survive the one after. Rounding down would show nothing
    //  left while there was still a run to play.
    it('counts a part-full segment as a mistake there is still room for', () => {

        expect(mistakesLeft(1)).toBe(1);
        expect(mistakesLeft(SCORE_PENALTY - 1)).toBe(1);
        expect(mistakesLeft(SCORE_PENALTY)).toBe(1);
        expect(mistakesLeft(SCORE_PENALTY + 1)).toBe(2);

    });

    it('is none at all once the run is over', () => {

        expect(mistakesLeft(0)).toBe(0);
        expect(mistakesLeft(-40)).toBe(0);

    });

    //  A run well past its starting figure is not more than safe, and a meter
    //  that kept growing would be reporting the score - which the number above
    //  it already does.
    it('never shows more segments than there are, however high the score', () => {

        expect(mistakesLeft(SCORE_START * 40)).toBe(BANK_SEGMENTS);

    });

});

describe('how full the bank looks', () => {

    it('is full at the starting figure and empty at nothing', () => {

        expect(bankFraction(SCORE_START)).toBe(1);
        expect(bankFraction(0)).toBe(0);

    });

    it('has an answer for any score at all', () => {

        for (let score = -500; score < 5000; score += 37)
        {
            const fraction = bankFraction(score);

            expect(fraction, `at ${score}`).toBeGreaterThanOrEqual(0);
            expect(fraction, `at ${score}`).toBeLessThanOrEqual(1);
        }

    });

});

describe('when the meter shows itself', () => {

    //  A meter that is always on screen is furniture, and the eye stops reading
    //  furniture. This one appears, and its appearing is the warning.
    it('is invisible while the bank is at or above what it started with', () => {

        expect(bankUrgency(SCORE_START)).toBe(0);
        expect(bankUrgency(SCORE_START * 3)).toBe(0);

    });

    it('appears as soon as the bank drops below full', () => {

        expect(bankUrgency(SCORE_START - SCORE_PENALTY)).toBeGreaterThan(0);

    });

    it('is fully present well before the score turns red', () => {

        //  The colour warning arrives two mistakes from the end. This one is
        //  at its loudest long before that, which is the point of having both.
        expect(bankUrgency(SCORE_WARNING)).toBe(1);
        expect(bankUrgency(SCORE_START / 2)).toBe(1);

    });

    it('only ever gets more urgent as the bank empties', () => {

        let previous = 0;

        for (let score = SCORE_START; score >= 0; score -= 5)
        {
            const urgency = bankUrgency(score);

            expect(urgency, `at ${score}`).toBeGreaterThanOrEqual(previous);

            previous = urgency;
        }

    });

});

describe('the meter against the run it reports on', () => {

    //  The two readouts have to agree at the one moment it matters: the meter
    //  must not still be showing a segment on a run that is over, and must not
    //  show none on a run that is still going.
    it('shows nothing left exactly when the run is out', () => {

        const scoring = new ScoreSystem();

        for (let i = 0; i < BANK_SEGMENTS + 4; i++)
        {
            expect(mistakesLeft(scoring.getScore()) === 0, `after ${i} mistakes`)
                .toBe(scoring.isOut());

            scoring.penalise();
        }

    });

});
