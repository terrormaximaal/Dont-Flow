import { ColorId, DEFAULT_LANES } from './constants';
import { LevelSpec, ORB_ROW_SPACING, SectionSpec } from './level';

//  What a section asks of the player, and what it gives back.
//
//  Every other file here describes what a level *contains*. This one measures
//  what it is *like*, which is the thing the design is actually written in:
//  "the finale is the hardest part", "there is somewhere to breathe after the
//  gauntlet", "one of these two routes pays more because it costs more". Those
//  are claims about shape, and until they can be measured they can only be
//  eyeballed - which is how a difficulty curve quietly inverts.
//
//  Pure, and derived from the authored spec rather than from the built course,
//  so a section can be weighed without expanding a level.

const ORB_CHARS = '12345';
const WALL_CHARS = 'abcde';
const HURDLE_CHARS = 'ABCDE';
const GAP_CHAR = '0';

export interface SectionShape
{
    /** How many orbs are on offer, whatever colour is carried. */
    orbs: number;

    /**
     * How many of them the drop can actually take, given a colour.
     *
     * The number that matters. A section thick with orbs the player cannot
     * match is not a generous section, it is a minefield.
     */
    matching: number;

    /** Things that cost score to touch: walls, hurdles and holes. */
    hazards: number;

    /** Score the road itself takes, over the whole section. */
    drain: number;

    /** How far the section runs, in track pixels. */
    span: number;

    /**
     * Hazards per thousand pixels. The one figure that compares two sections
     * of different lengths.
     */
    pressure: number;

    /**
     * Matchable orbs per thousand pixels, less what the road takes back.
     *
     * What a section is worth per unit of road. Negative is possible and means
     * exactly what it says: a stretch that costs more than it offers.
     */
    yield: number;
}

/** How far apart this section's rows sit. */
function spacingOf (spec: LevelSpec, section: SectionSpec): number
{
    return section.rowSpacing ?? spec.rowSpacing ?? ORB_ROW_SPACING;
}

/**
 * What one section asks and gives, for a drop carrying `color`.
 *
 * @param color The colour taken at this section's gate. Left out, the section
 *              is weighed as if every orb matched - which is the right question
 *              for "how generous is this stretch", and the wrong one for "what
 *              will this player get out of it".
 */
export function shapeOf (spec: LevelSpec, index: number, color?: ColorId): SectionShape
{
    const section = spec.sections[index];
    const span = section.rows.length * spacingOf(spec, section);

    let orbs = 0;
    let matching = 0;
    let hazards = 0;

    for (const row of section.rows)
    {
        for (const character of row)
        {
            const orb = ORB_CHARS.indexOf(character);

            if (orb >= 0)
            {
                orbs += 1;

                if (color === undefined || spec.palette[orb] === color)
                {
                    matching += 1;
                }

                continue;
            }

            if (WALL_CHARS.includes(character)
                || HURDLE_CHARS.includes(character)
                || character === GAP_CHAR)
            {
                hazards += 1;
            }
        }
    }

    const drain = ((section.drain ?? 0) * span) / 1000;

    return {
        orbs,
        matching,
        hazards,
        drain,
        span,
        pressure: (hazards * 1000) / span,
        yield: ((matching - drain) * 1000) / span
    };
}

/**
 * The two ways through a section: one per half of the gate in front of it.
 *
 * A gate is the only choice this game ever asks, so a route is a gate whose two
 * colours lead to materially different stretches of the same road. Naming the
 * halves rather than leaving them as an array, because which is which is the
 * whole point.
 */
export interface Route
{
    /** The half that pays less and costs less. */
    safe: SectionShape;

    /** The half that pays more, or costs more, or both. */
    bold: SectionShape;

    /** How much more the bold half is worth per thousand pixels. */
    reward: number;
}

/**
 * How a section's gate splits, weighed both ways.
 *
 * Returns null where the two halves come to the same thing, which is most of
 * them and is not a fault - a level of nothing but decisions is as flat as a
 * level of none.
 */
export function routeOf (spec: LevelSpec, index: number): Route | null
{
    const section = spec.sections[index];

    const [ first, second ] = section.gate.map(
        (at) => shapeOf(spec, index, spec.palette[at])
    );

    if (first.yield === second.yield)
    {
        return null;
    }

    const bold = first.yield > second.yield ? first : second;
    const safe = first.yield > second.yield ? second : first;

    return { safe, bold, reward: bold.yield - safe.yield };
}

/**
 * Whether a section is somewhere to get a run back.
 *
 * Not a flag on the spec. A recovery section is one that behaves like one, and
 * making it a property of the rows rather than a label means a section cannot
 * claim to be a rest while being full of walls.
 */
export function isRecovery (spec: LevelSpec, index: number): boolean
{
    const shape = shapeOf(spec, index);

    return shape.pressure <= RECOVERY_PRESSURE
        && shape.drain === 0
        && shape.orbs / (spec.lanes ?? DEFAULT_LANES) >= RECOVERY_ORB_ROWS;
}

/**
 * The most a stretch can have in the way and still count as a rest, per
 * thousand pixels, and the fewest orbs it can carry per lane.
 *
 * A rest with nothing on it is not a rest, it is a pause - the point of the
 * stretch after a hard one is to give a run its score back, and a run cannot
 * recover from empty road.
 *
 * Five rather than six because six was wrong: it turned down sections with
 * seventeen orbs and nothing at all in the way, which are plainly places to
 * recover whatever a threshold says about them.
 */
export const RECOVERY_PRESSURE = 0.5;
export const RECOVERY_ORB_ROWS = 5;

/**
 * Whether a level puts anything in the player's way at all.
 *
 * The first levels teach lanes and colour on empty road. Rules about managing
 * pressure - where the rests go, whether the back half leans harder - are not
 * lenient towards those levels, they are meaningless for them, and a guard that
 * pretends otherwise is measuring nothing.
 */
export function hasPressure (spec: LevelSpec): boolean
{
    return spec.sections.some((_, at) => shapeOf(spec, at).hazards > 0);
}
