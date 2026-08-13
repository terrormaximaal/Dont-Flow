import { SCORE_PENALTY, SCORE_START } from '../config/constants';

/**
 * The score, read as what it actually is: how much run there is left.
 *
 * The number at the top of the screen says 120 at the start and 30 when the
 * next mistake but one ends the run, and nothing about those two numbers says
 * they are different kinds of thing. A player who has not counted has no idea
 * how close they are until the colour changes, which is two mistakes from the
 * end and too late to change how they are playing.
 *
 * So the bank is also drawn as segments, and there are exactly as many of them
 * as there are mistakes it can absorb. That is the whole design: the readout
 * is not a percentage or a bar filling smoothly, it is a count of how many more
 * times you may be wrong.
 */

/** How many mistakes a full bank absorbs, and so how many segments it has. */
export const BANK_SEGMENTS = Math.round(SCORE_START / SCORE_PENALTY);

/**
 * How many mistakes there is still room for.
 *
 * Rounded up, because a bank holding less than a full penalty still absorbs one
 * more hit before it is empty - it just does not survive the one after. At
 * twenty points left that is one segment, and it is honest: there is one more
 * mistake in it.
 */
export function mistakesLeft (score: number): number
{
    if (score <= 0)
    {
        return 0;
    }

    return Math.min(BANK_SEGMENTS, Math.ceil(score / SCORE_PENALTY));
}

/**
 * How full the bank is, 0 to 1.
 *
 * Capped at 1: a run well past the starting figure is not more than safe, and a
 * meter that kept growing would be reporting the score, which the number above
 * it already does.
 */
export function bankFraction (score: number): number
{
    return Math.min(1, Math.max(0, score / SCORE_START));
}

/**
 * How visible the meter should be.
 *
 * Nothing at all while the bank is at or above what it started with, and fully
 * present by the time it is half gone. A meter that is always on screen is
 * furniture the eye stops reading; one that appears is itself the warning, and
 * arrives long before the score turns red.
 */
export function bankUrgency (score: number): number
{
    const fraction = bankFraction(score);

    if (fraction >= 1)
    {
        return 0;
    }

    return Math.min(1, (1 - fraction) * 2);
}
