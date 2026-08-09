import { SCORE_PENALTY, SCORE_PER_ORB } from '../config/constants';

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
     * A matching colour: fixed points, combo up.
     *
     * @returns the points awarded, for the readout that floats off the hit.
     */
    collect (): number
    {
        this.score += SCORE_PER_ORB;
        this.combo += 1;
        this.bestCombo = Math.max(this.bestCombo, this.combo);

        return SCORE_PER_ORB;
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
