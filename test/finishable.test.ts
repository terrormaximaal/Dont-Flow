import { describe, expect, it } from 'vitest';
import { DEFAULT_LANES } from '../src/game/config/constants';
import { buildLevel, LevelSpec, ObstacleSpec, OrbSpec } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';
import { gateSideAt } from '../src/game/systems/contact';
import { laneCenterX } from '../src/game/systems/Lanes';
import type { ColorId } from '../src/game/config/constants';

/**
 * Whether a level can actually be finished, colour and all.
 *
 * The suite already asks whether every row leaves a lane free, whether every
 * group of hurdles fits under an arc, and whether the free lanes join up. None
 * of those asks the question a player asks, which is whether there is a way
 * through that is also never the wrong colour - because a wrong-coloured orb
 * costs a life, and a level that cannot be played without hitting one is a
 * level that cannot be played.
 *
 * Colour is not a free choice: it is whichever half of the last doorway the
 * drop went through. So the state carried down the road is a pair - which lane,
 * and which colour - and a doorway splits every state into the two it can leave
 * as. Walked as a set rather than searched, which needs no backtracking: a row
 * either keeps a state or kills it, and nothing a row does can be undone later.
 */
function finishable (spec: LevelSpec): { ok: boolean; at: number; why: string }
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

    events.sort((a, b) => a.at - b.at);

    //  Before the first doorway the drop has no colour, which no orb matches.
    //  Written as null rather than as a colour so a level that puts orbs before
    //  its first gate is caught rather than quietly given one.
    let states = new Set<string>();

    for (let lane = 0; lane < lanes; lane++) { states.add(`${lane}|`); }

    const spread = (from: Set<string>) => {

        const out = new Set<string>();

        for (const state of from)
        {
            const [ lane, color ] = state.split('|');

            //  One lane either way between rows: the least the player could
            //  manage, so a level that survives this survives any faster
            //  reading of how far a drop travels between two rows.
            for (const step of [ -1, 0, 1 ])
            {
                const to = Number(lane) + step;

                if (to >= 0 && to < lanes) { out.add(`${to}|${color}`); }
            }
        }

        return out;
    };

    for (const event of events)
    {
        states = spread(states);

        if (event.kind === 'gate')
        {
            const next = new Set<string>();

            for (const state of states)
            {
                const lane = Number(state.split('|')[0]);
                const side = gateSideAt(laneCenterX(lane), event.splitAfterLane);

                next.add(`${lane}|${event.colors[side]}`);
            }

            states = next;

            continue;
        }

        if (event.kind === 'obstacles')
        {
            const blocked = new Set(event.rows.map((o) => o.lane));

            //  A row blocked all the way across is one that is jumped, and a
            //  jump carries the drop over it in whatever lane it was in.
            //  Whether the jumps themselves fit is hurdles.test's question.
            if (blocked.size >= lanes && event.rows.every((o) => o.profile !== 'full'))
            {
                continue;
            }

            states = new Set([ ...states ].filter((s) => !blocked.has(Number(s.split('|')[0]))));
        }
        else
        {
            //  A lane holding an orb of another colour is a lane that costs a
            //  life. Matching orbs are the point of the game, so they never
            //  close a lane - only the wrong ones do.
            const here = new Map(event.rows.map((o) => [ o.lane, o.color ]));

            states = new Set([ ...states ].filter((s) => {

                const [ lane, color ] = s.split('|');
                const orb = here.get(Number(lane));

                return orb === undefined || orb === color;

            }));
        }

        if (states.size === 0)
        {
            return { ok: false, at: event.at, why: event.kind };
        }
    }

    return { ok: true, at: -1, why: '' };
}

describe('finishing a level without being charged for it', () => {

    //  The headline claim the game makes about its own levels. Every other
    //  guard covers one rule; this one covers all of them at once, which is the
    //  only version of the question a player would recognise.
    it('is possible on every shipped level', () => {

        for (const spec of LEVELS)
        {
            const result = finishable(spec);

            expect(result.ok, `${spec.name}: no way through at ${result.at} (${result.why})`).toBe(true);
        }

    });

    //  The guard that the walk really is a walk. Both doorways of the first
    //  section hand out red, and every lane of the row after it holds a blue
    //  orb: there is no lane to be in and no colour to be. That is exactly the
    //  shape a lane-only check waves through, because every lane is "free".
    it('rejects a level whose every lane wants a colour no doorway hands out', () => {

        const first = LEVELS[0].sections[0];

        const impossible: LevelSpec = {
            ...LEVELS[0],
            sections: [
                { ...first, gate: [ 0, 0 ], rows: [ '22' ] },
                ...LEVELS[0].sections.slice(1)
            ]
        };

        const result = finishable(impossible);

        expect(result.ok, 'a level nobody could finish').toBe(false);
        expect(result.why).toBe('orbs');

    });

    //  And that it is not simply rejecting everything: the same level with the
    //  doorway handing out the colour those orbs are is fine.
    it('accepts the same level once a doorway hands that colour out', () => {

        const first = LEVELS[0].sections[0];

        const possible: LevelSpec = {
            ...LEVELS[0],
            sections: [
                { ...first, gate: [ 1, 1 ], rows: [ '22' ] },
                ...LEVELS[0].sections.slice(1)
            ]
        };

        expect(finishable(possible).ok).toBe(true);

    });

});
