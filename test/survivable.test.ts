import { describe, expect, it } from 'vitest';
import {
    DEFAULT_LANES,
    SCORE_DEATH_BELOW,
    SCORE_PER_ORB,
    SCORE_START
} from '../src/game/config/constants';
import { buildLevel, drainAt, LevelSpec, ObstacleSpec, OrbSpec } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';
import type { ColorId } from '../src/game/config/constants';

/**
 * Whether a level can be finished with the score still above zero.
 *
 * The suite already asks whether every row leaves a lane free, whether the free
 * lanes join up, whether every group of hurdles fits under an arc, and whether
 * there is a way through that is never the wrong colour. None of them asks the
 * question the game's own losing condition asks, which is whether the score
 * survives the trip.
 *
 * It is not the same question. The score starts at zero and a run ends the
 * moment it goes below it, so a stretch of road that charges for being on it
 * is lethal on its own if it arrives before the player has banked anything -
 * and a level can be perfectly walkable, perfectly readable and still
 * unfinishable for that reason alone. Four of the late levels charge for a
 * stretch, one of them twice, and nothing here was checking them.
 *
 * Walked as the best score reachable in each state rather than as a search.
 * A state is a lane and a colour, exactly as in finishable.test - the colour is
 * not a free choice, it is whichever half of the last doorway was taken - and
 * the value carried alongside it is the most score a player could have arrived
 * in that state with.
 *
 * Deliberately conservative in the player's favour nowhere:
 *
 *   - orbs count at their base worth, never at a combo multiplier, so a level
 *     that only survives on a long unbroken streak is reported as failing;
 *   - and `take` scales what an orb is worth, so the same walk can ask what
 *     happens to somebody who is only catching a third of what is there;
 *   - the drain is charged in full over every pixel of every zone;
 *   - nothing is assumed about skill beyond taking the best available lane,
 *     which the walk is choosing anyway.
 *
 * What it does assume is that the player never takes a wrong colour, which
 * finishable.test proves is possible on every level.
 */
function bestScoreThrough (
    spec: LevelSpec,
    take = 1
): { ok: boolean; low: number; at: number; final: number }
{
    const lanes = spec.lanes ?? DEFAULT_LANES;
    const level = buildLevel(spec);

    type Event =
        | { kind: 'obstacles'; at: number; rows: ObstacleSpec[] }
        | { kind: 'orbs'; at: number; rows: OrbSpec[] }
        | { kind: 'gate'; at: number; colors: [ ColorId, ColorId ]; splitAfterLane: 0 | 1 };

    const events: Event[] = [];

    const group = <T extends { distance: number }> (all: T[]) => {

        const rows = new Map<number, T[]>();

        for (const one of all) { rows.set(one.distance, [ ...(rows.get(one.distance) ?? []), one ]); }

        return rows;
    };

    for (const [ at, rows ] of group(level.obstacles)) { events.push({ kind: 'obstacles', at, rows }); }
    for (const [ at, rows ] of group(level.orbs)) { events.push({ kind: 'orbs', at, rows }); }

    for (const gate of level.gates)
    {
        events.push({ kind: 'gate', at: gate.distance, colors: gate.colors, splitAfterLane: gate.splitAfterLane });
    }

    //  Gates before rows at the same distance, so a doorway is always taken
    //  before the orbs behind it are read.
    const order = { gate: 0, obstacles: 1, orbs: 2 };

    events.sort((a, b) => (a.at - b.at) || (order[a.kind] - order[b.kind]));

    /** Best score arriving in each `lane|colour` state. */
    let states = new Map<string, number>();

    for (let lane = 0; lane < lanes; lane++) { states.set(`${lane}|`, SCORE_START); }

    let low = SCORE_START;
    let lowAt = 0;
    let previous = 0;

    /**
     * The toll for crossing from one event to the next.
     *
     * Sampled rather than integrated, because a zone can start and end between
     * two rows and a single reading at either end would miss it entirely.
     */
    const tollBetween = (from: number, to: number, color: ColorId | null): number => {

        const step = 25;
        let paid = 0;

        for (let d = from; d < to; d += step)
        {
            const span = Math.min(step, to - d);

            paid += (drainAt(level.hazards, d, color) * span) / 1000;
        }

        return paid;
    };

    for (const event of events)
    {
        //  Everything pays its way to here first.
        const moved = new Map<string, number>();

        for (const [ state, score ] of states)
        {
            const color = (state.split('|')[1] || null) as ColorId | null;

            moved.set(state, score - tollBetween(previous, event.at, color));
        }

        states = moved;
        previous = event.at;

        if (event.kind === 'gate')
        {
            const next = new Map<string, number>();

            for (const [ state, score ] of states)
            {
                const lane = Number(state.split('|')[0]);
                const side = lane <= event.splitAfterLane ? 0 : 1;
                const key = `${lane}|${event.colors[side]}`;

                next.set(key, Math.max(next.get(key) ?? -Infinity, score));
            }

            states = next;

            continue;
        }

        //  One lane either way between rows, the same reach the path guard uses.
        const spread = new Map<string, number>();

        for (const [ state, score ] of states)
        {
            const [ lane, color ] = state.split('|');

            for (const step of [ -1, 0, 1 ])
            {
                const to = Number(lane) + step;

                if (to < 0 || to >= lanes) { continue; }

                const key = `${to}|${color}`;

                spread.set(key, Math.max(spread.get(key) ?? -Infinity, score));
            }
        }

        if (event.kind === 'obstacles')
        {
            const blocked = new Set(event.rows.map((o) => o.lane));

            //  A row blocked all the way across is jumped, and a jump carries
            //  the drop over in whatever lane it was in - so it narrows nothing.
            const jumped = blocked.size >= lanes && event.rows.every((o) => o.profile !== 'full');

            states = jumped
                ? spread
                : new Map([ ...spread ].filter(([ key ]) => !blocked.has(Number(key.split('|')[0]))));
        }
        else
        {
            const next = new Map<string, number>();

            for (const [ state, score ] of spread)
            {
                const [ lane, color ] = state.split('|');
                const orb = event.rows.find((o) => o.lane === Number(lane));

                //  A wrong colour is never taken - finishable.test proves a way
                //  through without one exists - so an orb either pays or is
                //  stepped around, and stepping around it is what the other
                //  lanes in this same spread are already doing.
                if (orb !== undefined && orb.color !== color) { continue; }

                next.set(state, score + (orb === undefined ? 0 : SCORE_PER_ORB * take));
            }

            states = next;
        }

        if (states.size === 0)
        {
            return { ok: false, low, at: event.at, final: -Infinity };
        }

        const best = Math.max(...states.values());

        if (best < low) { low = best; lowAt = event.at; }
    }

    //  And the run home, which can be inside a zone like any other stretch.
    let final = -Infinity;

    for (const [ state, score ] of states)
    {
        const color = (state.split('|')[1] || null) as ColorId | null;

        final = Math.max(final, score - tollBetween(previous, level.finishDistance, color));
    }

    return { ok: low >= SCORE_DEATH_BELOW && final >= SCORE_DEATH_BELOW, low, at: lowAt, final };
}

