import { COLOR_VALUES, ColorId } from './constants';
import { GLYPHS } from './glyphs';
import { LevelSpec } from './level';
import { WORLDS } from './worldData';
import { WorldId } from './worlds';
import { WorldVariant, applyVariant } from './worldVariant';
import {
    breath,
    driftHoles,
    chain,
    drum,
    fork,
    gift,
    holes,
    hurdles,
    flank,
    movement,
    narrows,
    opening,
    pinch,
    posts,
    run,
    seam,
    vault,
    weave
} from './lateMovements';

//  Levels 21 to 50.
//
//  ---------------------------------------------------------------------------
//  What the pace can still do, and what it cannot
//  ---------------------------------------------------------------------------
//
//  The first twenty levels get harder by getting faster and tighter: every one
//  runs above the last and packs its rows closer, from 380px/s and 190 apart at
//  level one to 790 and 111 at level twenty. That is a row every 141ms.
//
//  There is not much of that left. Survival's ceiling - the fastest and
//  tightest the game ever runs, held by test to leave room for a lane change
//  "with room, not by a frame" - is a row every 126ms. Carrying the first
//  twenty levels' ramp another thirty levels would reach a row every 86ms,
//  which is shorter than a lane change takes.
//
//  So from here the pace creeps: 792 to 850, and 111 to 109, ending at 128ms
//  and stopping there. Everything else these levels ask for has to come from
//  what is on the road rather than from how fast it arrives - which is the only
//  honest way to write thirty more levels anyway. A level that is only faster
//  is the same level.
//
//  ---------------------------------------------------------------------------
//  The design of each one
//  ---------------------------------------------------------------------------
//
//  Every level below names its main idea, the second thing it leans on, what it
//  is trying to be hard *at*, and the one moment it is built around. No two
//  consecutive levels share a main idea, and no combination repeats.
//
//    21  the long line      combo held across a whole movement + open weaving
//    22  moving walls       sliders + lane precision
//    23  over the top       hurdles + colour taken mid-air
//    24  the narrows        a road one lane wide + static walls
//    25  colour and air     jump and colour asked together + breathing barriers
//    26  the mill           rotating bars + reading a gap before it opens
//    27  the tide           pulse rhythm + orbs only reachable at full breath
//    28  alternating        lanes swapping under slider pressure
//    29  quick air          jump immediately after a colour choice
//    30  the gauntlet       every mechanic so far, one movement each
//    31  the false trail    a seam of orbs leading into a wall
//    32  second thoughts    gates that trade colours + a section behind them
//    33  the vanishing      disappearing floor + holes that are not always there
//    34  the wrong door     a barred doorway that looks like a choice
//    35  the long con       deception stacked: swap, seal, and a false seam
//    36  two roads          a clean lane against a rich one
//    37  the toll           a drain zone paved with orbs
//    38  the shortcut       a jump route that skips a whole movement
//    39  the narrow bridge  a single lane over a drain
//    40  what it is worth   three route decisions, each dearer than the last
//    41  no recovery        pressure with the gift movements taken out
//    42  the squeeze        spacing tightened inside the level, not across it
//    43  crosswinds         sliders and rotors in the same movement
//    44  the drumline       jumps on a beat that does not let up
//    45  colour under fire  colour decisions inside an obstacle movement
//    46  the machine        rotor and hurdle together
//    47  moving holes       a floor that leaves while it moves
//    48  the false floor    deception and pressure at once
//    49  everything at once every mechanic, combined rather than in turn
//    50  DON'T FLOW         the milestone: recovery, then a finale of all of it
//
//  ---------------------------------------------------------------------------
//  Worlds
//  ---------------------------------------------------------------------------
//
//  Ten worlds, and now five visits each rather than two. The rule the first
//  twenty were held to - a world twice, once by each light - cannot survive
//  fifty levels with two lightings. What is kept is what that rule was for: a
//  world is never seen twice within ten levels, and never twice running under
//  the same light. Visits to any world alternate day, night, day, night, day.

/** The order worlds come round in, once every ten levels. */
const CYCLE = [
    'sky', 'mountains', 'canyon', 'forest', 'ice',
    'desert', 'storm', 'city', 'space', 'void'
] as const;

/**
 * The colours a late level plays in.
 *
 * A world owns its colours - every level's palette has to be the one its world
 * declares, which is what makes a world a place rather than a backdrop. The
 * early worlds declare two or three, and the late game needs five: the count
 * has climbed every level to twenty and must not fall back.
 *
 * So a late palette is its world's own colours first, in the world's own order,
 * topped up to five from the colours the game can tell apart. The world still
 * leads and still reads as itself; what is added is the extra reading the late
 * game asks for.
 *
 * Topped up carefully rather than from a list: a colour is only taken if it
 * carries a mark no colour already there carries - pink and magenta share one -
 * and if it is far enough from every colour already there in hue or brightness
 * to be told apart under any kind of colour vision. Both are rules the game
 * already holds every palette to.
 */
function channelDistance (a: number, b: number): number
{
    return Math.max(
        Math.abs(((a >> 16) & 0xff) - ((b >> 16) & 0xff)),
        Math.abs(((a >> 8) & 0xff) - ((b >> 8) & 0xff)),
        Math.abs((a & 0xff) - (b & 0xff))
    );
}

