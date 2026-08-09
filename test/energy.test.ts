import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENERGY_REFILL_MS, MAX_ENERGY, STORAGE_KEY } from '../src/game/config/constants';
import { EnergySystem } from '../src/game/systems/EnergySystem';
import { SaveSystem } from '../src/game/systems/SaveSystem';
import { FakeStorage, installStorage, uninstallStorage } from './helpers/fakeStorage';

const NOW = new Date('2026-01-01T12:00:00Z').getTime();

let storage: FakeStorage;

beforeEach(() => {

    storage = new FakeStorage();

    installStorage(storage);

    vi.useFakeTimers();
    vi.setSystemTime(NOW);

});

afterEach(() => {

    vi.useRealTimers();
    uninstallStorage();

});

/** Seeds a save with a given energy level and how long ago its interval started. */
function seed (energy: number, startedMsAgo: number): void
{
    storage.seed(STORAGE_KEY, JSON.stringify({
        version: 1,
        currentLevel: 0,
        furthestLevel: 0,
        bestScores: [ 0, 0, 0 ],
        energy,
        energyAt: NOW - startedMsAgo
    }));
}

const build = () => new EnergySystem(new SaveSystem());

describe('refilling', () => {

    it('credits one energy per elapsed interval', () => {

        seed(0, ENERGY_REFILL_MS * 2);

        expect(build().getEnergy()).toBe(2);

    });

    it('keeps the part of the current interval already waited', () => {

        //  Two and a half intervals: two energy, with half an interval banked
        //  toward the next.
        seed(0, ENERGY_REFILL_MS * 2.5);

        const energy = build();

        expect(energy.getEnergy()).toBe(2);
        expect(energy.getMsUntilNextRefill()).toBe(ENERGY_REFILL_MS / 2);

    });

    it('does not credit a partial interval', () => {

        seed(0, ENERGY_REFILL_MS - 1000);

        const energy = build();

        expect(energy.getEnergy()).toBe(0);
        expect(energy.getMsUntilNextRefill()).toBe(1000);

    });

    it('never goes past the cap', () => {

        seed(0, ENERGY_REFILL_MS * 999);

        const energy = build();

        expect(energy.getEnergy()).toBe(MAX_ENERGY);
        expect(energy.getMsUntilNextRefill()).toBe(0);

    });

    it('credits as time passes', () => {

        seed(0, 0);

        const energy = build();

        expect(energy.getEnergy()).toBe(0);

        vi.setSystemTime(NOW + ENERGY_REFILL_MS);
        expect(energy.getEnergy()).toBe(1);

        vi.setSystemTime(NOW + (ENERGY_REFILL_MS * 3));
        expect(energy.getEnergy()).toBe(3);

    });

});

describe('spending', () => {

    it('takes one and reports success', () => {

        seed(MAX_ENERGY, 0);

        const energy = build();

        expect(energy.spend()).toBe(true);
        expect(energy.getEnergy()).toBe(MAX_ENERGY - 1);

    });

    it('refuses, and takes nothing, when empty', () => {

        seed(0, 0);

        const energy = build();

        expect(energy.canPlay()).toBe(false);
        expect(energy.spend()).toBe(false);
        expect(energy.getEnergy()).toBe(0);

    });

    it('starts a fresh interval when dropping from the cap', () => {

        //  An hour spent full must not hand over an instant refill afterwards.
        seed(MAX_ENERGY, ENERGY_REFILL_MS * 6);

        const energy = build();

        energy.spend();

        expect(energy.getEnergy()).toBe(MAX_ENERGY - 1);
        expect(energy.getMsUntilNextRefill()).toBe(ENERGY_REFILL_MS);

    });

    it('leaves a running interval alone when already below the cap', () => {

        seed(2, ENERGY_REFILL_MS / 2);

        const energy = build();

        energy.spend();

        //  The half interval already waited still counts toward the next refill.
        expect(energy.getEnergy()).toBe(1);
        expect(energy.getMsUntilNextRefill()).toBe(ENERGY_REFILL_MS / 2);

    });

});

describe('a clock that has moved backwards', () => {

    it('does not stall refills', () => {

        //  A timestamp an hour in the future, as a clock change can leave.
        seed(2, -ENERGY_REFILL_MS * 6);

        const energy = build();

        expect(energy.getEnergy()).toBe(2);

        //  Without clamping, the next refill would be an hour and ten minutes
        //  away rather than one interval.
        expect(energy.getMsUntilNextRefill()).toBe(ENERGY_REFILL_MS);

    });

});

describe('storage writes', () => {

    //  Regression guard: refresh() used to re-anchor the timestamp to now while
    //  at the cap. That always differed, so polling it - which the menu meter
    //  does every frame - wrote to localStorage on every one of those frames.
    it('are not made by repeated polling at the cap', () => {

        seed(MAX_ENERGY, ENERGY_REFILL_MS * 6);

        const energy = build();
        const before = storage.writes;

        for (let frame = 0; frame < 240; frame++)
        {
            vi.setSystemTime(NOW + (frame * 16));

            energy.getEnergy();
            energy.getMsUntilNextRefill();
        }

        expect(storage.writes).toBe(before);

    });

    it('are not made by repeated polling below the cap either', () => {

        seed(1, 1000);

        const energy = build();
        const before = storage.writes;

        for (let frame = 0; frame < 240; frame++)
        {
            vi.setSystemTime(NOW + 1000 + (frame * 16));

            energy.getEnergy();
            energy.getMsUntilNextRefill();
        }

        expect(storage.writes).toBe(before);

    });

    it('are made when energy actually changes', () => {

        seed(1, 0);

        const energy = build();
        const before = storage.writes;

        energy.spend();

        expect(storage.writes).toBeGreaterThan(before);

    });

});
