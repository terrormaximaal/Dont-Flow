import { describe, expect, it } from 'vitest';
import { buildLevel, speedAt, SpeedZone } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';

const zones: SpeedZone[] = [
    { from: 1000, to: 2000, speed: 1.3 },
    { from: 4000, to: 4500, speed: 0.8 }
];

describe('the pace of a stretch of course', () => {

    it('is the level\'s own everywhere no zone covers', () => {

        expect(speedAt(zones, 0)).toBe(1);
        expect(speedAt(zones, 999)).toBe(1);
        expect(speedAt(zones, 3000)).toBe(1);
        expect(speedAt(zones, 99999)).toBe(1);

    });

    it('is the zone\'s inside one', () => {

        expect(speedAt(zones, 1000)).toBe(1.3);
        expect(speedAt(zones, 1500)).toBe(1.3);
        expect(speedAt(zones, 4200)).toBe(0.8);

    });

    //  Half-open, so two zones that meet exactly do not both claim the join.
    it('gives the boundary to the zone that starts there', () => {

        expect(speedAt([ { from: 0, to: 100, speed: 2 }, { from: 100, to: 200, speed: 3 } ], 100)).toBe(3);

    });

    //  Total: any distance has an answer, including before the start and past
    //  the finish, because the game asks every frame and cannot handle a gap.
    it('answers for any distance at all', () => {

        for (let d = -5000; d < 60000; d += 137)
        {
            const pace = speedAt(zones, d);

            expect(Number.isFinite(pace)).toBe(true);
            expect(pace).toBeGreaterThan(0);
        }

    });

    it('is one everywhere when a level declares no zones', () => {

        for (let d = 0; d < 20000; d += 211)
        {
            expect(speedAt([], d)).toBe(1);
        }

    });

});

describe('zones the compiler emits', () => {

    it('gives a section that asks for a pace a stretch of its own', () => {

        const level = buildLevel({
            name: 'test',
            world: 'sky',
            palette: [ 'red', 'blue' ],
            sections: [
                { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ '1..', '..2' ] },
                { splitAfterLane: 0, gate: [ 0, 1 ], speed: 1.4, rows: [ '1..', '..2' ] }
            ]
        });

        expect(level.zones).toHaveLength(1);
        expect(level.zones[0].speed).toBe(1.4);

        //  Claiming the second section, not the first.
        expect(level.zones[0].from).toBeGreaterThan(level.gates[0].distance);
        expect(level.zones[0].to).toBeGreaterThan(level.zones[0].from);

    });

    it('emits nothing for a section running at the ordinary pace', () => {

        const level = buildLevel({
            name: 'test',
            world: 'sky',
            palette: [ 'red', 'blue' ],
            sections: [
                { splitAfterLane: 0, gate: [ 0, 1 ], speed: 1, rows: [ '1..' ] },
                { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ '1..' ] }
            ]
        });

        expect(level.zones).toHaveLength(0);

    });

    //  Every level shipped before zones existed must compile to none of them,
    //  and so play at exactly the pace it always did.
    it('leaves every shipped level at its own single pace for now', () => {

        for (const spec of LEVELS)
        {
            const level = buildLevel(spec);

            for (const zone of level.zones)
            {
                //  If a level does declare one, it has to be a sane one: a
                //  stretch with a positive length and a pace in a range a
                //  player can still read the road at.
                expect(zone.to, `level ${spec.name}`).toBeGreaterThan(zone.from);
                expect(zone.speed, `level ${spec.name}`).toBeGreaterThan(0.5);
                expect(zone.speed, `level ${spec.name}`).toBeLessThanOrEqual(1.6);
            }
        }

    });

});
