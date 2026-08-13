import { describe, expect, it } from 'vitest';
import { DEFAULT_LANES, ORB_CATCH_RADIUS, ORB_MAGNET_DISTANCE } from '../src/game/config/constants';
import { Orb } from '../src/game/entities/Orb';
import { laneCenterX, useLanes } from '../src/game/systems/Lanes';

/**
 * Just enough Graphics for an orb to draw into. Every call is a no-op: what is
 * under test is where the orb thinks it is, not what it paints.
 */
function stubScene (): { add: { graphics: () => unknown } }
{
    const gfx = new Proxy({}, { get: () => () => gfx });

    return { add: { graphics: () => gfx } };
}

function makeOrb (lane: number, distance: number): Orb
{
    useLanes(DEFAULT_LANES);

    //  eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Orb(stubScene() as any, { distance, lane, color: 'red' });
}

describe('an orb drifting towards the drop', () => {

    //  The drift is presentation. Contact is decided by comparing the drop's x
    //  against the orb's own lane position, so if that position moved with the
    //  drawing, a near miss would start counting as a hit - the drift would be
    //  reaching out and collecting itself.
    it('never moves the position collision is decided from', () => {

        const orb = makeOrb(0, 1000);
        const home = laneCenterX(0);

        //  Offset, not sitting on top of it. A drop exactly on the orb makes
        //  the pull zero however broken it is, so testing from there proves
        //  nothing - which is what the first version of this test did.
        const dropX = home + ORB_CATCH_RADIUS - 1;

        for (let travelled = 0; travelled <= 1000; travelled += 25)
        {
            orb.update(travelled, dropX, true);

            expect(orb.x, `at ${travelled}`).toBe(home);
        }

    });

    it('is not pulled at all by a drop in another lane', () => {

        const orb = makeOrb(0, 500);
        const home = laneCenterX(0);

        for (let travelled = 0; travelled <= 500; travelled += 25)
        {
            orb.update(travelled, laneCenterX(2), false);

            expect(orb.x).toBe(home);
        }

    });

    //  Whatever it draws, the orb has to report the screen y contact happens at,
    //  which the score popup and the swallow are both placed from.
    it('reports a y that arrives as the drop reaches it', () => {

        const orb = makeOrb(1, ORB_MAGNET_DISTANCE * 3);

        const far = orb.update(0, laneCenterX(1), true);
        const close = orb.update(orb.distance - 10, laneCenterX(1), true);

        //  Screen y grows downwards, so arriving means a larger number.
        expect(close).toBeGreaterThan(far);
        expect(Number.isFinite(far)).toBe(true);

    });

});