describe('finishing a level with the score still alive', () => {

    //  The losing condition, asked of the levels rather than of the systems.
    it('is possible on every shipped level', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            const walk = bestScoreThrough(spec);

            expect(
                walk.low,
                `level ${index + 1} bottoms out at ${walk.low} around ${walk.at}`
            ).toBeGreaterThanOrEqual(SCORE_DEATH_BELOW);

            expect(walk.final, `level ${index + 1} finishes on ${walk.final}`)
                .toBeGreaterThan(SCORE_DEATH_BELOW);
        }

    });

    //  And with room, not by a point. A level that can only be finished by
    //  taking every single orb on the best line through it is a level whose
    //  losing condition is a tightrope rather than a floor.
    it('leaves margin rather than finishing on the last point', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            const walk = bestScoreThrough(spec);

            expect(walk.final, `level ${index + 1}`).toBeGreaterThan(SCORE_PER_ORB * 10);
        }

    });

    //  And by somebody who is not playing especially well.
    //
    //  The walk above takes the best line through a level, and "a perfect
    //  player survives" is a weak thing to have proved about a losing
    //  condition. This asks the same question of a player catching a third of
    //  what is on the road - which is the player a toll actually threatens,
    //  because the toll is charged in full either way.
    it('is possible while catching only a third of what is on the road', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            const walk = bestScoreThrough(spec, 1 / 3);

            expect(
                walk.low,
                `level ${index + 1} bottoms out at ${walk.low.toFixed(0)} around ${walk.at}`
            ).toBeGreaterThanOrEqual(SCORE_DEATH_BELOW);

            expect(walk.final, `level ${index + 1} finishes on ${walk.final.toFixed(0)}`)
                .toBeGreaterThan(SCORE_DEATH_BELOW);
        }

    });

    //  The guard has teeth: a level that charges for a stretch before it has
    //  handed out anything to pay with is caught.
    it('catches a toll charged before there is anything to pay it with', () => {

        const cruel: LevelSpec = {
            ...LEVELS[20],
            sections: LEVELS[20].sections.map((section, at) => (
                at === 0 ? { ...section, drain: 400 } : section
            ))
        };

        expect(bestScoreThrough(cruel).ok, 'a level that drains from its first movement').toBe(false);

    });

});
