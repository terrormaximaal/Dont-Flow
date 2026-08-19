import { SectionSpec } from './level';

//  The vocabulary levels 21 to 50 are written in.
//
//  A note on the middle lane, because it was nearly the undoing of all thirty.
//  Written first, every motif here reached for a single orb in the middle lane
//  as its resting row - it is the easy shape, it always leaves a way through,
//  and it never breaks a rule. Measured afterwards, one row in three across the
//  whole band was that shape, and the thirty levels shared 74% of their rows
//  where the first twenty share 42%. Thirty levels that all mostly ask the
//  player to sit in the middle are one level thirty times over, whatever the
//  design notes above each of them say. The motifs below use the outside lanes
//  and both-lanes-at-once rows in its place, and the middle is a punctuation
//  mark rather than the default.
//
//  The first twenty levels spell every row out by hand, and at their length
//  that is the right way to write them: a level is six to fourteen sections of
//  about forty rows, and the rows are visible on the page. The late levels are
//  half as long again on top of that, and spelling out thirty of them would be
//  six thousand lines in which no reader could see a design.
//
//  So the rows are still authored - every motif here was chosen and checked -
//  but they are named, and a level is written as the sequence of movements it
//  is made of. What that buys is not brevity. It is that the shape of a level
//  can be read in one screen, which is the only way thirty of them can be kept
//  different from each other on purpose rather than by accident.
//
//  Nothing here generates anything. There is no randomness and no procedural
//  fill: a movement is a fixed motif repeated a stated number of times, which
//  is exactly what the first twenty levels do by hand and is why they read as
//  written rather than as filled.

/**
 * Which written shape of a movement this level plays.
 *
 * Every motif below exists in more than one form, and which one a movement uses
 * comes from where its level and the movement sit - so two levels reaching for
 * the same idea rarely lay down the same rows, and a level does not repeat its
 * own shape when it returns to an idea.
 *
 * This was not in the first version and it should have been. Measured across
 * the band, thirty levels drawing on one shape per movement shared 38% of their
 * eight-row runs where the first twenty share 14%: the design notes above each
 * level were different and the road under them was not.
 */
export function pick (variant: number, shapes: string[][]): string[]
{
    return shapes[((variant % shapes.length) + shapes.length) % shapes.length];
}

/**
 * A motif, laid down as many times as the movement needs.
 *
 * Trimmed to an exact row count rather than a whole number of repeats, so a
 * section can be tuned to the second without its motif having to divide into
 * it. The motif is walked round, so the pattern never breaks at the join.
 */
export function beat (motif: string[], rows: number): string[]
{
    return Array.from({ length: rows }, (_, i) => motif[i % motif.length]);
}

/** Movements laid end to end, for a section built of more than one idea. */
export function run (...parts: string[][]): string[]
{
    return parts.flat();
}

//  ---------------------------------------------------------------------------
//  Colour, in the two shades a section's doorway offers.
//
//  Every motif takes its orb colours as the pair the gate ahead of it hands
//  out, which is what keeps a level finishable: a row can only ever ask for a
//  colour the player has just been given the chance to take. Barrier colours
//  are free - a barrier is a thing to avoid, not a thing to match - and are
//  drawn from wherever the level wants them.
//  ---------------------------------------------------------------------------

/** An orb of palette index `i`, as the character a row spells it with. */
export const orb = (i: number): string => String(i + 1);

/** A full-height barrier, which has to be gone round. */
export const wall = (i: number): string => 'abcde'[i];

/** The same barrier low enough to clear from above. */
export const hurdle = (i: number): string => 'ABCDE'[i];

/** A hole in the road. Jumped, never steered around. */
export const HOLE = '0';

//  ---------------------------------------------------------------------------
//  The movements.
//
//  Each takes the colours it is played in and returns a motif. They are grouped
//  by what they ask of the player rather than by what they look like, because
//  what a level needs from this list is "something that tests timing", not
//  "something with bars in it".
//  ---------------------------------------------------------------------------

/**
 * Orbs alternating across the lanes. Reading colour, nothing in the way.
 *
 * In three written shapes rather than one - see `pick` above. This is the
 * highest-volume movement in the band and a single shape for it put the same
 * eight-row run into a dozen different levels.
 */
