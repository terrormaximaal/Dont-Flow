import {
    BEHIND_RATE,
    DRAW_DISTANCE,
    DROP_SCREEN_Y,
    FADE_IN_DISTANCE,
    HORIZON_Y,
    PERSPECTIVE_DEPTH
} from '../config/constants';

//  Everything on the course is placed at a distance along the road rather than
//  at a screen position. The drop is pinned to DROP_SCREEN_Y, so an object sits
//  exactly on the drop at the moment `travelled` reaches its distance - which is
//  also the moment it counts as hit.

const SPAN = DROP_SCREEN_Y - HORIZON_Y;

/**
 * Screen y for an object at `distance`, given how far the drop has travelled.
 *
 * Depth is not linear: an object twice as far away is far more than twice as
 * close to the horizon. Falling off as `k / (ahead + k)` is what makes the road
 * read as distance rather than a list scrolling by - far things barely move,
 * near things rush past, and nothing ever crosses the horizon.
 *
 * Behind the player it goes back to a straight line, because there is no depth
 * left to convey and things should simply drop out of view.
 */
export function screenYFor (distance: number, travelled: number): number
{
    const ahead = distance - travelled;

    if (ahead <= 0)
    {
        return DROP_SCREEN_Y - (ahead * BEHIND_RATE);
    }

    return HORIZON_Y + (SPAN * (PERSPECTIVE_DEPTH / (ahead + PERSPECTIVE_DEPTH)));
}

/**
 * How strongly an object at `distance` should be drawn, 0 to 1.
 *
 * Objects appear at the draw distance and fade up over the last stretch of it,
 * so nothing ever pops into existence on the horizon.
 */
export function drawStrength (distance: number, travelled: number): number
{
    const ahead = distance - travelled;

    if (ahead <= DRAW_DISTANCE - FADE_IN_DISTANCE)
    {
        return 1;
    }

    if (ahead >= DRAW_DISTANCE)
    {
        return 0;
    }

    return (DRAW_DISTANCE - ahead) / FADE_IN_DISTANCE;
}
