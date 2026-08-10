import { COMBO_MAX_MULTIPLIER, COMBO_STEP, SCORE_PENALTY, SCORE_PER_ORB } from '../config/constants';

/**
 * Score and combo bookkeeping. Deliberately has no idea what an orb is - it is
 * told that something was collected or missed, and nothing else.
 */
export class ScoreSystem
{
    private score = 0;
    private combo = 0;
    private bestCombo = 0;

    /**
     * A matching colour: combo up, then paid at whatever that combo is now
     * worth. Counted first on purpose, so the orb that reaches a new step is
     * itself paid at the new rate - the reward lands on the hit that earned it.
     *
     * @returns the points awarded, for the readout that floats off the hit.
     */
    collect (): number
    {
        this.combo += 1;
        this.bestCombo = Math.max(this.bestCombo, this.combo);

        const gained = SCORE_PER_ORB * this.getMultiplier();

        this.score += gained;

        return gained;
    }

    /**
     * What an orb is worth right now, as a multiple of the base rate.
     *
     * Steps rather than climbing smoothly: a player can see a step happen and
     * play around it, where a number creeping up by fractions is just noise.
     */
    getMultiplier (): number
    {
        return Math.min(COMBO_MAX_MULTIPLIER, 1 + Math.floor(this.combo / COMBO_STEP));
    }

    /**
     * A wrong colour: costs double a correct one, and ends the streak.
     *
     * @returns the points lost, as a negative number.
     */
    penalise (): number
    {
        this.score -= SCORE_PENALTY;
        this.combo = 0;

        return -SCORE_PENALTY;
    }

    getScore (): number
    {
        return this.score;
    }

    getCombo (): number
    {
        return this.combo;
    }

    getBestCombo (): number
    {
        return this.bestCombo;
    }
}
