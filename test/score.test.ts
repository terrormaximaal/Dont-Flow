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

    it('starts at nothing', () => {

        const scoring = new ScoreSystem();

        expect(scoring.getScore()).toBe(SCORE_START);
        expect(SCORE_START).toBe(0);
        expect(scoring.getCombo()).toBe(0);
        expect(scoring.getBestCombo()).toBe(0);

    });

    it('pays a fixed amount for a matching colour', () => {

        const scoring = new ScoreSystem();

        expect(scoring.collect()).toBe(SCORE_PER_ORB);
        expect(scoring.getScore()).toBe(SCORE_PER_ORB);

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

        expect(scoring.getScore()).toBe(0);

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

    //  The rule, stated once. Zero is alive; a point below it is not.
    it('is alive at exactly nothing', () => {

        const scoring = new ScoreSystem();

        expect(scoring.getScore()).toBe(0);
        expect(scoring.isOut()).toBe(false);

    });

    it('is over the moment the score goes below nothing', () => {

        const scoring = new ScoreSystem();

        scoring.collect();
        scoring.penalise();

        expect(scoring.getScore()).toBeLessThan(0);
        expect(scoring.isOut()).toBe(true);

    });

    //  The example from the brief, kept as a test because it is the clearest
    //  statement of the rule there is: ten in hand, a twenty-point mistake,
    //  and the run is over at minus ten.
    it('ends a run holding ten that takes a twenty-point mistake', () => {

        const scoring = new ScoreSystem();

        scoring.collect();

        expect(scoring.getScore()).toBe(SCORE_PER_ORB);

        scoring.penalise();

        expect(scoring.getScore()).toBe(SCORE_PER_ORB - SCORE_PENALTY);
        expect(scoring.isOut()).toBe(true);

    });

    //  The version before this one charged only as far as there was anything
    //  left, so the score stopped dead at zero. Under the rule above that would
    //  have meant no run could ever end, which is the single most important
    //  thing about this method.
    it('charges the full penalty even when it takes the score under', () => {

        const scoring = new ScoreSystem();

        expect(scoring.penalise()).toBe(-SCORE_PENALTY);
        expect(scoring.getScore()).toBe(-SCORE_PENALTY);

    });

    it('keeps charging past the end rather than settling anywhere', () => {

        const scoring = new ScoreSystem();

        mistakes(scoring, 5);

        expect(scoring.getScore()).toBe(-SCORE_PENALTY * 5);
        expect(scoring.isOut()).toBe(true);

    });

    //  Starting at nothing means starting one mistake from the end, so the
    //  warning is on from the first frame of every level.
    it('warns from the very start, because the first mistake is fatal', () => {

        const scoring = new ScoreSystem();

        expect(scoring.isLow()).toBe(true);
        expect(scoring.isOut()).toBe(false);

    });

    it('stops warning once enough is banked to survive a mistake', () => {

        const scoring = new ScoreSystem();

        while (scoring.getScore() <= SCORE_WARNING)
        {
            scoring.collect();
        }

        expect(scoring.isLow()).toBe(false);

    });

    it('stops warning once the run is actually over', () => {

        const scoring = new ScoreSystem();

        scoring.penalise();

        expect(scoring.isOut()).toBe(true);
        expect(scoring.isLow()).toBe(false);

    });

    it('is climbed back out of by playing well', () => {

        const scoring = new ScoreSystem();

        expect(scoring.isLow(), 'at the start').toBe(true);

        for (let i = 0; i < 12; i++)
        {
            scoring.collect();
        }

        expect(scoring.isLow(), 'after a clean stretch').toBe(false);
        expect(scoring.isOut()).toBe(false);

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
