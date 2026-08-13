import {
    COMBO_MAX_MULTIPLIER,
    COMBO_STEP,
    SCORE_PENALTY,
    SCORE_PER_ORB,
    SCORE_START,
    SCORE_WARNING
} from '../config/constants';

/**
 * Score and combo bookkeeping. Deliberately has no idea what an orb is - it is
 * told that something was collected or missed, and nothing else.
 *
 * The score is a bank rather than a tally: the run starts with something in it
 * and ends when it is empty. Everything below follows from that one decision.
 */
export class ScoreSystem
{
    private score = SCORE_START;
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
     * Charged only as far as there is anything left to charge, so the bank
     * stops at empty rather than running on into numbers that mean nothing. The
     * amount returned is the amount actually taken, which makes the last
     * mistake of a run visibly the one that finished it - a floating "-8"
     * against a full "-20" says "that was the rest of it" without a word.
     *
     * @returns the points lost, as a negative number.
     */
    penalise (): number
    {
        const taken = Math.min(SCORE_PENALTY, this.score);

        this.score -= taken;
        this.combo = 0;

        return -taken;
    }

    getScore (): number
    {
        return this.score;
    }

    /**
     * Whether the run is over.
     *
     * The whole point of the bank. Asked after every change rather than watched
     * for, so the run ends on the hit that emptied it and not a frame later.
     */
    isOut (): boolean
    {
        return this.score <= 0;
    }

    /**
     * Whether the run is close enough to the end to be told about it.
     *
     * False once it is actually over: at that point the run has its own, much
     * louder answer, and a warning still showing underneath it would be reading
     * the state of a run that no longer exists.
     */
    isLow (): boolean
    {
        return this.score > 0 && this.score <= SCORE_WARNING;
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