export function weave (a: number, b: number, v = 0): string[]
{
    return pick(v, [
        [
            `${orb(a)}..`, `..${orb(b)}`, `${orb(a)}.${orb(b)}`, `.${orb(a)}.`,
            `..${orb(a)}`, `${orb(b)}..`, `${orb(b)}.${orb(a)}`, `..${orb(b)}`
        ],
        [
            `${orb(a)}.${orb(b)}`, `..${orb(a)}`, `..${orb(b)}`, `${orb(b)}..`,
            `.${orb(a)}.`, `${orb(a)}.${orb(b)}`, `${orb(a)}..`, `..${orb(a)}`
        ],
        [
            `..${orb(b)}`, `${orb(b)}.${orb(a)}`, `${orb(a)}..`, `${orb(a)}..`,
            `.${orb(b)}.`, `..${orb(a)}`, `${orb(b)}.${orb(a)}`, `${orb(b)}..`
        ]
    ]);
}

/**
 * A long line of one colour, for a combo worth protecting.
 *
 * Not entirely one colour. A doorway that hands out a colour nothing behind it
 * ever wants is a doorway worth nothing, and the game holds every gate to
 * offering two sides worth taking - so the second colour runs through this at a
 * quarter of the first, which is enough to make the door real and not enough to
 * break the line.
 */
export function chain (a: number, b: number, v = 0): string[]
{
    return pick(v, [
        [ `${orb(a)}..`, `${orb(a)}..`, `${orb(a)}.${orb(b)}`, `.${orb(a)}.`, `..${orb(a)}`, `..${orb(a)}`, `${orb(b)}.${orb(a)}`, `..${orb(a)}` ],
        [ `..${orb(a)}`, `${orb(b)}.${orb(a)}`, `..${orb(a)}`, `..${orb(a)}`, `.${orb(a)}.`, `${orb(a)}..`, `${orb(a)}.${orb(b)}`, `${orb(a)}..` ],
        [ `.${orb(a)}.`, `${orb(a)}..`, `${orb(a)}.${orb(b)}`, `..${orb(a)}`, `${orb(a)}..`, `.${orb(a)}.`, `${orb(b)}.${orb(a)}`, `..${orb(a)}` ]
    ]);
}

/** Both colours side by side every row: a choice taken at speed, over and over. */
export function fork (a: number, b: number, v = 0): string[]
{
    return pick(v, [
        [ `${orb(a)}.${orb(b)}`, `${orb(b)}.${orb(a)}`, `.${orb(a)}.`, `${orb(a)}.${orb(b)}`, `${orb(b)}.${orb(a)}`, `..${orb(b)}` ],
        [ `${orb(b)}.${orb(a)}`, `${orb(a)}..`, `${orb(a)}.${orb(b)}`, `..${orb(b)}`, `${orb(b)}.${orb(a)}`, `.${orb(b)}.` ],
        [ `${orb(a)}.${orb(b)}`, `.${orb(b)}.`, `${orb(b)}.${orb(a)}`, `${orb(b)}..`, `${orb(a)}.${orb(b)}`, `..${orb(a)}` ]
    ]);
}

/** Barriers one at a time, drifting across the road. */
export function posts (a: number, b: number, w: number, v = 0): string[]
{
    return pick(v, [
        [ `${wall(w)}..`, `..${orb(a)}`, `.${wall(w)}.`, `${orb(a)}.${orb(b)}`, `..${wall(w)}`, `${orb(b)}..` ],
        [ `..${wall(w)}`, `${orb(a)}..`, `.${wall(w)}.`, `${orb(b)}.${orb(a)}`, `${wall(w)}..`, `..${orb(b)}` ],
        [ `.${wall(w)}.`, `${orb(a)}.${orb(b)}`, `${wall(w)}..`, `..${orb(b)}`, `..${wall(w)}`, `${orb(a)}..` ]
    ]);
}

/** Two barriers with the middle lane between them. Precision, held. */
export function pinch (a: number, b: number, w: number, v = 0): string[]
{
    return pick(v, [
        [ `${wall(w)}.${wall(w)}`, `.${orb(a)}.`, `${wall(w)}.${wall(w)}`, `.${orb(b)}.` ],
        [ `${wall(w)}.${wall(w)}`, `.${orb(b)}.`, `.${orb(a)}.`, `${wall(w)}.${wall(w)}` ],
        [ `.${orb(a)}.`, `${wall(w)}.${wall(w)}`, `.${orb(b)}.`, `${wall(w)}.${wall(w)}`, `.${orb(a)}.`, `.${orb(b)}.` ]
    ]);
}

/**
 * One lane open, and it moves.
 *
 * The free lane walks one step at a time and never further, so the road can be
 * narrowed to a single lane without the path ever breaking - a jump of two
 * lanes between consecutive rows is not a hard section, it is an impossible one.
 */