/** Perceived brightness, on the weights the eye actually uses. */
function luminance (color: number): number
{
    const r = ((color >> 16) & 0xff) / 255;
    const g = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;

    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function paletteFor (world: WorldId, variant?: WorldVariant): ColorId[]
{
    const own = applyVariant(WORLDS[world], variant).palette;
    const palette = [ ...own ];

    const marks = new Set(palette.map((id) => GLYPHS[id]));

    const separate = (id: ColorId): boolean => palette.every((there) => {

        const a = COLOR_VALUES[id];
        const b = COLOR_VALUES[there];

        return channelDistance(a, b) > 100 || Math.abs(luminance(a) - luminance(b)) > 0.22;

    });

    for (const id of [ 'magenta', 'green', 'orange', 'blue', 'yellow', 'cyan', 'purple', 'red' ] as ColorId[])
    {
        if (palette.length >= 5) { break; }

        if (!palette.includes(id) && !marks.has(GLYPHS[id]) && separate(id))
        {
            palette.push(id);
            marks.add(GLYPHS[id]);
        }
    }

    return palette;
}

/**
 * The pace of a late level.
 *
 * Creeping rather than climbing, for the reason at the top of this file. The
 * floor is a row every 128ms, which is two clear of the tightest the game
 * anywhere claims is fair.
 */
function paceOf (level: number): { forwardSpeed: number; rowSpacing: number }
{
    const past = level - 21;

    return {
        forwardSpeed: 792 + (past * 2),
        rowSpacing: past < 10 ? 111 : past < 20 ? 110 : 109
    };
}

/** Where a late level is played, and under what light. */
function placeOf (level: number): { world: string; variant?: 'night' } {

    const past = level - 21;
    const band = Math.floor(past / 10);

    return {
        world: CYCLE[past % 10],
        //  Day, night, day across the three bands, so a world's five visits
        //  alternate and no two running share their light.
        variant: band === 1 ? 'night' : undefined
    };
}

/** Everything a late level shares, so each one below is only its own design. */
function late (level: number, sections: LevelSpec['sections']): LevelSpec
{
    const place = placeOf(level);

    return {
        name: String(level),
        world: place.world as LevelSpec['world'],
        ...(place.variant ? { variant: place.variant } : {}),
        palette: paletteFor(place.world as WorldId, place.variant),
        ...paceOf(level),
        sections
    };
}

export const LATE_LEVELS: LevelSpec[] = [];

//  ---------------------------------------------------------------------------
//  21-25  Advanced control
//
//  The band that assumes the first twenty are behind the player. Nothing new is
//  introduced; what changes is that a movement now runs long enough to have to
//  be sustained rather than survived.
//  ---------------------------------------------------------------------------

//  21. The long line.
//
//  Main: a combo held across a whole movement. Secondary: open weaving.
//  Hard at: not letting go. Built around movement 2 - forty-four rows of one
//  colour, the longest unbroken run of a single colour in the game, worth more
//  than the two movements either side of it put together.
LATE_LEVELS.push(late(21, [
    movement(38, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(44, run(chain(1, 2, 4), pinch(1, 2, 4, 4), pinch(1, 2, 0, 5)), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(40, posts(2, 3, 0, 5), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(44, run(chain(3, 4, 0), pinch(3, 4, 0, 0), pinch(3, 4, 1, 1)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(38, run(fork(4, 0, 1), pinch(4, 0, 1, 1), pinch(4, 0, 2, 2)), { splitAfterLane: 0, gate: [ 4, 0 ], obstacles: 'static' }),
    movement(40, drum(0, 1, 2, 2), { splitAfterLane: 1, gate: [ 0, 1 ], obstacles: 'static' }),
    movement(36, gift(1, 3, 3), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(44, run(chain(3, 2, 4), pinch(3, 2, 4, 4), pinch(3, 2, 0, 5), pinch(3, 2, 1, 0)), { splitAfterLane: 1, gate: [ 3, 2 ], obstacles: 'static' }),
    movement(38, run(weave(2, 4, 5), pinch(2, 4, 0, 5), pinch(2, 4, 1, 0), pinch(2, 4, 2, 1)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(40, drum(4, 0, 1, 0), { splitAfterLane: 1, gate: [ 4, 0 ], obstacles: 'static' }),
    movement(38, run(fork(0, 2, 1), pinch(0, 2, 1, 1), pinch(0, 2, 2, 2), pinch(0, 2, 3, 3)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(40, run(posts(2, 1, 3, 2), narrows(2, 1, 0, 3)), { splitAfterLane: 1, gate: [ 2, 1 ], obstacles: 'static' }),
    movement(36, gift(1, 4, 3), { splitAfterLane: 0, gate: [ 1, 4 ] }),
    //  The finale: the line again, tighter, with the level's only walls in it.
    movement(46, run(chain(4, 3, 4), pinch(4, 3, 4, 4), pinch(4, 3, 0, 5), pinch(4, 3, 1, 0)), { splitAfterLane: 1, gate: [ 4, 3 ], obstacles: 'static', rowSpacing: 102 })
]));

//  22. Moving walls.
//
//  Main: sliders. Secondary: lane precision between them.
//  Hard at: timing a lane change against something that is itself moving.
//  Built around movement 9 - a pinch whose two walls slide, so the safe lane
//  is never where it was a moment ago.
LATE_LEVELS.push(late(22, [
    movement(37, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(41, posts(1, 2, 2, 5), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'slider' }),
    movement(39, run(fork(2, 3, 0), pinch(2, 3, 0, 0), pinch(2, 3, 1, 1)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(43, run(drum(3, 4, 0, 1), posts(3, 4, 3, 2)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'slider' }),
    movement(39, run(weave(4, 0, 2), pinch(4, 0, 2, 2), pinch(4, 0, 3, 3)), { splitAfterLane: 0, gate: [ 4, 0 ], obstacles: 'static' }),
    movement(43, posts(0, 1, 1, 3), { splitAfterLane: 1, gate: [ 0, 1 ], obstacles: 'slider' }),
    movement(37, gift(1, 2, 4), { splitAfterLane: 0, gate: [ 1, 2 ] }),
    movement(41, drum(2, 3, 4, 5), { splitAfterLane: 1, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(45, posts(3, 0, 0, 0), { splitAfterLane: 0, gate: [ 3, 0 ], obstacles: 'slider' }),
    movement(39, run(weave(0, 4, 1), pinch(0, 4, 1, 1), pinch(0, 4, 2, 2)), { splitAfterLane: 1, gate: [ 0, 4 ], obstacles: 'static' }),
    movement(43, posts(4, 2, 2, 2), { splitAfterLane: 0, gate: [ 4, 2 ], obstacles: 'slider' }),
    movement(37, gift(2, 1, 3), { splitAfterLane: 1, gate: [ 2, 1 ] }),
    movement(41, run(drum(1, 3, 0, 4), posts(1, 3, 2, 5)), { splitAfterLane: 0, gate: [ 1, 3 ], obstacles: 'slider' }),
    movement(49, run(posts(3, 4, 4, 5)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'slider', rowSpacing: 101 })
]));

//  23. Over the top.
//
//  Main: hurdles. Secondary: a colour taken on the way down.
//  Hard at: jumping without losing the lane the next orb is in. Built around
//  movement 11, where the orb after every bar is in the far lane.
LATE_LEVELS.push(late(23, [
    movement(37, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(43, hurdles(1, 2, 0, 0), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(39, run(fork(2, 3, 1), hurdles(2, 3, 1, 1)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(43, hurdles(3, 4, 1, 2), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(37, gift(4, 0, 3), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(41, posts(0, 2, 2, 4), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(43, hurdles(2, 1, 3, 5), { splitAfterLane: 0, gate: [ 2, 1 ], obstacles: 'static' }),
    movement(39, run(weave(1, 3, 0), hurdles(1, 3, 0, 0), hurdles(1, 3, 1, 1)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'static' }),
    movement(43, holes(3, 0, 1), { splitAfterLane: 0, gate: [ 3, 0 ], obstacles: 'static' }),
    movement(37, gift(0, 4, 2), { splitAfterLane: 1, gate: [ 0, 4 ] }),
    movement(45, vault(4, 2, 0, 3), { splitAfterLane: 0, gate: [ 4, 2 ], obstacles: 'static' }),
    movement(39, run(fork(2, 1, 4), hurdles(2, 1, 4, 4), hurdles(2, 1, 0, 5)), { splitAfterLane: 1, gate: [ 2, 1 ], obstacles: 'static' }),
    movement(43, run(hurdles(1, 4, 4, 5), narrows(1, 4, 3, 0)), { splitAfterLane: 0, gate: [ 1, 4 ], obstacles: 'static' }),
    movement(49, run(vault(4, 3, 2, 0), hurdles(4, 3, 3, 1)), { splitAfterLane: 1, gate: [ 4, 3 ], obstacles: 'static', rowSpacing: 103 })
]));

//  24. The narrows.
//
//  Main: a road one lane wide. Secondary: static walls either side of it.
//  Hard at: holding a line. Built around movement 12 - forty-eight rows where
//  the open lane never stops walking and there is nowhere else to be.
LATE_LEVELS.push(late(24, [
    movement(38, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(42, narrows(1, 2, 0, 1), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(40, run(fork(2, 3, 2), narrows(2, 3, 2, 2)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(44, narrows(3, 4, 1, 3), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(38, gift(4, 0, 4), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(42, pinch(0, 2, 2, 5), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(40, run(weave(2, 1, 0), narrows(2, 1, 0, 0)), { splitAfterLane: 0, gate: [ 2, 1 ], obstacles: 'static' }),
    movement(44, narrows(1, 3, 3, 1), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'static' }),
    movement(38, gift(3, 0, 2), { splitAfterLane: 0, gate: [ 3, 0 ] }),
    movement(42, drum(0, 4, 1, 3), { splitAfterLane: 1, gate: [ 0, 4 ], obstacles: 'static' }),
    movement(40, run(fork(4, 2, 4), narrows(4, 2, 4, 4), narrows(4, 2, 0, 5)), { splitAfterLane: 0, gate: [ 4, 2 ], obstacles: 'static' }),
    movement(51, run(narrows(2, 0, 0, 5), narrows(2, 0, 4, 0)), { splitAfterLane: 1, gate: [ 2, 0 ], obstacles: 'static' }),
    movement(38, gift(0, 3, 0), { splitAfterLane: 0, gate: [ 0, 3 ] }),
    movement(51, run(narrows(3, 4, 4, 1), pinch(3, 4, 4, 2)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static', rowSpacing: 102 })
]));

//  25. Colour and air.
//
//  Main: a jump and a colour asked in the same breath. Secondary: barriers that
//  breathe in and out. Hard at: doing two things at once. Built around the
//  finale, where a vault sits inside a pulse movement.
LATE_LEVELS.push(late(25, [
    movement(38, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(43, vault(1, 2, 0, 2), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(40, posts(2, 3, 3, 3), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'pulse' }),
    movement(45, vault(3, 4, 1, 4), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(38, gift(4, 0, 5), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(45, drum(0, 1, 2, 0), { splitAfterLane: 1, gate: [ 0, 1 ], obstacles: 'pulse' }),
    movement(40, run(fork(1, 3, 1), vault(1, 3, 1, 1)), { splitAfterLane: 0, gate: [ 1, 3 ], obstacles: 'static' }),
    movement(45, hurdles(3, 2, 4, 2), { splitAfterLane: 1, gate: [ 3, 2 ], obstacles: 'pulse' }),
    movement(40, run(weave(2, 4, 3), vault(2, 4, 3, 3), vault(2, 4, 4, 4)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(45, vault(4, 0, 3, 4), { splitAfterLane: 1, gate: [ 4, 0 ], obstacles: 'static' }),
    movement(38, gift(0, 2, 5), { splitAfterLane: 0, gate: [ 0, 2 ] }),
    movement(45, run(pinch(2, 1, 1, 0), narrows(2, 1, 0, 1)), { splitAfterLane: 1, gate: [ 2, 1 ], obstacles: 'pulse' }),
    movement(40, run(fork(1, 4, 1), vault(1, 4, 1, 1), vault(1, 4, 2, 2)), { splitAfterLane: 0, gate: [ 1, 4 ], obstacles: 'static' }),
    movement(53, run(vault(4, 3, 0, 2), drum(4, 3, 1, 3)), { splitAfterLane: 1, gate: [ 4, 3 ], obstacles: 'pulse', rowSpacing: 102 })
]));

//  ---------------------------------------------------------------------------
//  26-30  Timing
//
//  The band where the road stops holding still. Every main idea here is about
//  arriving at the right moment rather than in the right lane, and the level
//  that closes it is the first that asks for several of them at once.
//  ---------------------------------------------------------------------------

//  26. The mill.
//
//  Main: rotating bars. Secondary: reading a gap before it has opened.
//  Hard at: patience - the answer is almost never to move now. Built around
//  movement 9, a pinch whose walls turn, where the only way through is to wait
//  for the bar to go edge-on and then take both lanes at once.
LATE_LEVELS.push(late(26, [
    movement(39, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(45, flank(1, 2, 2, 3), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'rotor' }),
    movement(41, run(fork(2, 3, 4), pinch(2, 3, 4, 4), pinch(2, 3, 0, 5), pinch(2, 3, 1, 0)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(45, drum(3, 4, 0, 5), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'rotor' }),
    movement(39, gift(4, 0, 0), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(45, flank(0, 3, 3, 1), { splitAfterLane: 1, gate: [ 0, 3 ], obstacles: 'rotor' }),
    movement(41, run(weave(3, 1, 2), pinch(3, 1, 2, 2), pinch(3, 1, 3, 3), pinch(3, 1, 4, 4)), { splitAfterLane: 0, gate: [ 3, 1 ], obstacles: 'static' }),
    movement(43, run(drum(1, 2, 4, 3), narrows(1, 2, 1, 4), narrows(1, 2, 3, 5)), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(50, run(flank(2, 0, 0, 4), flank(2, 0, 2, 5)), { splitAfterLane: 0, gate: [ 2, 0 ], obstacles: 'rotor' }),
    movement(39, gift(0, 4, 5), { splitAfterLane: 1, gate: [ 0, 4 ] }),
    movement(45, run(flank(4, 1, 1, 0), flank(4, 1, 1, 2)), { splitAfterLane: 0, gate: [ 4, 1 ], obstacles: 'rotor' }),
    movement(41, run(fork(1, 3, 1), pinch(1, 3, 1, 1), pinch(1, 3, 2, 2), pinch(1, 3, 3, 3), pinch(1, 3, 4, 4)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'static' }),
    movement(45, run(flank(3, 2, 0, 1), flank(3, 2, 2, 3)), { splitAfterLane: 0, gate: [ 3, 2 ], obstacles: 'rotor' }),
    movement(54, run(flank(2, 4, 4, 3), drum(2, 4, 1, 4), flank(2, 4, 0, 5)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'rotor', rowSpacing: 101 })
]));

//  27. The tide.
//
//  Main: the rhythm of barriers that breathe. Secondary: orbs placed so they
//  can only be taken at the top of the breath. Hard at: reading a period and
//  committing to it. Built around movement 12 - a narrows whose walls pulse, so
//  the single open lane widens and closes as the drop runs down it.
LATE_LEVELS.push(late(27, [
    movement(39, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(47, drum(1, 2, 3, 4), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'pulse' }),
    movement(42, run(fork(2, 3, 5), pinch(2, 3, 0, 5)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(49, posts(3, 4, 0, 0), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'pulse' }),
    movement(39, gift(4, 0, 1), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(47, posts(0, 2, 2, 2), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'pulse' }),
    movement(42, run(weave(2, 4, 3), pinch(2, 4, 3, 3)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(47, run(drum(4, 1, 3, 4), narrows(4, 1, 2, 5)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'pulse' }),
    movement(39, gift(1, 3, 5), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(47, run(hurdles(3, 0, 0, 0), narrows(3, 0, 3, 1)), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'static' }),
    movement(42, run(fork(0, 2, 1), pinch(0, 2, 1, 1), pinch(0, 2, 2, 2)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(53, run(narrows(2, 4, 4, 2), pinch(2, 4, 0, 3)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'pulse' }),
    movement(39, gift(4, 1, 3), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(56, run(pinch(1, 3, 3, 4), drum(1, 3, 0, 5), narrows(1, 3, 1, 0)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'pulse', rowSpacing: 101 })
]));

//  28. Alternating.
//
//  Main: lanes swapping under slider pressure. Secondary: colour taken on the
//  swap. Hard at: never settling - every movement here wants the drop on the
//  other side of the road from where it is. Built around movement 13, where the
//  orbs alternate outside lanes while a slider crosses between them.
LATE_LEVELS.push(late(28, [
    movement(40, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(46, drum(1, 2, 4, 5), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'slider' }),
    movement(42, run(weave(2, 3, 0), posts(2, 3, 0, 0), posts(2, 3, 1, 1)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(46, posts(3, 4, 0, 1), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'slider' }),
    movement(40, gift(4, 2, 2), { splitAfterLane: 0, gate: [ 4, 2 ] }),
    movement(48, posts(2, 1, 1, 3), { splitAfterLane: 1, gate: [ 2, 1 ], obstacles: 'slider' }),
    movement(42, run(fork(1, 3, 4), posts(1, 3, 4, 4), posts(1, 3, 0, 5)), { splitAfterLane: 0, gate: [ 1, 3 ], obstacles: 'static' }),
    movement(46, run(drum(3, 0, 2, 5), narrows(3, 0, 3, 0)), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'pulse' }),
    movement(42, run(weave(0, 4, 0), posts(0, 4, 0, 0), posts(0, 4, 1, 1)), { splitAfterLane: 0, gate: [ 0, 4 ], obstacles: 'static' }),
    movement(46, run(hurdles(4, 1, 1, 1), narrows(4, 1, 4, 2)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(40, gift(1, 2, 2), { splitAfterLane: 0, gate: [ 1, 2 ] }),
    movement(46, run(posts(2, 3, 3, 3), posts(2, 3, 1, 4)), { splitAfterLane: 1, gate: [ 2, 3 ], obstacles: 'slider' }),
    movement(50, run(fork(3, 0, 4), posts(3, 0, 4, 4), posts(3, 0, 0, 5)), { splitAfterLane: 0, gate: [ 3, 0 ], obstacles: 'slider' }),
    movement(56, run(drum(0, 4, 2, 5), posts(0, 4, 4, 0), posts(0, 4, 2, 1)), { splitAfterLane: 1, gate: [ 0, 4 ], obstacles: 'slider', rowSpacing: 101 })
]));

//  29. Quick air.
//
//  Main: a jump asked for immediately after a colour decision. Secondary: the
//  landing lane mattering as much as the jump. Hard at: sequencing two inputs
//  with no road between them. Built around the finale, which is nothing but
//  vaults for fifty rows at the tightest spacing in the band.
LATE_LEVELS.push(late(29, [
    movement(41, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(48, vault(1, 2, 3, 0), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(43, run(fork(2, 3, 1), vault(2, 3, 1, 1)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(48, holes(3, 4, 2), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(41, gift(4, 0, 3), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(50, vault(0, 1, 2, 4), { splitAfterLane: 1, gate: [ 0, 1 ], obstacles: 'static' }),
    movement(43, run(weave(1, 3, 5), vault(1, 3, 0, 5)), { splitAfterLane: 0, gate: [ 1, 3 ], obstacles: 'static' }),
    movement(48, run(drum(3, 4, 0, 0), narrows(3, 4, 4, 1)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'pulse' }),
    movement(48, run(vault(4, 2, 1, 1), narrows(4, 2, 0, 2)), { splitAfterLane: 0, gate: [ 4, 2 ], obstacles: 'static' }),
    movement(41, gift(2, 0, 2), { splitAfterLane: 1, gate: [ 2, 0 ] }),
    movement(48, holes(0, 3, 3), { splitAfterLane: 0, gate: [ 0, 3 ], obstacles: 'static' }),
    movement(43, run(fork(3, 1, 4), vault(3, 1, 4, 4), vault(3, 1, 0, 5)), { splitAfterLane: 1, gate: [ 3, 1 ], obstacles: 'static' }),
    movement(48, hurdles(1, 4, 4, 5), { splitAfterLane: 0, gate: [ 1, 4 ], obstacles: 'static' }),
    movement(59, run(vault(4, 3, 0, 0), narrows(4, 3, 4, 1)), { splitAfterLane: 1, gate: [ 4, 3 ], obstacles: 'static', rowSpacing: 101 })
]));

//  30. The gauntlet.
//
//  The first challenge level. Main: everything the game has taught, one
//  movement each, in the order it was taught. Secondary: none - the point is
//  the breadth. Hard at: switching between kinds of attention with no warning
//  and almost no road between them. Built around the fact that no two
//  consecutive movements here are the same kind of problem.
LATE_LEVELS.push(late(30, [
    movement(37, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(42, posts(1, 2, 2, 1), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(42, drum(2, 3, 0, 2), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'slider' }),
    movement(42, pinch(3, 4, 4, 3), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'pulse' }),
    movement(40, gift(4, 0, 4), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(44, flank(0, 1, 1, 5), { splitAfterLane: 1, gate: [ 0, 1 ], obstacles: 'rotor' }),
    movement(44, hurdles(1, 3, 3, 0), { splitAfterLane: 0, gate: [ 1, 3 ], obstacles: 'static' }),
    movement(44, run(holes(3, 2, 1), narrows(3, 2, 0, 2)), { splitAfterLane: 1, gate: [ 3, 2 ], obstacles: 'static' }),
    movement(46, run(narrows(2, 4, 4, 2), narrows(2, 4, 1, 3)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(40, gift(4, 1, 3), { splitAfterLane: 1, gate: [ 4, 1 ] }),
    movement(44, vault(1, 0, 2, 4), { splitAfterLane: 0, gate: [ 1, 0 ], obstacles: 'static' }),
    movement(44, drum(0, 3, 1, 5), { splitAfterLane: 1, gate: [ 0, 3 ], obstacles: 'rotor' }),
    movement(44, run(chain(3, 2, 0), narrows(3, 2, 0, 0), narrows(3, 2, 1, 1)), { splitAfterLane: 0, gate: [ 3, 2 ], obstacles: 'static' }),
    movement(44, posts(2, 0, 0, 1), { splitAfterLane: 1, gate: [ 2, 0 ], obstacles: 'slider' }),
    //  The finale takes one row from each of the four kinds in turn.
    movement(57, run(vault(0, 4, 1, 2), pinch(0, 4, 4, 3), drum(0, 4, 2, 4), narrows(0, 4, 1, 5)), { splitAfterLane: 0, gate: [ 0, 4 ], obstacles: 'pulse', rowSpacing: 101 })
]));

//  ---------------------------------------------------------------------------
//  31-35  Deception
//
//  The band where the road stops telling the whole truth - but never lies. Every
//  trick here is visible before it matters: a sealed doorway wears its bar, a
//  gate that will trade its colours is marked as one, a floor that is going to
//  leave blinks before the player is standing on it. What is being tested is
//  whether the player is reading or remembering.
//  ---------------------------------------------------------------------------

//  31. The false trail.
//
//  Main: a seam of orbs leading somewhere it should not be followed. Secondary:
//  static walls closing the lane it leads into. Hard at: letting go of points
//  already committed to. Built around movement 4, where a four-row seam in the
//  outside lane runs directly into a pinch that has closed that lane.
LATE_LEVELS.push(late(31, [
    movement(43, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(48, posts(1, 2, 2, 2), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(46, run(fork(2, 3, 3), narrows(2, 3, 3, 3)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(53, run(seam(4, 2), pinch(3, 4, 0, 4), seam(3, 0), pinch(3, 4, 1, 5)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(43, gift(4, 0, 5), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(51, run(seam(2, 0), seam(0, 2), posts(0, 2, 3, 0)), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(46, run(weave(2, 4, 1), narrows(2, 4, 1, 1)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(51, run(seam(1, 2), narrows(4, 1, 1, 2), narrows(4, 1, 4, 3)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(43, gift(1, 3, 3), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(51, run(drum(3, 0, 2, 4), posts(3, 0, 1, 5)), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'slider' }),
    movement(46, run(fork(0, 2, 5), narrows(0, 2, 0, 5), narrows(0, 2, 1, 0)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(53, run(seam(4, 0), pinch(2, 4, 4, 0), seam(2, 2), pinch(2, 4, 3, 1), narrows(2, 4, 3, 2)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(43, gift(4, 1, 1), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(58, run(seam(3, 2), narrows(1, 3, 0, 2), seam(1, 0)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'static', rowSpacing: 102 })
]));

//  32. Second thoughts.
//
//  Main: doorways that trade their colours as they are approached. Secondary:
//  the movement behind one being long enough that the wrong choice is felt for
//  a while. Hard at: committing late. Built around movement 11, a swap whose
//  section is forty rows of the colour that was on the other side.
LATE_LEVELS.push(late(32, [
    movement(44, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(48, chain(1, 2, 3), { splitAfterLane: 1, gate: [ 1, 2 ], gateSwap: true }),
    movement(46, posts(2, 3, 3, 4), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(51, drum(3, 4, 0, 5), { splitAfterLane: 1, gate: [ 3, 4 ], gateSwap: true, obstacles: 'static' }),
    movement(44, gift(4, 0, 0), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(51, fork(0, 2, 1), { splitAfterLane: 1, gate: [ 0, 2 ], gateSwap: true }),
    movement(46, run(weave(2, 1, 2), posts(2, 1, 2, 2), posts(2, 1, 3, 3)), { splitAfterLane: 0, gate: [ 2, 1 ], obstacles: 'static' }),
    movement(51, run(pinch(1, 3, 3, 3), narrows(1, 3, 4, 4)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'pulse' }),
    movement(44, gift(3, 0, 4), { splitAfterLane: 0, gate: [ 3, 0 ] }),
    movement(51, run(drum(0, 4, 1, 5), posts(0, 4, 1, 0)), { splitAfterLane: 1, gate: [ 0, 4 ], gateSwap: true, obstacles: 'slider' }),
    movement(53, run(chain(4, 2, 0), posts(4, 2, 0, 0), posts(4, 2, 1, 1), posts(4, 2, 2, 2)), { splitAfterLane: 0, gate: [ 4, 2 ], gateSwap: true }),
    movement(46, run(fork(2, 1, 1), posts(2, 1, 1, 1), posts(2, 1, 2, 2), posts(2, 1, 3, 3)), { splitAfterLane: 1, gate: [ 2, 1 ], obstacles: 'static' }),
    movement(51, run(narrows(1, 3, 3, 2), narrows(1, 3, 4, 3)), { splitAfterLane: 0, gate: [ 1, 3 ], obstacles: 'static' }),
    movement(60, run(chain(3, 0, 3), posts(3, 0, 3, 3), posts(3, 0, 4, 4), posts(3, 0, 0, 5)), { splitAfterLane: 1, gate: [ 3, 0 ], gateSwap: true, obstacles: 'static', rowSpacing: 102 })
]));

//  33. The vanishing.
//
//  Main: a floor that leaves. Secondary: holes that are not always there, so a
//  row that was a jump last time is open this time. Hard at: trusting a reading
//  taken a second ago. Built around movement 12, where the blinking holes and
//  the solid ones are the same shape on the road until they blink.
LATE_LEVELS.push(late(33, [
    movement(44, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(49, holes(1, 2, 4), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(47, run(fork(2, 3, 5), holes(2, 3, 5)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(52, holes(3, 4, 0), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'blinker' }),
    movement(44, gift(4, 0, 1), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(52, posts(0, 2, 2, 2), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'blinker' }),
    movement(47, run(weave(2, 4, 3), holes(2, 4, 3)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(52, run(hurdles(4, 1, 1, 4), narrows(4, 1, 4, 5)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(44, gift(1, 3, 5), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(52, run(drum(3, 0, 2, 0), narrows(3, 0, 1, 1)), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'blinker' }),
    movement(47, run(fork(0, 2, 1), holes(0, 2, 1), holes(0, 2, 2)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(56, run(holes(2, 4, 2), pinch(2, 4, 4, 3), narrows(2, 4, 3, 4)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'blinker' }),
    movement(44, gift(4, 1, 3), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(61, run(holes(1, 3, 4), vault(1, 3, 0, 5), narrows(1, 3, 3, 0), narrows(1, 3, 0, 1)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'blinker', rowSpacing: 102 })
]));

//  34. The wrong door.
//
//  Main: a doorway that has been barred. Secondary: the section behind it
//  written entirely in the colour still on offer, so the bar is a nuisance
//  rather than a death sentence. Hard at: reading a gate instead of picking the
//  side you picked last time. Built around movement 6, the first barred doorway
//  on the side the previous four gates all rewarded.
LATE_LEVELS.push(late(34, [
    movement(45, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(50, posts(1, 2, 2, 5), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(48, run(fork(2, 3, 0), narrows(2, 3, 0, 0)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(50, drum(3, 4, 0, 1), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'slider' }),
    movement(45, gift(4, 0, 2), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(52, chain(2, 2, 3), { splitAfterLane: 1, gate: [ 0, 2 ], gateSealed: 0, obstacles: 'static' }),
    movement(48, run(weave(2, 1, 4), narrows(2, 1, 4, 4)), { splitAfterLane: 0, gate: [ 2, 1 ], obstacles: 'static' }),
    movement(52, run(chain(3, 3, 5), narrows(1, 3, 0, 5), narrows(1, 3, 1, 0)), { splitAfterLane: 1, gate: [ 1, 3 ], gateSealed: 0, obstacles: 'pulse' }),
    movement(45, gift(3, 0, 0), { splitAfterLane: 0, gate: [ 3, 0 ] }),
    movement(52, run(pinch(0, 4, 4, 1), narrows(0, 4, 1, 2)), { splitAfterLane: 1, gate: [ 0, 4 ], obstacles: 'static' }),
    movement(52, run(chain(4, 4, 2), narrows(4, 2, 2, 2), narrows(4, 2, 3, 3)), { splitAfterLane: 0, gate: [ 4, 2 ], gateSealed: 1, obstacles: 'static' }),
    movement(48, run(fork(2, 1, 3), narrows(2, 1, 3, 3), narrows(2, 1, 4, 4)), { splitAfterLane: 1, gate: [ 2, 1 ], obstacles: 'static' }),
    movement(52, run(narrows(1, 3, 3, 4), narrows(1, 3, 4, 5)), { splitAfterLane: 0, gate: [ 1, 3 ], obstacles: 'static' }),
    movement(60, run(chain(0, 0, 5), narrows(3, 0, 0, 5), narrows(3, 0, 1, 0)), { splitAfterLane: 1, gate: [ 3, 0 ], gateSealed: 0, obstacles: 'static', rowSpacing: 102 })
]));

//  35. The long con.
//
//  Main: all three deceptions in one level - a swap, a bar, and a seam that
//  leads nowhere. Secondary: they are never used twice running, so none of them
//  becomes the expected answer. Hard at: reading each gate on its own terms.
//  Built around movements 10 and 11: a swap immediately followed by a bar, the
//  only place in the game where two gates in a row are both not what they seem.
LATE_LEVELS.push(late(35, [
    movement(45, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(50, run(seam(2, 0), posts(1, 2, 2, 0)), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(48, run(fork(2, 3, 1), narrows(2, 3, 1, 1)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(53, drum(3, 4, 1, 2), { splitAfterLane: 1, gate: [ 3, 4 ], gateSwap: true, obstacles: 'static' }),
    movement(45, gift(4, 0, 3), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(53, chain(2, 2, 4), { splitAfterLane: 1, gate: [ 0, 2 ], gateSealed: 0, obstacles: 'slider' }),
    movement(48, run(weave(2, 4, 5), narrows(2, 4, 0, 5)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(53, run(seam(1, 2), narrows(4, 1, 0, 0), narrows(4, 1, 4, 1)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(45, gift(1, 3, 1), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(53, run(drum(3, 0, 4, 2), narrows(3, 0, 1, 3), narrows(3, 0, 3, 4)), { splitAfterLane: 1, gate: [ 3, 0 ], gateSwap: true, obstacles: 'pulse' }),
    movement(53, run(chain(2, 2, 3), narrows(0, 2, 3, 3), narrows(0, 2, 4, 4)), { splitAfterLane: 0, gate: [ 0, 2 ], gateSealed: 0, obstacles: 'static' }),
    movement(48, run(fork(2, 1, 4), narrows(2, 1, 4, 4), narrows(2, 1, 0, 5)), { splitAfterLane: 1, gate: [ 2, 1 ], obstacles: 'static' }),
    movement(55, run(seam(3, 2), pinch(1, 3, 3, 5), seam(1, 0), narrows(1, 3, 4, 0)), { splitAfterLane: 0, gate: [ 1, 3 ], obstacles: 'blinker' }),
    movement(62, run(chain(4, 4, 0), narrows(3, 4, 0, 0), narrows(3, 4, 1, 1)), { splitAfterLane: 1, gate: [ 3, 4 ], gateSealed: 0, obstacles: 'static', rowSpacing: 102 })
]));

//  ---------------------------------------------------------------------------
//  36-40  Risk against reward
//
//  The band where the road forks. Every level here contains at least one place
//  the player has to price: a lane worth more that costs more to be in, a
//  stretch that charges score for crossing it, a jump that skips a movement and
//  everything in it. The safe answer is always there, and always worth less.
//  ---------------------------------------------------------------------------

//  36. Two roads.
//
//  Main: a clean lane against a rich one, side by side, for a whole movement.
//  Secondary: the rich lane narrowing as it goes. Hard at: deciding early and
//  living with it. Built around movement 4, forty-four rows where the outside
//  lane is paved with orbs and walled in, and the inside lane is empty and free.
LATE_LEVELS.push(late(36, [
    movement(46, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(51, posts(1, 2, 2, 1), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(49, run(fork(2, 3, 2), narrows(2, 3, 2, 2)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(58, run(seam(4, 2), pinch(3, 4, 0, 3), seam(3, 2)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(46, gift(4, 0, 4), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(55, run(seam(2, 0), narrows(0, 2, 3, 5)), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(49, run(weave(2, 4, 0), narrows(2, 4, 0, 0)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(55, run(drum(4, 1, 0, 1), posts(4, 1, 4, 2)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'slider' }),
    movement(46, gift(1, 3, 2), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(58, run(seam(0, 0), seam(3, 0), pinch(3, 0, 2, 3), narrows(3, 0, 1, 4)), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'pulse' }),
    movement(49, run(fork(0, 2, 4), narrows(0, 2, 4, 4), narrows(0, 2, 0, 5)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(55, run(hurdles(2, 4, 4, 5), narrows(2, 4, 1, 0), narrows(2, 4, 3, 1)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(46, gift(4, 1, 0), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(65, run(seam(3, 2), pinch(1, 3, 3, 1), seam(1, 2), narrows(1, 3, 0, 2)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'static', rowSpacing: 103 })
]));

//  37. The toll.
//
//  Main: a stretch that charges score to be crossed, paved with more score than
//  it costs - if it is crossed well. Secondary: the crossing being narrow, so
//  paying more than it is worth is easy. Hard at: arithmetic under pressure.
//  Built around movement 6: the drain runs the whole movement and the orbs in
//  it are worth more than the toll only to a player who takes nearly all of them.
LATE_LEVELS.push(late(37, [
    movement(47, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(52, posts(1, 2, 2, 2), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(50, run(fork(2, 3, 3), narrows(2, 3, 3, 3)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(52, drum(3, 4, 0, 4), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'slider' }),
    movement(47, gift(4, 0, 5), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(58, gift(0, 2, 0), { splitAfterLane: 1, gate: [ 0, 2 ], drain: 12 }),
    movement(50, run(weave(2, 4, 1), narrows(2, 4, 1, 1)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(56, run(gift(4, 1, 2), pinch(4, 1, 3, 3)), { splitAfterLane: 1, gate: [ 4, 1 ], drain: 12, obstacles: 'static' }),
    movement(47, gift(1, 3, 3), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(56, narrows(3, 0, 0, 4), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'static' }),
    movement(50, run(fork(0, 2, 5), narrows(0, 2, 0, 5), narrows(0, 2, 1, 0)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(58, run(gift(2, 4, 0), narrows(2, 4, 1, 1)), { splitAfterLane: 1, gate: [ 2, 4 ], drain: 14, drainColor: 4, obstacles: 'static' }),
    movement(47, gift(4, 1, 1), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(66, run(gift(1, 3, 2), pinch(1, 3, 0, 3), drum(1, 3, 2, 4)), { splitAfterLane: 1, gate: [ 1, 3 ], drain: 12, obstacles: 'static', rowSpacing: 103 })
]));

//  38. The shortcut.
//
//  Main: a jump that skips a whole stretch of road and everything on it.
//  Secondary: the road it skips being the only place the level hands out score.
//  Hard at: knowing when not to take the fast way. Built around movement 7,
//  where the hurdle line runs beside a seam: clear them all and arrive early
//  with nothing, or come down into the lane and collect.
LATE_LEVELS.push(late(38, [
    movement(47, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(53, vault(1, 2, 3, 3), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(51, run(fork(2, 3, 4), vault(2, 3, 4, 4)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(56, run(seam(4, 0), hurdles(3, 4, 4, 5)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(47, gift(4, 0, 0), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(56, holes(0, 2, 1), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(61, run(seam(4, 2), hurdles(2, 4, 1, 2), seam(2, 0), hurdles(2, 4, 3, 3)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(51, run(weave(4, 1, 3), vault(4, 1, 3, 3), vault(4, 1, 4, 4)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(47, gift(1, 3, 4), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(56, vault(3, 0, 2, 5), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'static' }),
    movement(51, run(fork(0, 2, 0), vault(0, 2, 0, 0), vault(0, 2, 1, 1)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(59, run(seam(4, 0), holes(2, 4, 1), seam(2, 2)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(47, gift(4, 1, 2), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(66, run(seam(3, 2), vault(1, 3, 0, 3), seam(1, 0)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'static', rowSpacing: 103 })
]));

//  39. The narrow bridge.
//
//  Main: a single lane held over a stretch that charges for every pixel of it.
//  Secondary: the lane moving while the toll runs. Hard at: precision with a
//  clock on it - every mistake costs twice, once for the wall and once for the
//  time spent getting back. Built around movement 10, forty-six rows of a
//  walking single lane with the drain on the whole way.
LATE_LEVELS.push(late(39, [
    movement(48, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(54, narrows(1, 2, 2, 4), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(50, run(fork(2, 3, 5), narrows(2, 3, 0, 5)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(57, run(gift(3, 4, 0), pinch(3, 4, 0, 1)), { splitAfterLane: 1, gate: [ 3, 4 ], drain: 12 }),
    movement(48, gift(4, 0, 1), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(57, narrows(0, 2, 3, 2), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(50, run(weave(2, 4, 3), narrows(2, 4, 3, 3)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(57, run(drum(4, 1, 0, 4), flank(4, 1, 2, 5), flank(4, 1, 3, 0)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'rotor' }),
    movement(48, gift(1, 3, 5), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(62, run(narrows(3, 0, 0, 0), narrows(3, 0, 4, 1), narrows(3, 0, 3, 2)), { splitAfterLane: 1, gate: [ 3, 0 ], drain: 12, obstacles: 'static' }),
    movement(50, run(fork(0, 2, 1), narrows(0, 2, 1, 1), narrows(0, 2, 2, 2), narrows(0, 2, 3, 3)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(57, run(seam(4, 1), posts(2, 4, 4, 2), posts(2, 4, 1, 3), posts(2, 4, 3, 4), posts(2, 4, 0, 5)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'slider' }),
    movement(48, gift(4, 1, 3), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(70, run(narrows(1, 3, 0, 4), pinch(1, 3, 2, 5), narrows(1, 3, 4, 0)), { splitAfterLane: 1, gate: [ 1, 3 ], drain: 12, obstacles: 'static', rowSpacing: 103 })
]));

//  40. What it is worth.
//
//  Main: three route decisions, each dearer than the last - a seam beside a
//  clean lane, then a toll worth crossing, then a toll that is not. Secondary:
//  no two of them priced the same way. Hard at: not answering the third one the
//  way the first two were answered. Built around the last of the three, which
//  is the only route in the game whose rich side is worth less than it costs.
LATE_LEVELS.push(late(40, [
    movement(48, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(54, posts(1, 2, 2, 5), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'slider' }),
    movement(60, run(seam(3, 0), seam(2, 0), pinch(2, 3, 3, 0)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(52, run(fork(3, 4, 1), posts(3, 4, 1, 1), posts(3, 4, 2, 2)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(48, gift(4, 0, 2), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(57, drum(0, 2, 1, 3), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'rotor' }),
    movement(60, run(gift(2, 4, 4), pinch(2, 4, 0, 5)), { splitAfterLane: 0, gate: [ 2, 4 ], drain: 12 }),
    movement(52, run(weave(4, 1, 5), posts(4, 1, 0, 5), posts(4, 1, 1, 0), posts(4, 1, 2, 1), posts(4, 1, 3, 2)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(48, gift(1, 3, 0), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(57, hurdles(3, 0, 0, 1), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'static' }),
    movement(52, run(fork(0, 2, 2), posts(0, 2, 2, 2), posts(0, 2, 3, 3), posts(0, 2, 4, 4), posts(0, 2, 0, 5)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(62, run(seam(4, 2), narrows(2, 4, 4, 3), seam(2, 0)), { splitAfterLane: 1, gate: [ 2, 4 ], drain: 14, drainColor: 2, obstacles: 'static' }),
    movement(48, gift(4, 1, 4), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(70, run(gift(1, 3, 5), narrows(1, 3, 0, 0), vault(1, 3, 2, 1)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'static', rowSpacing: 104 })
]));

//  ---------------------------------------------------------------------------
//  41-45  Pressure
//
//  The band that takes the rests away. The movements are the same kinds the
//  player already knows; what changes is that they arrive back to back, and the
//  stretch of open road that used to sit between two hard ones is now itself a
//  hard one. Nothing here is new, and that is the point - this band is about
//  sustaining, not learning.
//  ---------------------------------------------------------------------------

//  41. No recovery.
//
//  Main: pressure with the gifts taken out. Secondary: every movement being one
//  the player has met, so nothing is unfair. Hard at: endurance. Built around
//  the fact that this is the first level in the game with only one open
//  movement in it, and it is the third of fifteen.
LATE_LEVELS.push(late(41, [
    movement(47, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(56, posts(1, 2, 2, 0), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'slider' }),
    movement(47, gift(2, 3, 1), { splitAfterLane: 0, gate: [ 2, 3 ] }),
    movement(59, drum(3, 4, 0, 2), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'rotor' }),
    movement(56, pinch(4, 0, 1, 3), { splitAfterLane: 0, gate: [ 4, 0 ], obstacles: 'pulse' }),
    movement(59, narrows(0, 2, 2, 4), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(56, hurdles(2, 4, 3, 5), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(59, gift(4, 1, 0), { splitAfterLane: 1, gate: [ 4, 1 ] }),
    movement(56, vault(1, 3, 2, 1), { splitAfterLane: 0, gate: [ 1, 3 ], obstacles: 'static' }),
    movement(59, flank(3, 0, 0, 2), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'rotor' }),
    movement(56, holes(0, 2, 3), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'blinker' }),
    movement(59, narrows(2, 4, 4, 4), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(56, drum(4, 1, 3, 5), { splitAfterLane: 0, gate: [ 4, 1 ], obstacles: 'pulse' }),
    movement(69, run(vault(1, 3, 0, 0), posts(1, 3, 3, 1), drum(1, 3, 2, 2)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'slider', rowSpacing: 104 })
]));

//  42. The squeeze.
//
//  Main: spacing tightened inside the level rather than across it. Secondary:
//  the tightening being audible in the rhythm before it is visible on the road.
//  Hard at: a difficulty that changes under the player rather than between
//  levels. Built around movements 9 to 12, four in a row each tighter than the
//  last, ending at the closest rows in the game.
LATE_LEVELS.push(late(42, [
    movement(52, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(57, posts(1, 2, 2, 1), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(55, run(fork(2, 3, 2), posts(2, 3, 2, 2)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(60, drum(3, 4, 0, 3), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'slider' }),
    movement(52, gift(4, 0, 4), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(60, pinch(0, 2, 2, 5), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'pulse' }),
    movement(55, run(weave(2, 4, 0), posts(2, 4, 0, 0)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(52, gift(4, 1, 1), { splitAfterLane: 1, gate: [ 4, 1 ] }),
    movement(60, run(drum(1, 3, 0, 2), narrows(1, 3, 2, 3), narrows(1, 3, 4, 4)), { splitAfterLane: 0, gate: [ 1, 3 ], obstacles: 'static', rowSpacing: 108 }),
    movement(60, run(posts(3, 0, 2, 3), posts(3, 0, 4, 4), posts(3, 0, 1, 5)), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'slider', rowSpacing: 106 }),
    movement(60, narrows(0, 2, 4, 4), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static', rowSpacing: 104 }),
    movement(60, run(drum(2, 4, 1, 5), flank(2, 4, 3, 0), flank(2, 4, 0, 1)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'rotor', rowSpacing: 104 }),
    movement(52, gift(4, 1, 0), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(75, run(pinch(1, 3, 3, 1), vault(1, 3, 0, 2), drum(1, 3, 2, 3)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'pulse', rowSpacing: 104 })
]));

//  43. Crosswinds.
//
//  Main: sliders and rotors in the same movement. Secondary: the two moving on
//  different clocks, so their pattern never quite repeats. Hard at: reading two
//  rhythms at once. Built around movement 12, where a sliding pinch runs
//  straight into a turning one and the gap between them is four rows.
LATE_LEVELS.push(late(43, [
    movement(51, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(59, posts(1, 2, 2, 2), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'slider' }),
    movement(54, run(fork(2, 3, 3), pinch(2, 3, 3, 3)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(59, drum(3, 4, 0, 4), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'rotor' }),
    movement(51, gift(4, 0, 5), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(62, posts(0, 2, 2, 0), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'slider' }),
    movement(59, flank(2, 4, 4, 1), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'rotor' }),
    movement(54, run(weave(4, 1, 2), pinch(4, 1, 2, 2), pinch(4, 1, 3, 3), pinch(4, 1, 4, 4), pinch(4, 1, 0, 5), pinch(4, 1, 1, 0), pinch(4, 1, 2, 1), pinch(4, 1, 3, 2)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(51, gift(1, 3, 3), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(62, run(drum(3, 0, 2, 4), posts(3, 0, 4, 5), posts(3, 0, 1, 0)), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'slider' }),
    movement(59, run(flank(0, 2, 4, 5), flank(0, 2, 1, 0), flank(0, 2, 3, 1)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'rotor' }),
    movement(67, run(posts(2, 4, 0, 0), posts(2, 4, 4, 1)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'slider' }),
    movement(51, gift(4, 1, 1), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(73, run(drum(1, 3, 0, 2), flank(1, 3, 3, 3), flank(1, 3, 2, 4)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'rotor', rowSpacing: 104 })
]));

//  44. The drumline.
//
//  Main: jumps on a beat that does not let up. Secondary: the beat changing
//  period twice without warning. Hard at: holding a rhythm through a change of
//  rhythm. Built around movement 11, where the bars arrive every fourth row
//  instead of every sixth and nothing on the road says so beforehand.
LATE_LEVELS.push(late(44, [
    movement(51, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(60, hurdles(1, 2, 2, 3), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(54, run(fork(2, 3, 4), vault(2, 3, 4, 4)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(62, vault(3, 4, 0, 5), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(51, gift(4, 0, 0), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(60, holes(0, 2, 1), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(60, hurdles(2, 4, 3, 2), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'pulse' }),
    movement(54, run(weave(4, 1, 3), vault(4, 1, 3, 3), vault(4, 1, 4, 4)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(51, gift(1, 3, 4), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(62, vault(3, 0, 2, 5), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'static' }),
    movement(65, run(vault(0, 2, 1, 0), vault(0, 2, 3, 1)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(60, holes(2, 4, 1), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'blinker' }),
    movement(51, gift(4, 1, 2), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(77, run(vault(1, 3, 0, 3), hurdles(1, 3, 2, 4), holes(1, 3, 5)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'static', rowSpacing: 105 })
]));

//  45. Colour under fire.
//
//  Main: colour decisions taken inside an obstacle movement rather than on open
//  road. Secondary: the two colours never being in the same lane twice running.
//  Hard at: reading a colour while reading a road. Built around movement 12,
//  where both colours sit in the outside lanes of a sliding pinch, so the
//  colour choice and the lane choice are the same input.
LATE_LEVELS.push(late(45, [
    movement(51, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(60, drum(1, 2, 3, 4), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(60, run(fork(2, 3, 5), drum(2, 3, 0, 5), drum(2, 3, 1, 0), drum(2, 3, 2, 1), drum(2, 3, 3, 2)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'slider' }),
    movement(62, drum(3, 4, 0, 0), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'pulse' }),
    movement(51, gift(4, 0, 1), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(62, run(fork(0, 2, 2), drum(0, 2, 2, 2), drum(0, 2, 3, 3), drum(0, 2, 4, 4), drum(0, 2, 0, 5)), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'rotor' }),
    movement(60, run(drum(2, 4, 1, 3), narrows(2, 4, 3, 4)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(54, run(weave(4, 1, 4), drum(4, 1, 4, 4), drum(4, 1, 0, 5), drum(4, 1, 1, 0), drum(4, 1, 2, 1), drum(4, 1, 3, 2)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(51, gift(1, 3, 5), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(62, run(fork(3, 0, 0), drum(3, 0, 0, 0), drum(3, 0, 1, 1), drum(3, 0, 2, 2), drum(3, 0, 3, 3), drum(3, 0, 4, 4)), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'pulse' }),
    movement(60, run(vault(0, 2, 4, 1), narrows(0, 2, 1, 2)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(68, run(fork(2, 4, 2), drum(2, 4, 2, 2), drum(2, 4, 3, 3), drum(2, 4, 4, 4), drum(2, 4, 0, 5), drum(2, 4, 1, 0)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'slider' }),
    movement(51, gift(4, 1, 3), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(77, run(fork(1, 3, 4), drum(1, 3, 4, 4), drum(1, 3, 0, 5), drum(1, 3, 1, 0), drum(1, 3, 2, 1), drum(1, 3, 3, 2)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'rotor', rowSpacing: 105 })
]));

//  ---------------------------------------------------------------------------
//  46-50  Mastery
//
//  The band where mechanics stop taking turns. Up to here a movement has been
//  one idea played well; from here a movement is two ideas at once, and the
//  answer to it is neither of the two answers on its own. Level 50 is the only
//  level in the game that asks for all of them inside a single movement.
//  ---------------------------------------------------------------------------

//  46. The machine.
//
//  Main: a turning bar and a bar to be jumped, in the same movement. Secondary:
//  the jump having to be taken while the rotor is edge-on, so the two rhythms
//  have to agree. Hard at: two timings that are not the same timing. Built
//  around movement 12, where the hurdle line sits inside a rotor movement and
//  there is exactly one phase of the turn that both can be answered in.
LATE_LEVELS.push(late(46, [
    movement(52, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(60, flank(1, 2, 2, 5), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'rotor' }),
    movement(55, run(fork(2, 3, 0), hurdles(2, 3, 0, 0)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(63, hurdles(3, 4, 4, 1), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'static' }),
    movement(52, gift(4, 0, 2), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(63, drum(0, 2, 1, 3), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'rotor' }),
    movement(63, vault(2, 4, 3, 4), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'static' }),
    movement(55, run(weave(4, 1, 5), hurdles(4, 1, 0, 5), hurdles(4, 1, 1, 0)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(52, gift(1, 3, 0), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(63, flank(3, 0, 0, 1), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'rotor' }),
    movement(63, narrows(0, 2, 2, 2), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'static' }),
    movement(73, run(flank(2, 4, 4, 3), drum(2, 4, 1, 4)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'rotor' }),
    movement(52, gift(4, 1, 4), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(81, run(drum(1, 3, 0, 5), flank(1, 3, 3, 0), flank(1, 3, 2, 1), flank(1, 3, 1, 2)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'rotor', rowSpacing: 105 })
]));

//  47. Moving holes.
//
//  Main: a floor that leaves while it is moving. Secondary: solid holes in the
//  same level, so the two have to be told apart at speed. Hard at: a hazard
//  with two independent states. Built around movement 12, where blinking holes
//  slide across the road and the row that is safe now is the row that was a
//  hole two rows ago.
LATE_LEVELS.push(late(47, [
    movement(53, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(61, holes(1, 2, 0), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'static' }),
    movement(56, run(fork(2, 3, 1), driftHoles(2, 3, 1)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(64, holes(3, 4, 2), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'blinker' }),
    movement(53, gift(4, 0, 3), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(64, drum(0, 2, 1, 4), { splitAfterLane: 1, gate: [ 0, 2 ], obstacles: 'slider' }),
    movement(64, driftHoles(2, 4, 5), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'slider' }),
    movement(56, run(weave(4, 1, 0), driftHoles(4, 1, 0), driftHoles(4, 1, 1)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(53, gift(1, 3, 1), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(64, vault(3, 0, 2, 2), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'static' }),
    movement(64, pinch(0, 2, 4, 3), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'blinker' }),
    movement(77, run(holes(2, 4, 4), drum(2, 4, 0, 5)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'blinker' }),
    movement(53, gift(4, 1, 5), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(82, run(holes(1, 3, 0), vault(1, 3, 0, 1), narrows(1, 3, 2, 2)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'blinker', rowSpacing: 105 })
]));

//  48. The false floor.
//
//  Main: deception and pressure at the same time, which no earlier level does -
//  up to now a trick has always been given room to be read. Secondary: the
//  tricks being ones the player already knows, so the difficulty is the
//  timing rather than the trick. Hard at: reading under load. Built around
//  movement 11, a barred doorway opening onto a blinking floor.
LATE_LEVELS.push(late(48, [
    movement(54, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(63, posts(1, 2, 2, 1), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'slider' }),
    movement(57, run(fork(2, 3, 2), holes(2, 3, 2)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(66, drum(3, 4, 0, 3), { splitAfterLane: 1, gate: [ 3, 4 ], gateSwap: true, obstacles: 'rotor' }),
    movement(54, gift(4, 0, 4), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(66, run(seam(2, 0), narrows(0, 2, 1, 5)), { splitAfterLane: 1, gate: [ 0, 2 ], gateSealed: 0, obstacles: 'static' }),
    movement(66, holes(2, 4, 0), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'blinker' }),
    movement(57, run(weave(4, 1, 1), holes(4, 1, 1), holes(4, 1, 2), holes(4, 1, 3)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(54, gift(1, 3, 2), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(66, pinch(3, 0, 0, 3), { splitAfterLane: 1, gate: [ 3, 0 ], gateSwap: true, obstacles: 'pulse' }),
    movement(75, run(chain(2, 2, 4), holes(0, 2, 4), holes(0, 2, 5), holes(0, 2, 0)), { splitAfterLane: 0, gate: [ 0, 2 ], gateSealed: 0, obstacles: 'blinker' }),
    movement(66, run(seam(4, 2), posts(2, 4, 1, 5)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'slider' }),
    movement(54, gift(4, 1, 0), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    movement(84, run(chain(3, 3, 1), holes(1, 3, 1), holes(1, 3, 2), holes(1, 3, 3)), { splitAfterLane: 1, gate: [ 1, 3 ], gateSealed: 0, obstacles: 'blinker', rowSpacing: 106 })
]));

//  49. Everything at once.
//
//  Main: mechanics combined rather than taken in turn - every movement here is
//  two things happening together. Secondary: none; there is no room for one.
//  Hard at: never having a movement that is only one problem. Built around the
//  fact that no movement in this level is a kind the game has a name for: each
//  is a pair.
LATE_LEVELS.push(late(49, [
    movement(54, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(66, run(fork(1, 2, 2), posts(1, 2, 2, 2)), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'slider' }),
    movement(66, run(vault(2, 3, 0, 3), narrows(2, 3, 4, 4)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(66, run(driftHoles(3, 4, 4), drum(3, 4, 1, 5)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'rotor' }),
    movement(54, gift(4, 0, 5), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(69, run(seam(2, 0), pinch(0, 2, 2, 0), fork(0, 2, 1)), { splitAfterLane: 1, gate: [ 0, 2 ], gateSwap: true, obstacles: 'pulse' }),
    movement(69, run(hurdles(2, 4, 1, 1), narrows(2, 4, 4, 2)), { splitAfterLane: 0, gate: [ 2, 4 ], obstacles: 'blinker' }),
    movement(66, run(fork(4, 1, 2), posts(4, 1, 2, 2), posts(4, 1, 3, 3)), { splitAfterLane: 1, gate: [ 4, 1 ], obstacles: 'slider' }),
    movement(54, gift(1, 3, 3), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(69, run(chain(0, 0, 4), flank(3, 0, 4, 4), flank(3, 0, 0, 5)), { splitAfterLane: 1, gate: [ 3, 0 ], gateSealed: 0, obstacles: 'rotor' }),
    movement(69, run(vault(0, 2, 4, 5), narrows(0, 2, 1, 0), holes(0, 2, 1), narrows(0, 2, 3, 2), narrows(0, 2, 0, 3), narrows(0, 2, 2, 4)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'blinker' }),
    movement(69, run(flank(2, 4, 0, 0), fork(2, 4, 1), flank(2, 4, 3, 2), drum(2, 4, 1, 3), flank(2, 4, 2, 4)), { splitAfterLane: 1, gate: [ 2, 4 ], obstacles: 'rotor' }),
    movement(54, run(gift(4, 1, 1), narrows(4, 1, 2, 2), narrows(4, 1, 0, 3)), { splitAfterLane: 0, gate: [ 4, 1 ], obstacles: 'static' }),
    movement(87, run(vault(1, 3, 0, 2), posts(1, 3, 3, 3), driftHoles(1, 3, 4), posts(1, 3, 0, 5), fork(1, 3, 0), posts(1, 3, 2, 1), posts(1, 3, 4, 2)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'slider', rowSpacing: 106 })
]));

//  50. DON'T FLOW.
//
//  The milestone. Main: everything, in a shape rather than a list. Secondary:
//  a genuine rest immediately before the end, which no other level in this band
//  gets - the finale is meant to be arrived at with score in hand and taken on
//  purpose, not survived on fumes.
//
//  Hard at: all of it. Built around the last two movements: a long open gift
//  with nothing in the way at all, and then fifty-eight rows that use every
//  mechanic the game has - a barred doorway, a floor that leaves, a turning
//  bar, a bar to jump, a single lane, and both colours in the outside lanes -
//  at the closest spacing anywhere in the game.
//
//  It is long, and it is meant to be. It is also the one level that gives the
//  player their score back before asking for it.
LATE_LEVELS.push(late(50, [
    //  An opening that could be level one, for exactly four rows.
    movement(51, opening(0, 1), { splitAfterLane: 0, gate: [ 0, 1 ] }),
    movement(65, run(fork(1, 2, 3), posts(1, 2, 3, 3)), { splitAfterLane: 1, gate: [ 1, 2 ], obstacles: 'slider' }),
    movement(69, run(vault(2, 3, 4, 4), narrows(2, 3, 0, 5)), { splitAfterLane: 0, gate: [ 2, 3 ], obstacles: 'static' }),
    movement(69, run(drum(3, 4, 1, 5), flank(3, 4, 0, 0)), { splitAfterLane: 1, gate: [ 3, 4 ], obstacles: 'rotor' }),
    movement(54, gift(4, 0, 0), { splitAfterLane: 0, gate: [ 4, 0 ] }),
    movement(72, run(chain(2, 2, 1), narrows(0, 2, 1, 1)), { splitAfterLane: 1, gate: [ 0, 2 ], gateSealed: 0, obstacles: 'blinker' }),
    movement(69, run(seam(4, 0), pinch(2, 4, 1, 2), seam(2, 2)), { splitAfterLane: 0, gate: [ 2, 4 ], drain: 12, obstacles: 'static' }),
    movement(69, run(fork(4, 1, 3), narrows(4, 1, 3, 3), narrows(4, 1, 4, 4)), { splitAfterLane: 1, gate: [ 4, 1 ], gateSwap: true, obstacles: 'pulse' }),
    movement(69, gift(1, 3, 4), { splitAfterLane: 0, gate: [ 1, 3 ] }),
    movement(72, run(flank(3, 0, 2, 5), fork(3, 0, 0), flank(3, 0, 4, 1)), { splitAfterLane: 1, gate: [ 3, 0 ], obstacles: 'rotor' }),
    movement(69, run(vault(0, 2, 1, 0), driftHoles(0, 2, 1), drum(0, 2, 4, 2)), { splitAfterLane: 0, gate: [ 0, 2 ], obstacles: 'slider' }),
    movement(72, run(chain(4, 4, 1), narrows(2, 4, 1, 1), narrows(2, 4, 2, 2)), { splitAfterLane: 1, gate: [ 2, 4 ], gateSealed: 0, obstacles: 'blinker' }),
    //  The rest. Open road and nothing else, so the finale is taken on purpose.
    movement(60, run(gift(4, 1, 2), breath()), { splitAfterLane: 0, gate: [ 4, 1 ] }),
    //  The finale. Every mechanic the game has, at the closest spacing in it.
    movement(87, run(drum(1, 3, 0, 3), flank(1, 3, 3, 4), driftHoles(1, 3, 5), flank(1, 3, 2, 0), fork(1, 3, 1), drum(1, 3, 4, 2), flank(1, 3, 0, 3)), { splitAfterLane: 1, gate: [ 1, 3 ], obstacles: 'rotor', rowSpacing: 106 })
]));
