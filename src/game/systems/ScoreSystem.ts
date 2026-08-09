import { SCORE_PER_ORB } from '../config/constants';

/**
 * Score and combo bookkeeping. Deliberately has no idea what an orb is - it is
 * told that something was collected or missed, and nothing else.
 */
export class ScoreSystem
{
    private score = 0;
    private combo = 0;
    private bestCombo = 0;

    /** A matching orb: fixed points, combo up. */
    collect (): void
    {
        this.score += SCORE_PER_ORB;
        this.combo += 1;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
    }

    /** A wrong-coloured orb: the streak is over. */
    breakCombo (): void
    {
        this.combo = 0;
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
