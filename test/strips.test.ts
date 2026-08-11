import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, HORIZON_Y, STRIP_SPACING } from '../src/game/config/constants';
import { STRIP_BUDGET, visibleStrips } from '../src/game/systems/strips';

//  Screen y past which a strip has gone by, matching what TrackScroller passes.
const NEAR = GAME_HEIGHT + 260;

describe('the road\'s light strips', () => {

    //  Each strip costs two projected quads every frame. Perspective packs them
    //  ever tighter towards the horizon, so without a budget a change to the
    //  depth curve could quietly turn a dozen quads into hundreds - on a phone.
    it('never draws more than its budget, however far the player has come', () => {

        for (let travelled = 0; travelled < 40000; travelled += 137)
        {
            expect(visibleStrips(travelled, NEAR).length, `at ${travelled}`)
                .toBeLessThanOrEqual(STRIP_BUDGET);
        }

    });

    //  The real bound worth knowing: what it actually costs in the steady
    //  state. Measured at 8 over a full course; held here with a little room,
    //  because the first attempt at culling let all 24 through and nothing
    //  noticed until this was written.
    it('settles to a handful on screen at any moment', () => {

        let worst = 0;

        for (let travelled = 0; travelled < 40000; travelled += 53)
        {
            worst = Math.max(worst, visibleStrips(travelled, NEAR).length);
        }

        expect(worst).toBeLessThanOrEqual(10);

    });

    it('never places one above the horizon', () => {

        for (let travelled = 0; travelled < 8000; travelled += 91)
        {
            for (const strip of visibleStrips(travelled, NEAR))
            {
                expect(strip.tailY, `tail at ${travelled}`).toBeGreaterThanOrEqual(HORIZON_Y);
            }
        }

    });

    //  Not "the tail is above the head": for the strip the player has already
    //  passed, the road runs the other way and the tail is below it. What has
    //  to hold either way is that it is long enough on screen to be a light
    //  rather than a speck.
    it('gives every strip it keeps a length worth drawing', () => {

        for (let travelled = 0; travelled < 8000; travelled += 91)
        {
            for (const strip of visibleStrips(travelled, NEAR))
            {
                expect(Math.abs(strip.y - strip.tailY), `at ${travelled}`).toBeGreaterThanOrEqual(4);
            }
        }

    });

    //  Strips are placed at fixed world distances, so travelling one whole
    //  spacing has to bring back the same picture. If it did not, they would
    //  drift against the road and shimmer.
    it('repeats exactly once per spacing travelled', () => {

        const at = visibleStrips(5000, NEAR);
        const later = visibleStrips(5000 + STRIP_SPACING, NEAR);

        expect(later).toHaveLength(at.length);

        for (let i = 0; i < at.length; i++)
        {
            expect(later[i].y).toBeCloseTo(at[i].y, 6);
            expect(later[i].strength).toBeCloseTo(at[i].strength, 6);
        }

    });

});
