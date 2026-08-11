import { describe, expect, it } from 'vitest';
import { HORIZON_Y } from '../src/game/config/constants';
import { WORLDS } from '../src/game/config/worldData';
import { FloaterSpec, WorldId } from '../src/game/config/worlds';
import { floatersAt } from '../src/game/systems/Floaters';

const IDS: WorldId[] = [
    'sky', 'mountains', 'canyon', 'forest', 'ice', 'desert', 'storm', 'city', 'space', 'void'
];

/** Perceived brightness, 0 to 1. */
function luminance (color: number): number
{
    const r = ((color >> 16) & 0xff) / 255;
    const g = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;

    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function withFloaters (): Array<[ WorldId, FloaterSpec ]>
{
    return IDS
        .filter((id) => WORLDS[id].floaters !== undefined)
        .map((id) => [ id, WORLDS[id].floaters! ]);
}

describe('things hanging in the sky', () => {

    it('are on some worlds and not all of them', () => {

        const some = withFloaters();

        expect(some.length).toBeGreaterThan(0);
        expect(some.length).toBeLessThan(IDS.length);

    });

    //  The one rule that matters. Everything else in the world is anchored to
    //  the ground or the road and is held in place by that; these are anchored
    //  to nothing, so the only thing keeping one off the corridor is this.
    it('never come down over the horizon, however far the player travels', () => {

        for (const [ id, spec ] of withFloaters())
        {
            for (let distance = 0; distance < 40000; distance += 211)
            {
                for (const floater of floatersAt(spec, distance))
                {
                    //  Including its own lowest point: an island's underside
                    //  hangs well below the middle of it.
                    const lowest = floater.y + (floater.size * 1.3);

                    expect(lowest, `${id} at ${distance}`).toBeLessThan(HORIZON_Y);
                }
            }
        }

    });

    //  They are scenery. Anything up here bright enough to pull the eye is
    //  competing with the orbs, which is the one thing the brief rules out.
    it('stay quiet against their own sky', () => {

        for (const [ id, spec ] of withFloaters())
        {
            const world = WORLDS[id];

            //  What actually reaches the eye is the difference scaled by the
            //  alpha it is drawn at.
            const seen = spec.alpha * Math.abs(luminance(spec.color) - luminance(world.skyTop));

            expect(seen, `${id} too loud`).toBeLessThan(0.22);
            expect(seen, `${id} invisible`).toBeGreaterThan(0.01);
        }

    });

    it('drift steadily rather than jumping about', () => {

        for (const [ id, spec ] of withFloaters())
        {
            const first = floatersAt(spec, 5000);
            const next = floatersAt(spec, 5000 + 40);

            expect(next, `${id} count`).toHaveLength(first.length);

            for (let i = 0; i < first.length; i++)
            {
                //  Wrapping is the one legitimate jump, so allow for it.
                const moved = Math.abs(next[i].x - first[i].x);

                expect(moved < 20 || moved > 400, `${id} floater ${i} moved ${moved}`).toBe(true);
            }
        }

    });

    it('put a floater in the same place every time they are asked', () => {

        for (const [ , spec ] of withFloaters())
        {
            expect(floatersAt(spec, 3210)).toEqual(floatersAt(spec, 3210));
        }

    });

});
