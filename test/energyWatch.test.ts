import { describe, expect, it } from 'vitest';
import { ENERGY_ENABLED, ENERGY_REFILL_MS, MAX_ENERGY } from '../src/game/config/constants';
import { EnergySystem } from '../src/game/systems/EnergySystem';
import { energyChanged } from '../src/game/systems/energyWatch';

/** A save held in memory, so a system can be asked about real state. */
function saveWith (energy: number, at: number)
{
    let held = energy;
    let stamp = at;

    return {
        getEnergy: () => held,
        getEnergyAt: () => stamp,
        setEnergy: (value: number, when: number) => { held = value; stamp = when; }
    } as unknown as ConstructorParameters<typeof EnergySystem>[0];
}

describe('noticing that the wait is over', () => {

    //  Both menus ask "can a level be started" once, while they are being
    //  built, and hand that answer to everything on them - the title to its
    //  buttons, the level select to whether a stop gets a hit area at all.
    //  Neither asked again. Measured on the level select with the flag on:
    //  energy 1, mayStart true, and not one stop on the screen with a hit
    //  area. The screen a player waits on is the one screen that has to notice.
    it('reports a change in both directions and only on a change', () => {

        expect(energyChanged({ mayStart: () => true } as EnergySystem, false), 'the wait ended').toBe(true);
        expect(energyChanged({ mayStart: () => false } as EnergySystem, true), 'the last was spent').toBe(true);

        expect(energyChanged({ mayStart: () => true } as EnergySystem, true), 'nothing has changed').toBe(false);
        expect(energyChanged({ mayStart: () => false } as EnergySystem, false), 'still waiting').toBe(false);

    });

    //  The hazard the fix brings with it. Both screens rebuild themselves when
    //  this reports a change, so an answer that flickered would be a menu that
    //  restarted every frame - which is a far worse bug than the one being
    //  fixed. It cannot: the answer is a function of stored energy and the
    //  clock, and neither moves on its own between two frames.
    it('does not churn while nothing is being spent', () => {

        const energy = new EnergySystem(saveWith(MAX_ENERGY, Date.now()));
        const first = energy.mayStart();

        for (let frame = 0; frame < 240; frame++)
        {
            expect(energyChanged(energy, first), `frame ${frame}`).toBe(false);
        }

    });

    //  And the same on an empty tank part way through a refill, which is the
    //  state a waiting player is actually sitting in.
    it('does not churn while the countdown is still running', () => {

        const energy = new EnergySystem(saveWith(0, Date.now() - (ENERGY_REFILL_MS / 2)));
        const first = energy.mayStart();

        for (let frame = 0; frame < 240; frame++)
        {
            expect(energyChanged(energy, first), `frame ${frame}`).toBe(false);
        }

    });

    //  While the master switch is off, levels are free and this can never fire
    //  at all - so the fix costs a disabled feature nothing. Stated as a test
    //  rather than as a comment because it is the reason the two above pass
    //  today, and it will stop being true the moment the switch is flipped.
    it('never fires at all while energy is switched off', () => {

        if (ENERGY_ENABLED)
        {
            return;
        }

        const empty = new EnergySystem(saveWith(0, Date.now() - (ENERGY_REFILL_MS * 3)));
        const full = new EnergySystem(saveWith(MAX_ENERGY, Date.now()));

        expect(empty.mayStart(), 'free with none in hand').toBe(true);
        expect(full.mayStart(), 'free with plenty').toBe(true);

    });

});
