import { describe, expect, it } from 'vitest';
import { SCORE_PENALTY, SCORE_PER_ORB, WRONG_COLOR_MULTIPLIER } from '../src/game/config/constants';
import { ScoreSystem } from '../src/game/systems/ScoreSystem';

describe('scoring', () => {

    it('starts empty', () => {

        const scoring = new ScoreSystem();

        expect(scoring.getScore()).toBe(0);
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

    it('lets the score go negative rather than hiding the penalty', () => {

        const scoring = new ScoreSystem();

        scoring.penalise();

        expect(scoring.getScore()).toBe(-SCORE_PENALTY);

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
