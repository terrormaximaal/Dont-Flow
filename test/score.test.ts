import { describe, expect, it } from 'vitest';
import {
    COMBO_MAX_MULTIPLIER,
    COMBO_STEP,
    SCORE_PENALTY,
    SCORE_PER_ORB,
    SCORE_START,
    SCORE_WARNING,
    WRONG_COLOR_MULTIPLIER
} from '../src/game/config/constants';
import { ScoreSystem } from '../src/game/systems/ScoreSystem';

describe('scoring', () => {

    it('starts with a bank rather than empty', () => {

        const scoring = new ScoreSystem();

        expect(scoring.getScore()).toBe(SCORE_START);
        expect(scoring.getCombo()).toBe(0);
        expect(scoring.getBestCombo()).toBe(0);

    });

    it('pays a fixed amount for a matching colour', () => {

        const scoring = new ScoreSystem();

        expect(scoring.collect()).toBe(SCORE_PER_ORB);
        expect(scoring.getScore()).toBe(SCORE_START + SCORE_PER_ORB);

    });

    it('charges double for a wrong colour', () => {

        const scoring = new ScoreSystem();

        expect(SCORE_PENALTY).toBe(SCORE_PER_ORB * WRONG_COLOR_MULTIPLIER);
        expect(scoring.penalise()).toBe(-SCORE_PENALTY);

    });

    it('means one mistake costs two correct hits', () => {

        const scoring = new ScoreSystem();

        scoring.collect();
        scoring.collect();
        scoring.penalise();

        expect(scoring.getScore()).toBe(SCORE_START);

    });

    it('takes the penalty straight out of the bank', () => {

        const scoring = new ScoreSystem();

        scoring.penalise();

        expect(scoring.getScore()).toBe(SCORE_START - SCORE_PENALTY);

    });

});

describe('a run running out', () => {

    /** Charges `count` mistakes and hands back what the last one cost. */
    function mistakes (scoring: ScoreSystem, count: number): number
    {
        let last = 0;

        for (let i = 0; i < count; i++)
        {
            last = scoring.penalise();
        }

        return last;
    }

    it('is not over while there is anything in the bank', () => {

        const scoring = new ScoreSystem();

        expect(scoring.isOut()).toBe(false);

        mistakes(scoring, (SCORE_START / SCORE_PENALTY) - 1);

        expect(scoring.getScore()).toBeGreaterThan(0);
        expect(scoring.isOut()).toBe(false);

    });

    it('is over the moment the bank empties', () => {

        const scoring = new ScoreSystem();

        mistakes(scoring, SCORE_START / SCORE_PENALTY);

        expect(scoring.getScore()).toBe(0);
        expect(scoring.isOut()).toBe(true);

    });

    //  A tally that runs to -140 is a number nobody reads. Stopping at empty is
    //  what makes the last mistake of a run legible as the last one.
    it('never charges more than is left, and says how much that was', () => {

        const scoring = new ScoreSystem();

        //  One collect off a round number of mistakes, so what is left when the
        //  last one lands is less than a full penalty rather than exactly none.
        scoring.collect();

        mistakes(scoring, SCORE_START / SCORE_PENALTY);

        const remaining = scoring.getScore();

        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThan(SCORE_PENALTY);

        expect(scoring.penalise()).toBe(-remaining);
        expect(scoring.getScore()).toBe(0);

    });

    it('stays over however many more mistakes are charged', () => {

        const scoring = new ScoreSystem();

        mistakes(scoring, 40);

        expect(scoring.getScore()).toBe(0);
        expect(scoring.isOut()).toBe(true);

    });

    it('warns before it ends, with room left to do something about it', () => {

        const scoring = new ScoreSystem();

        expect(scoring.isLow(), 'at the start').toBe(false);

        //  Down to the warning line exactly.
        mistakes(scoring, (SCORE_START - SCORE_WARNING) / SCORE_PENALTY);

        expect(scoring.getScore()).toBe(SCORE_WARNING);
        expect(scoring.isLow(), 'on the line').toBe(true);
        expect(scoring.isOut()).toBe(false);

    });

    it('stops warning once the run is actually over', () => {

        const scoring = new ScoreSystem();

        mistakes(scoring, SCORE_START / SCORE_PENALTY);

        expect(scoring.isOut()).toBe(true);
        expect(scoring.isLow()).toBe(false);

    });

    it('is climbed back out of by playing well', () => {

        const scoring = new ScoreSystem();

        mistakes(scoring, (SCORE_START - SCORE_WARNING) / SCORE_PENALTY);

        expect(scoring.isLow()).toBe(true);

        for (let i = 0; i < 12; i++)
        {
            scoring.collect();
        }

        expect(scoring.isLow(), 'after a clean stretch').toBe(false);

    });

});

