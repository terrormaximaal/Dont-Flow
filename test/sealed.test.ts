import { describe, expect, it } from 'vitest';
import { DEFAULT_LANES, TRACK_LEFT, TRACK_WIDTH } from '../src/game/config/constants';
import { buildLevel } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';
import { gateSideAt, gateSplitX } from '../src/game/systems/contact';
import { useLanes } from '../src/game/systems/Lanes';

describe('a doorway that is barred', () => {

    it('bars the side it says and only that side', () => {

        for (const splitAfterLane of [ 0, 1 ] as const)
        {
            const split = gateSplitX(splitAfterLane);

            expect(gateSideAt(split - 1, splitAfterLane), 'just left of the split').toBe(0);
            expect(gateSideAt(split + 1, splitAfterLane), 'just right of it').toBe(1);
            expect(gateSideAt(TRACK_LEFT, splitAfterLane), 'the far left').toBe(0);
            expect(gateSideAt(TRACK_LEFT + TRACK_WIDTH, splitAfterLane), 'the far right').toBe(1);
        }

    });

});

describe('the sealed gates the levels ship', () => {

    //  The seal is welded to a doorway and the swap moves colours between them,
    //  so a gate carrying both would show bars on one side and the colour those
    //  bars belong to on the other. Two deceptions at once is also simply one
    //  too many to read at the speed these levels run at.
    it('never bars a doorway on a gate that also trades its colours', () => {

        for (const spec of LEVELS)
        {
            for (const [ index, section ] of spec.sections.entries())
            {
                if (section.gateSealed === undefined)
                {
                    continue;
                }

                expect(
                    section.gateSwap ?? false,
                    `level ${spec.name} section ${index + 1}: barred and swapping`
                ).toBe(false);
            }
        }

    });

    //  Both doorways barred is a wall with a colour, not a gate. The player has
    //  to be able to get through one of them without paying.
    it('always leaves one doorway open', () => {

        for (const spec of LEVELS)
        {
            for (const section of spec.sections)
            {
                expect([ undefined, 0, 1 ]).toContain(section.gateSealed);
            }
        }

    });

    //  The first gate of a level is where the drop is given a colour at all,
    //  and it arrives having been shown nothing. Barring half of it charges the
    //  player for a reading they have had no chance to make.
    it('never bars the first gate of a level', () => {

        for (const spec of LEVELS)
        {
            expect(spec.sections[0].gateSealed, `level ${spec.name}`).toBeUndefined();
        }

    });

    //  Late, and after the swapping gate: deception is the theme of the middle
    //  band, and a gate that lies about being open belongs after one that
    //  changes its mind.
    it('arrives after the gate that changes its mind', () => {

        let swap: number | null = null;
        let sealed: number | null = null;

        LEVELS.forEach((spec, index) => {

            for (const section of spec.sections)
            {
                if (section.gateSwap) { swap ??= index; }
                if (section.gateSealed !== undefined) { sealed ??= index; }
            }

        });

        expect(sealed, 'a barred doorway').not.toBeNull();
        expect(swap, 'a swapping gate').not.toBeNull();
        expect(sealed!, 'barred after swapping').toBeGreaterThan(swap!);

    });

    //  A section behind a barred doorway still has to be playable with the
    //  colour the open one gives, or the seal is not a cost but a wall.
    it('leaves a section behind it playable in the colour still on offer', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            useLanes(spec.lanes ?? DEFAULT_LANES);

            const level = buildLevel(spec);

            spec.sections.forEach((section, at) => {

                if (section.gateSealed === undefined)
                {
                    return;
                }

                const open = spec.palette[section.gate[section.gateSealed === 0 ? 1 : 0]];
                const gate = level.gates[at];
                const next = level.gates[at + 1]?.distance ?? level.finishDistance;

                //  Every full-height barrier in the section must be passable by
                //  going round rather than by carrying the sealed colour.
                const rows = new Map<number, number[]>();

                for (const obstacle of level.obstacles)
                {
                    if (obstacle.distance <= gate.distance || obstacle.distance >= next)
                    {
                        continue;
                    }

                    if (obstacle.profile !== 'full' || obstacle.color === open)
                    {
                        continue;
                    }

                    rows.set(obstacle.distance, [ ...(rows.get(obstacle.distance) ?? []), obstacle.lane ]);
                }

                for (const [ distance, blocked ] of rows)
                {
                    expect(
                        new Set(blocked).size,
                        `level ${index + 1} section ${at + 1}, row at ${distance}`
                    ).toBeLessThan(spec.lanes ?? DEFAULT_LANES);
                }

            });
        }

    });

});
