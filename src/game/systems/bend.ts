import {
    DROP_SCREEN_Y,
    HORIZON_Y,
    PERSPECTIVE_DEPTH,
    RIVER_PERIODS,
    RIVER_READABLE,
    RIVER_SWAY
} from '../config/constants';

//  The river winding, as a picture and only as a picture.
//
//  Nothing here is ever consulted by a rule. The course is authored on a
//  straight road - a lane gives an x, a distance gives a depth, and a hit is
//  `travelled >= distance` - and this bends what is drawn without moving any of
//  that. The alternative, a course laid out along a real curve, would put the
//  bend into collision, into the level data, and into every guarantee the game
//  makes about fairness, to buy a picture it can have for nothing.
//
//  The one property that makes it safe is that the swing is exactly zero at the
//  player's own position, so however far the river leans in the distance, it is
//  telling the truth by the time anything reaches the drop.

/** One turn of a wave, so periods can be written as distances. */
const TURN = Math.PI * 2;

/**
 * Where the river's middle lies, in track pixels either side of straight ahead.
 *
 * A sum of slow waves whose lengths do not divide into one another, which is
 * what keeps it from settling into a rhythm - three periods this far apart will
 * not come back round together inside any run. Zero mean, so the river wanders
 * about straight ahead rather than gradually leaving.
 *
 * This is a position rather than a direction, and that is the whole design. An
 * earlier version described the river by its *heading* and turned the camera to
 * follow it, which meant the far end of the road swung sideways by however much
 * the river happened to be turning under the player. The road leaned one way
 * and then the other while the sun and the mountains stayed nailed to the sky,
 * and it was reported, accurately, as making you dizzy.
 */
export function middleAt (distance: number, phases: number[], depth = 1): number
{
    let middle = 0;

    for (let i = 0; i < RIVER_PERIODS.length; i++)
    {
        middle += RIVER_SWAY[i] * resolved(i, depth) * Math.cos(((TURN / RIVER_PERIODS[i]) * distance) + phases[i]);
    }

    return middle;
}

/** How much of the screen the drop's line is above the horizon. */
const SPAN = DROP_SCREEN_Y - HORIZON_Y;

/**
 * How much of one wave survives at a given depth, 0 to 1.
 *
 * Perspective crushes the rest of the river into the last pixels above the
 * horizon, so a wave with a fixed length in the water eventually turns over
 * faster than the screen has pixels to draw it in. Measured on the finished
 * curve, the top twenty-five pixels moved almost seven pixels sideways for every
 * pixel down - drawing that honestly gives a shimmering fringe, and no amount of
 * cutting the road into finer strips finds anything smooth there, because there
 * is nothing smooth to find.
 *
 * So each wave is faded out over the stretch where its own crests come closer
 * together on screen than the road is cut into pieces. Per wave rather than over
 * the whole meander, and that distinction is the point: a long wave stays
 * drawable much further off than a short one, which is what an eye sees anyway.
 *
 * The cost is that up there the picture is no longer quite a projection: a wave
 * being faded is drawn a little smaller than it is, so it grows slightly as it
 * comes as well as sliding. That is the same trade the first version made and
 * got wrong - it faded the *whole* meander by the square of the depth over the
 * *entire* road, so the bend a player was looking straight at swelled as it
 * arrived. Fading each wave only past its own limit, and using waves long enough
 * that the limit is far off, the whole effect measures two pixels across an
 * entire approach.
 */
function resolved (wave: number, depth: number): number
{
    //  How far apart this wave's crests land on screen, in pixels. The screen
    //  moves as the square of the depth against distance down the river, which
    //  is the whole of why the far field aliases and the near field cannot.
    const apart = (RIVER_PERIODS[wave] * SPAN * depth * depth) / PERSPECTIVE_DEPTH;

    if (apart >= RIVER_READABLE) { return 1; }
    if (apart <= 0) { return 0; }

    //  Eased in rather than switched on, or the fade is itself an edge.
    const part = apart / RIVER_READABLE;

    return part * part * (3 - (2 * part));
}