describe('the combo multiplier', () => {

    /** Takes `count` orbs in a row and hands back what the last one paid. */
    function streak (scoring: ScoreSystem, count: number): number
    {
        let last = 0;

        for (let i = 0; i < count; i++)
        {
            last = scoring.collect();
        }

        return last;
    }

    it('starts at one, so the first orb pays the base rate', () => {

        const scoring = new ScoreSystem();

        expect(scoring.getMultiplier()).toBe(1);
        expect(scoring.collect()).toBe(SCORE_PER_ORB);

    });

    it('steps up every COMBO_STEP orbs', () => {

        const scoring = new ScoreSystem();

        streak(scoring, COMBO_STEP - 1);
        expect(scoring.getMultiplier()).toBe(1);

        streak(scoring, 1);
        expect(scoring.getMultiplier()).toBe(2);

        streak(scoring, COMBO_STEP);
        expect(scoring.getMultiplier()).toBe(3);

    });

    it('pays the orb that reaches a step at the new rate', () => {

        const scoring = new ScoreSystem();

        //  The one that takes the combo up to the step is itself worth double,
        //  so the reward lands on the hit that earned it.
        expect(streak(scoring, COMBO_STEP)).toBe(SCORE_PER_ORB * 2);

    });

    it('never climbs past the cap', () => {

        const scoring = new ScoreSystem();

        streak(scoring, COMBO_STEP * (COMBO_MAX_MULTIPLIER + 5));

        expect(scoring.getMultiplier()).toBe(COMBO_MAX_MULTIPLIER);
        expect(scoring.collect()).toBe(SCORE_PER_ORB * COMBO_MAX_MULTIPLIER);

    });

    it('falls back to one on a wrong colour', () => {

        const scoring = new ScoreSystem();

        streak(scoring, COMBO_STEP * 3);
        expect(scoring.getMultiplier()).toBeGreaterThan(1);

        scoring.penalise();

        expect(scoring.getMultiplier()).toBe(1);
        expect(scoring.collect()).toBe(SCORE_PER_ORB);

    });

    it('makes a clean run worth far more than a broken one', () => {

        const clean = new ScoreSystem();
        const broken = new ScoreSystem();

        streak(clean, 12);

        //  The same twelve orbs, but dropped every third one. No penalty is
        //  charged here - this is only about the multiplier never getting going.
        for (let i = 0; i < 12; i++)
        {
            streak(broken, 1);

            if ((i + 1) % 3 === 0)
            {
                broken.penalise();
            }
        }

        expect(clean.getScore()).toBeGreaterThan(broken.getScore() * 2);

    });

});

describe('the combo', () => {

    it('builds on consecutive matches', () => {

        const scoring = new ScoreSystem();

        scoring.collect();
        scoring.collect();
        scoring.collect();

        expect(scoring.getCombo()).toBe(3);

    });

    it('resets on a wrong colour', () => {

        const scoring = new ScoreSystem();

        scoring.collect();
        scoring.collect();
        scoring.penalise();

        expect(scoring.getCombo()).toBe(0);

    });

    it('remembers the best streak of the run', () => {

        const scoring = new ScoreSystem();

        scoring.collect();
        scoring.collect();
        scoring.collect();
        scoring.penalise();
        scoring.collect();

        expect(scoring.getCombo()).toBe(1);
        expect(scoring.getBestCombo()).toBe(3);

    });

    it('can be rebuilt after a reset', () => {

        const scoring = new ScoreSystem();

        scoring.penalise();
        scoring.collect();
        scoring.collect();

        expect(scoring.getCombo()).toBe(2);

    });

});