export function narrows (a: number, b: number, w: number, v = 0): string[]
{
    return pick(v, [
        [
            `${wall(w)}.${wall(w)}`, `.${orb(a)}.`,
            `.${wall(w)}${wall(w)}`, `${orb(b)}..`,
            `${wall(w)}.${wall(w)}`, `.${orb(b)}.`,
            `${wall(w)}${wall(w)}.`, `..${orb(a)}`
        ],
        [
            `${wall(w)}.${wall(w)}`, `.${orb(a)}.`,
            `${wall(w)}${wall(w)}.`, `..${orb(b)}`,
            `${wall(w)}.${wall(w)}`, `.${orb(b)}.`,
            `.${wall(w)}${wall(w)}`, `${orb(a)}..`
        ],
        [
            `${wall(w)}.${wall(w)}`, `.${orb(b)}.`,
            `.${wall(w)}${wall(w)}`, `${orb(a)}..`,
            `${wall(w)}.${wall(w)}`, `.${orb(a)}.`,
            `${wall(w)}${wall(w)}.`, `..${orb(b)}`
        ],
        [
            `${wall(w)}.${wall(w)}`, `.${orb(a)}.`,
            `${wall(w)}.${wall(w)}`, `..${orb(b)}`,
            `.${wall(w)}${wall(w)}`, `${orb(b)}..`,
            `${wall(w)}.${wall(w)}`, `.${orb(a)}.`
        ],
        [
            `${wall(w)}.${wall(w)}`, `.${orb(b)}.`,
            `${wall(w)}${wall(w)}.`, `..${orb(a)}`,
            `${wall(w)}.${wall(w)}`, `.${orb(a)}.`,
            `${wall(w)}.${wall(w)}`, `..${orb(b)}`
        ],
        [
            `${wall(w)}.${wall(w)}`, `.${orb(a)}.`,
            `.${wall(w)}${wall(w)}`, `${orb(b)}..`,
            `.${wall(w)}${wall(w)}`, `${orb(a)}..`,
            `${wall(w)}.${wall(w)}`, `.${orb(b)}.`
        ]
    ]);
}

/** A row that can only be cleared from above, on a steady beat. */
export function hurdles (a: number, b: number, h: number, v = 0): string[]
{
    const bar = `${hurdle(h)}${hurdle(h)}${hurdle(h)}`;

    return pick(v, [
        [ bar, `${orb(a)}.${orb(b)}`, `..${orb(b)}`, `${orb(a)}..`, `${orb(b)}.${orb(a)}`, `..${orb(a)}`, `.${orb(a)}.` ],
        [ bar, `..${orb(a)}`, `${orb(b)}.${orb(a)}`, `..${orb(b)}`, `${orb(a)}..`, `${orb(a)}.${orb(b)}`, `${orb(b)}..` ]
    ]);
}

/** The same, but it is the floor that is missing rather than a bar in the way. */
export function holes (a: number, b: number, v = 0): string[]
{
    return pick(v, [
        [ `${HOLE}${HOLE}${HOLE}`, `${orb(b)}.${orb(a)}`, `..${orb(b)}`, `${orb(a)}..`, `${orb(a)}.${orb(b)}`, `..${orb(a)}`, `.${orb(b)}.` ],
        [ `${HOLE}${HOLE}${HOLE}`, `${orb(a)}..`, `${orb(a)}.${orb(b)}`, `..${orb(a)}`, `${orb(b)}..`, `${orb(b)}.${orb(a)}`, `..${orb(b)}` ]
    ]);
}

/**
 * Two bars back to back, then road.
 *
 * A pair rather than a run. Written first as a bar every third row, which
 * looked like a rhythm and was in fact one unbroken group: consecutive bars
 * three rows apart are all inside a single arc's reach, so the whole movement
 * read to the reach guard as one jump forty rows long. A pair close enough to
 * take in one arc, with real road after it, is the thing that was meant.
 */
export function vault (a: number, b: number, h: number, v = 0): string[]
{
    const bar = `${hurdle(h)}${hurdle(h)}${hurdle(h)}`;

    return pick(v, [
        [ bar, bar, `..${orb(b)}`, `${orb(a)}.${orb(b)}`, `${orb(b)}..`, `..${orb(a)}`, `${orb(b)}.${orb(a)}`, `.${orb(a)}.` ],
        [ bar, bar, `${orb(a)}..`, `${orb(b)}.${orb(a)}`, `..${orb(b)}`, `${orb(a)}..`, `${orb(a)}.${orb(b)}`, `..${orb(a)}` ]
    ]);
}

/**
 * Barriers in the outside lanes only, one to a row.
 *
 * The shape a turning bar has to be written in: a rotor reaches too far across
 * the road to sit in the middle lane, and two of them on one row would leave
 * nothing between. Everything else can use it too, which is why it is here
 * rather than in the levels that needed it.
 */
