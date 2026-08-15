import { describe, expect, it } from 'vitest';
import { SCORE_PENALTY, SCORE_PER_ORB, SCORE_START } from '../src/game/config/constants';
import { BANK_SEGMENTS, bankUrgency, mistakesLeft, onTheEdge } from '../src/game/systems/bank';
import { ScoreSystem } from '../src/game/systems/ScoreSystem';

describe('how many mistakes are left', () => {

    //  The whole reason the meter is segments rather than a bar. A player
    //  reading it should learn "three more", which changes how they take the
    //  next stretch of road, rather than "about half", which does not.
    it('is none at all at the start of a level', () => {

        expect(mistakesLeft(SCORE_START)).toBe(0);

    });

    //  Zero is alive and one penalty below zero is not, so at exactly one
    //  penalty's worth there is precisely one mistake left. Rounding the other
    //  way would promise a mistake that kills.
    it('counts only the mistakes that leave the run alive', () => {

        expect(mistakesLeft(0), 'nothing banked').toBe(0);
        expect(mistakesLeft(SCORE_PENALTY - 1), 'a point short').toBe(0);
        expect(mistakesLeft(SCORE_PENALTY), 'exactly one penalty').toBe(1);
        expect(mistakesLeft(SCORE_PENALTY * 2), 'exactly two').toBe(2);

    });

    it('never promises a mistake the run would not survive', () => {

        for (let score = 0; score < SCORE_PENALTY * 12; score += 3)
        {
            const left = mistakesLeft(score);
            const after = score - (left * SCORE_PENALTY);

            expect(after, `at ${score}, after ${left} mistakes`).toBeGreaterThanOrEqual(0);
        }

    });

    it('is none once the run is already over', () => {

        expect(mistakesLeft(-1)).toBe(0);
        expect(mistakesLeft(-500)).toBe(0);

    });

    //  The score has no ceiling, so past a handful the exact number stops being
    //  what a player needs and "plenty" is the honest reading.
    it('stops counting past what the meter can show', () => {

        expect(mistakesLeft(SCORE_PENALTY * 400)).toBe(BANK_SEGMENTS);

    });

});

describe('when the meter shows itself', () => {

    //  Every level now starts with no cushion at all, so the first thing a
    //  player sees is the meter at full strength saying exactly that.
    it('is at its loudest with nothing in hand', () => {

        expect(bankUrgency(SCORE_START)).toBe(1);
        expect(bankUrgency(0)).toBe(1);

    });

    it('is gone once there is a comfortable buffer', () => {

        expect(bankUrgency(SCORE_PENALTY * BANK_SEGMENTS)).toBe(0);
        expect(bankUrgency(SCORE_PENALTY * 40)).toBe(0);

    });

    it('only ever eases as the run gets safer', () => {

        let previous = 1;

        for (let score = 0; score < SCORE_PENALTY * (BANK_SEGMENTS + 2); score += 4)
        {
            const urgency = bankUrgency(score);

            expect(urgency, `at ${score}`).toBeLessThanOrEqual(previous);

            previous = urgency;
        }

    });

});

describe('being one mistake from the end', () => {

    it('is where every level begins', () => {

        expect(onTheEdge(SCORE_START)).toBe(true);

    });

    it('stops being true as soon as a penalty is affordable', () => {

        expect(onTheEdge(SCORE_PENALTY - 1)).toBe(true);
        expect(onTheEdge(SCORE_PENALTY)).toBe(false);

    });

    //  A run already over is not on the edge of anything.
    it('is false once the run has ended', () => {

        expect(onTheEdge(-1)).toBe(false);

    });

    it('agrees with the run it reports on, at every score', () => {

        for (let score = -60; score < 200; score++)
        {
            const scoring = new ScoreSystem();

            //  A hand-set score, so every value either side of the boundaries
            //  is exercised rather than only the ones a run can land on.
            (scoring as unknown as { score: number }).score = score;

            //  On the edge means exactly this: the next mistake is fatal.
            const next = new ScoreSystem();

            (next as unknown as { score: number }).score = score;
            next.penalise();

            if (!scoring.isOut())
            {
                expect(onTheEdge(score), `at ${score}`).toBe(next.isOut());
            }
        }

    });

});

describe('the meter against a real run', () => {

    it('counts down one segment per mistake, from a banked run', () => {

        const scoring = new ScoreSystem();

        //  Banked to exactly three mistakes' worth at the base rate.
        for (let i = 0; i < (SCORE_PENALTY * 3) / SCORE_PER_ORB; i++)
        {
            (scoring as unknown as { score: number }).score += SCORE_PER_ORB;
        }

        for (let expected = 3; expected >= 0; expected--)
        {
            expect(mistakesLeft(scoring.getScore()), `${expected} left`).toBe(expected);

            scoring.penalise();
        }

        expect(scoring.isOut(), 'one mistake past empty').toBe(true);

    });

});
