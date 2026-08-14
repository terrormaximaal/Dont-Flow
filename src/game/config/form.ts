import { BANK_SEGMENTS, mistakesLeft } from '../systems/bank';
import { SURVIVAL_LIVES } from '../systems/lives';

//  How a run is going, and what the road does about it.
//
//  Two things are deliberately *not* here. The road's pace is one: speed is the
//  most-felt variable in the game, and a road that slowed down because the
//  player was struggling would be the most visible possible way of saying "you
//  are having trouble". It stays a function of how far the run has come, always,
//  so what the player feels under them is honest.
//
//  The tier ceiling is the other. Nothing arrives before its time however well
//  a run is going - a player who has never seen a turning bar should not meet
//  one in their first minute for being good at the game. What responds is which
//  of the pieces already unlocked get drawn, and how often a rest comes.
//
//  That leaves dynamic difficulty doing the one thing it is actually good for:
//  stopping a bad patch from becoming a spiral, and stopping a good one from
//  becoming a queue.

/**
 * How a run is going, from -1 in trouble to +1 cruising.
 *
 * Built from the two things that decide whether the next mistake matters: how
 * much score there is to absorb one, and how many chances are left behind it.
 * Score is weighted higher because it is the immediate question - lives are
 * what happens after the score has already gone.
 *
 * Pure, and total: any score and any number of lives has an answer, including
 * the impossible ones.
 */
export function formOf (score: number, lives: number): number
{
    const bank = Math.min(1, mistakesLeft(score) / BANK_SEGMENTS);
    const spare = SURVIVAL_LIVES > 1
        ? Math.min(1, Math.max(0, (lives - 1) / (SURVIVAL_LIVES - 1)))
        : 1;

    return (((bank * BANK_WEIGHT) + (spare * (1 - BANK_WEIGHT))) * 2) - 1;
}

/** How much of the reading is score rather than lives. See formOf. */
export const BANK_WEIGHT = 0.6;

/** A run is in trouble below this, and cruising above the other. */
export const FORM_STRUGGLING = -0.34;
export const FORM_CRUISING = 0.34;

/**
 * How long a run may go without somewhere to recover.
 *
 * The most direct thing that can be done for a run in trouble, and the least
 * visible: a rest is a stretch of open road with orbs on it, and one arriving
 * sooner does not announce itself as help.
 */
export function restEveryFor (form: number): number
{
    if (form <= FORM_STRUGGLING)
    {
        return 3;
    }

    return form >= FORM_CRUISING ? 5 : 4;
}

/**
 * Which end of what is unlocked to draw from.
 *
 * Returns the share of the eligible pieces to choose among, taken from the
 * easy end when a run is struggling and the hard end when it is cruising. Never
 * the whole range at either extreme and never less than half of it: a run in
 * trouble should meet gentler road, not a different game, and one going well
 * should still get the occasional easy piece rather than an unbroken wall.
 */
export function drawWindow (form: number): { from: number; to: number }
{
    if (form <= FORM_STRUGGLING)
    {
        return { from: 0, to: 0.6 };
    }

    if (form >= FORM_CRUISING)
    {
        return { from: 0.4, to: 1 };
    }

    return { from: 0, to: 1 };
}
