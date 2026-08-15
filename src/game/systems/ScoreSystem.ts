import {
    COMBO_MAX_MULTIPLIER,
    COMBO_STEP,
    SCORE_DEATH_BELOW,
    SCORE_PENALTY,
    SCORE_PER_ORB,
    SCORE_START,
    SCORE_WARNING
} from '../config/constants';

/**
 * Score and combo bookkeeping. Deliberately has no idea what an orb is - it is
 * told that something was collected or missed, and nothing else.
 *
 * The score is two things at once: what the run was worth, and whether it is
 * still going. It starts at nothing, everything correct adds to it, everything
 * wrong takes from it, and the run ends the moment it falls below zero.
 *
 * Zero itself is alive. That is the whole rule, and everything below follows
 * from it.
 */
export class ScoreSystem
{
    private score = SCORE_START;
    private combo = 0;
    private bestCombo = 0;

    /**
     * The highest the score ever reached.
     *
     * What an endless run is worth. The score at the end is not: a run ends
     * *because* it went below zero, so recording that would file every run in
     * the game as negative, and the better the run the more invisible it would
     * be. The peak is the thing the player actually achieved.
     */
    private peak = SCORE_START;

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
        this.peak = Math.max(this.peak, this.score);

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
     * Charged in full, every time, and allowed to take the score below zero -
     * which is the only way the run can end. An earlier version charged only as
     * far as there was anything left, so the score stopped at zero and a player
     * could sit on empty forever; under this rule that would have meant nobody
     * could ever fail.
     *
     * @returns the points lost, always the full penalty, as a negative number.
     */
    penalise (): number
    {
        this.score -= SCORE_PENALTY;
        this.combo = 0;

        return -SCORE_PENALTY;
    }

    /**
     * Score bled away by being somewhere expensive.
     *
     * Not a mistake, so it leaves the combo alone: a player crossing a drain
     * zone cleanly is still collecting cleanly, and taking their run away from
     * them for walking a road the level put in front of them would be reading
     * the wrong thing as an error. It can still kill - score below zero is
     * still out, and that is the whole threat of a long zone.
     */
    drain (points: number): void
    {
        this.score -= points;
    }

    /**
     * Put the score back to a given figure.
     *
     * Only an endless run uses this, when a life is spent: the run carries on
     * from a fixed footing rather than from wherever it fell to. The combo goes
     * with it - a run that has just been rescued is not on a streak.
     */
    setScore (score: number): void
    {
        this.score = score;
        this.combo = 0;
    }

    getScore (): number
    {
        return this.score;
    }

    /**
     * Whether the run is over.
     *
     * Strictly below zero. Zero is alive - a player who has spent exactly what
     * they earned is on the edge, not over it. Asked after every change rather
     * than watched for, so the run ends on the hit that took it under and not a
     * frame later.
     */
    isOut (): boolean
    {
        return this.score < SCORE_DEATH_BELOW;
    }

    /**
     * Whether the run is close enough to the end to be told about it.
     *
     * True at zero, which is the most dangerous a live run can be. False once
     * it is actually over: at that point the run has its own, much louder
     * answer, and a warning still showing underneath it would be describing a
     * run that no longer exists.
     */
    isLow (): boolean
    {
        return !this.isOut() && this.score <= SCORE_WARNING;
    }

    getCombo (): number
    {
        return this.combo;
    }

    /** The highest the score reached. See `peak`. */
    getPeak (): number
    {
        return this.peak;
    }

    getBestCombo (): number
    {
        return this.bestCombo;
    }
}
