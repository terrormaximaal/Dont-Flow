import { SCORE_PENALTY } from '../config/constants';

//  What happens when an endless run goes under.
//
//  The twenty levels end at the first moment the score drops below zero, and
//  that is right for them: a level is a thing you learn and then do cleanly.
//  An endless run is not - it is one long slide towards a mistake you were
//  always going to make, and ending it on the first one would make the mode a
//  worse version of the levels rather than a different thing.
//
//  So a run has lives. Pure, because "how many chances are left" is a rule and
//  rules that live inside a scene are rules nobody checks.

/** Chances an endless run gets. */
export const SURVIVAL_LIVES = 3;

/**
 * The score a rescued run resumes on.
 *
 * One mistake's worth. Enough to be alive and not enough to be comfortable,
 * which is what a last chance should feel like - and since zero is still alive,
 * it leaves exactly two more slips before the next life goes.
 */
export const SURVIVAL_REVIVE = SCORE_PENALTY;

/**
 * How much road a rescued run is safe on, in track pixels.
 *
 * Without it a life can be spent in the same moment it is granted: the drop is
 * put back at twenty points in the middle of whatever it just died to, and the
 * next row takes it under again before the player has looked up. About a
 * second at the pace an endless run reaches, which is long enough to read the
 * road and short enough that it cannot be leaned on.
 */
export const SURVIVAL_GRACE = 620;

export interface Rescue
{
    /** Chances left after this one is spent. */
    lives: number;

    /** The score to resume on, or null when the run is over. */
    score: number | null;
}

/**
 * Spend a life.
 *
 * Total: called with none left it says so rather than going negative, because
 * a run ending twice is a bug that shows up as a panel drawn over a panel.
 */
export function loseLife (lives: number): Rescue
{
    if (lives <= 1)
    {
        return { lives: 0, score: null };
    }

    return { lives: lives - 1, score: SURVIVAL_REVIVE };
}

/**
 * Whether a run is still inside the safe stretch a rescue bought it.
 *
 * A distance rather than a timer, like everything else that has to survive a
 * paused run and mean the same thing at every pace.
 *
 * @param since Distance at which the last life was spent, or null if none has.
 */
export function isSheltered (travelled: number, since: number | null): boolean
{
    return since !== null && travelled - since < SURVIVAL_GRACE;
}
