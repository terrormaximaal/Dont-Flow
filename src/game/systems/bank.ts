import { SCORE_PENALTY } from '../config/constants';

/**
 * The score, read as what it also is: how many more times you may be wrong.
 *
 * The number at the top of the screen is a performance figure, and it is
 * simultaneously the survival condition - the run ends the moment it goes
 * below zero. Those are two different questions asked of one number, and only
 * one of them is answered by reading it. "340" does not say "seventeen more
 * mistakes" to anybody in the middle of a level.
 *
 * So the score is also drawn as segments, and there are exactly as many lit as
 * there are mistakes it can still absorb. That is the whole design: not a
 * percentage, not a bar filling smoothly, a count.
 */

/**
 * How many segments the meter draws.
 *
 * A cap on the display rather than a property of the run: the score has no
 * ceiling, so past a handful of mistakes' worth the exact number stops being
 * the thing a player needs and "plenty" is the honest reading. Small enough to
 * take in without counting.
 */
export const BANK_SEGMENTS = 5;

/**
 * How many mistakes there is still room for.
 *
 * Floored, because zero is alive and one penalty below zero is not: at exactly
 * one penalty's worth there is precisely one mistake left, and at a single
 * point less there is none - that hit would land below zero and end the run.
 * Rounding the other way would promise a mistake that kills.
 */
export function mistakesLeft (score: number): number
{
    if (score < 0)
    {
        return 0;
    }

    return Math.min(BANK_SEGMENTS, Math.floor(score / SCORE_PENALTY));
}

/**
 * How visible the meter should be.
 *
 * Loudest with nothing in hand - which is where every level now starts, so the
 * first thing a player sees is that they have no cushion at all - and gone by
 * the time there is a comfortable buffer. A meter that is always on screen is
 * furniture and the eye stops reading it; one that fades out as a run gets
 * safe is saying something every moment it is visible.
 */
export function bankUrgency (score: number): number
{
    return 1 - (mistakesLeft(score) / BANK_SEGMENTS);
}

/**
 * Whether the next mistake ends the run.
 *
 * The one fact this readout exists to deliver, separated out because the drop,
 * the vignette and the score colour all want to ask it too.
 */
export function onTheEdge (score: number): boolean
{
    return score >= 0 && mistakesLeft(score) === 0;
}
