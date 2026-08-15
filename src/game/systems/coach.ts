import { Level, ObstacleSpec } from '../config/level';

//  Teaching the two things the game never says.
//
//  There is no tutorial anywhere in this game, and for one of its two inputs
//  that is fatal rather than untidy. Swiping sideways is discoverable: the road
//  has lanes, the drop is in one of them, and a player will try. Swiping *up* is
//  not discoverable at all - nothing on screen suggests the drop can leave the
//  ground, and the first six levels teach, by never needing anything else, that
//  sideways is the only thing an input does.
//
//  Then thirty-nine per cent of the way into level seven comes a row blocked all
//  the way across by things that can only be cleared from above, and eleven more
//  behind it. A player who has not guessed is not stuck for a moment, they are
//  stuck for good, and what they have learned is that the game is broken.
//
//  So the game says it, once, in the one place saying it means anything: on the
//  road, with the thing it is about to be needed for already in sight.

export type Lesson =
    /** Swipe across to change lane. Shown on the first run a player ever makes. */
    | 'move'
    /** Swipe up to jump. Shown before the first row that cannot be passed any other way. */
    | 'jump';

/**
 * How much road a prompt gets before the thing it is about.
 *
 * Enough to read it and act, and not so much that it is forgotten by the time
 * it matters. At the pace level seven runs this is a shade over two seconds.
 */
export const COACH_LEAD = 1150;

/**
 * How much road a prompt stays up for once it has appeared.
 *
 * Longer than the lead, so it is still there as the row arrives - a prompt that
 * vanishes just before the moment it was warning about has taught nothing.
 */
export const COACH_HOLD = 1750;

/**
 * The first row on a course that can only be passed by jumping.
 *
 * A row is one of those when every lane is blocked and nothing blocking it is a
 * wall: a wall would mean the row is a colour question, and colour questions
 * have an answer that does not involve leaving the ground.
 *
 * Null where the course never asks - which is every level before the seventh.
 */
export function firstForcedJump (level: Level, lanes: number): number | null
{
    const rows = new Map<number, ObstacleSpec[]>();

    for (const obstacle of level.obstacles)
    {
        rows.set(obstacle.distance, [ ...(rows.get(obstacle.distance) ?? []), obstacle ]);
    }

    let earliest: number | null = null;

    for (const [ distance, obstacles ] of rows)
    {
        const blocked = new Set(obstacles.map((o) => o.lane)).size >= lanes;
        const jumpable = obstacles.every((o) => o.profile !== 'full');

        if (blocked && jumpable && (earliest === null || distance < earliest))
        {
            earliest = distance;
        }
    }

    return earliest;
}

/**
 * Whether a prompt about something at `target` should be on screen now.
 *
 * Pure and total, so it can be asked every frame without keeping any state of
 * its own - the scene only has to remember whether the lesson has been given,
 * not where in it the run is.
 */
export function isPrompting (travelled: number, target: number): boolean
{
    return travelled >= target - COACH_LEAD && travelled < (target - COACH_LEAD) + COACH_HOLD;
}

/** What each lesson says. Short: it is read at speed, out of the corner of an eye. */
export function wordsFor (lesson: Lesson): string
{
    return lesson === 'move' ? 'SWIPE TO MOVE' : 'SWIPE UP TO JUMP';
}