/** What the view needs to know, worked out once a frame rather than per point. */
export interface River
{
    /** Where the player is along it, which is where the view is taken from. */
    travelled: number;

    phases: number[];

    /** Where the river's middle is under the player - the origin of the view. */
    here: number;
}

/**
 * The river as seen from one point along it.
 *
 * Where the middle lies under the player depends only on the player, so it is
 * worked out once a frame. What is left per point is three cosines, and this is
 * asked for every object and every strip of road on screen.
 */
export function riverAt (travelled: number, phases: number[]): River
{
    return { travelled, phases, here: middleAt(travelled, phases) };
}

/**
 * How far ahead a point on screen is, from how far down the screen it is.
 *
 * The inverse of what puts it there. Depth is not carried through the drawing
 * code - a caller hands over a screen y and a lane, and by then the distance
 * that produced the y is gone - so the projection reads it back out.
 */
export function aheadOf (depth: number): number
{
    return depth <= 0 ? Infinity : PERSPECTIVE_DEPTH * ((1 / depth) - 1);
}

/**
 * How far the river has swung sideways by this depth, in screen pixels.
 *
 * A plain projection, and it is worth saying what it is *not*, because the first
 * version was something else and it made people dizzy.
 *
 * That one turned the camera to follow the river's heading at the player, which
 * meant subtracting `ahead` times that heading - a term that grows without
 * bound, so the far end of the road and the vanishing point with it swung a good
 * fifty pixels from side to side as the player travelled. The sun, the mountains
 * and the stars did not move while it happened. The road said the world was
 * turning and the horizon said it was not, and an eye believes the horizon.
 *
 * It also damped the meander by the square of the depth to stop the far field
 * shivering, and that was wrong in a quieter way: the same stretch of river was
 * drawn with more bend in it the nearer it got, so a bend grew as it arrived
 * instead of flowing towards you. Between the two, what got drawn at a point on
 * the river depended on where the player was standing - so it was not the
 * picture of any river at all, which is exactly how it read.
 *
 * What is left is the whole of it: where the river's middle is at the point
 * being drawn, less where it is under the player. That is a distance between two
 * real places and owes nothing to the view, and multiplying it by the depth is
 * what the projection already does to every other lateral distance in the game.
 *
 * So a point on the river traces the path a fixed point should - the bend flows
 * towards you and swells as it arrives, the way the road and the trees and the
 * orbs do - the horizon never moves, and the vanishing point stays where it has
 * always been. The river bends; the world does not tilt.
 */
export function swingOnScreen (river: River, depth: number): number
{
    //  Nothing at the drop's line, and nothing behind it.
    //
    //  At the player the two positions are the same place, so the difference is
    //  zero - which is what lets the drop, its shadow and every burst drawn at
    //  its line be placed by their track x and still land on the road.
    //
    //  Behind, the depth runs past one - almost two at the bottom of the screen
    //  - and a stretch of road the drop is sitting on top of would swing wider
    //  than anything in front of it. Held at the player's own value instead,
    //  which is continuous with the line above rather than a kink.
    const near = Math.min(depth, 1);

    if (near <= 0) { return 0; }

    //  The point being drawn is read at its own depth, so a wave too fine to
    //  show up there is left out of it; the player's own position is read whole,
    //  because that is where the view is taken from and it is never far away.
    return (middleAt(river.travelled + aheadOf(near), river.phases, near) - river.here) * near;
}

/**
 * Phases for one level, so no two rivers wind the same way.
 *
 * Spread by an irrational turn of the circle rather than by a hash: it fills the
 * circle evenly however many levels there are, so neighbouring levels never land
 * on nearly the same river the way a small hash can.
 */
export function phasesFor (seed: number): number[]
{
    const golden = TURN * 0.618033988749895;

    return RIVER_PERIODS.map((_, i) => (seed + 1) * golden * (i + 1));
}