export function flank (a: number, b: number, w: number, v = 0): string[]
{
    return pick(v, [
        [ `${wall(w)}..`, `..${orb(a)}`, `.${orb(b)}.`, `..${wall(w)}`, `${orb(b)}..`, `${orb(a)}..` ],
        [ `..${wall(w)}`, `${orb(b)}..`, `${orb(a)}..`, `${wall(w)}..`, `..${orb(a)}`, `.${orb(b)}.` ],
        [ `${wall(w)}..`, `.${orb(b)}.`, `..${orb(b)}`, `..${wall(w)}`, `${orb(a)}..`, `.${orb(a)}.` ]
    ]);
}

/**
 * One hole in the road, walking across it.
 *
 * A full row of holes is jumped; this is steered around. It exists because a
 * moving hole has to be a single hole - a row of three that slide would close
 * the lane between them, which is the same rule that keeps sliding walls apart.
 */
export function driftHoles (a: number, b: number, v = 0): string[]
{
    return pick(v, [
        [ `${HOLE}..`, `..${orb(a)}`, `.${HOLE}.`, `${orb(a)}.${orb(b)}`, `..${HOLE}`, `${orb(b)}..` ],
        [ `..${HOLE}`, `${orb(b)}..`, `.${HOLE}.`, `${orb(b)}.${orb(a)}`, `${HOLE}..`, `..${orb(a)}` ]
    ]);
}

/**
 * The first movement of a level, where each lane may only hold the colour of
 * the doorway it sits behind.
 *
 * The opening is the one place the game explains itself: a lane carrying the
 * colour of the other doorway would be teaching that the gate does not mean
 * what it says.
 */
export function opening (a: number, b: number): string[]
{
    return [ `${orb(a)}..`, `..${orb(b)}`, `${orb(a)}.${orb(b)}`, `.${orb(b)}.`, `${orb(a)}..`, `..${orb(b)}`, `${orb(a)}.${orb(b)}`, `..${orb(b)}` ];
}

/** Barriers on the outside, orbs threaded between them. Rhythm under pressure. */
export function drum (a: number, b: number, w: number, v = 0): string[]
{
    return pick(v, [
        [ `.${orb(a)}.`, `${wall(w)}..`, `..${orb(b)}`, `.${orb(a)}.`, `..${wall(w)}`, `${orb(b)}..` ],
        [ `${orb(a)}.${orb(b)}`, `..${wall(w)}`, `${orb(b)}..`, `..${orb(a)}`, `${wall(w)}..`, `..${orb(b)}` ],
        [ `..${orb(a)}`, `${wall(w)}..`, `${orb(b)}.${orb(a)}`, `.${orb(b)}.`, `..${wall(w)}`, `${orb(a)}..` ]
    ]);
}

/**
 * Nothing but orbs, thick on the road.
 *
 * Every level that asks a lot has one of these before it asks. A section a
 * player can bank score in is what makes the next one a risk they can take
 * rather than one they simply survive.
 */
export function gift (a: number, b: number, v = 0): string[]
{
    return pick(v, [
        [ `${orb(a)}.${orb(b)}`, `.${orb(a)}.`, `${orb(b)}.${orb(a)}`, `${orb(a)}.${orb(b)}`, `.${orb(b)}.`, `${orb(a)}.${orb(b)}` ],
        [ `${orb(b)}.${orb(a)}`, `${orb(a)}.${orb(b)}`, `.${orb(b)}.`, `${orb(b)}.${orb(a)}`, `${orb(a)}.${orb(b)}`, `.${orb(a)}.` ],
        [ `.${orb(a)}.`, `${orb(a)}.${orb(b)}`, `${orb(b)}.${orb(a)}`, `.${orb(b)}.`, `${orb(a)}.${orb(b)}`, `${orb(b)}.${orb(a)}` ]
    ]);
}

/**
 * One lane paved with orbs, the others empty.
 *
 * The risk half of a route decision: everything worth having is in one lane,
 * and whatever is put in that lane by the movement after it is what the choice
 * costs. Meaningless on its own - it is always laid against something.
 */
export function seam (a: number, lane: 0 | 1 | 2): string[]
{
    const at = (row: string[]): string => row.join('');

    return [ 0, 1, 2, 3 ].map(() => {
        const row = [ '.', '.', '.' ];
        row[lane] = orb(a);
        return at(row);
    });
}

/** An empty stretch. Used to let a twist land, never to make a level longer. */
export function breath (): string[]
{
    return [ '...', '...' ];
}

/**
 * A section, with its rows counted out.
 *
 * Takes the movement and the number of rows to lay it over, so a level's shape
 * is written as "this idea, for this long" rather than as a wall of strings.
 */
export function movement (
    rows: number,
    motif: string[],
    section: Omit<SectionSpec, 'rows'>
): SectionSpec
{
    return { ...section, rows: beat(motif, rows) };
}
