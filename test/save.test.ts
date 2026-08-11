import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_ENERGY, STORAGE_KEY } from '../src/game/config/constants';
import { LEVEL_COUNT } from '../src/game/config/levels';
import { SaveSystem } from '../src/game/systems/SaveSystem';
import { FakeStorage, installStorage, uninstallStorage } from './helpers/fakeStorage';

let storage: FakeStorage;

beforeEach(() => {

    storage = new FakeStorage();

    installStorage(storage);

});

afterEach(() => uninstallStorage());

const stored = () => JSON.parse(storage.peek(STORAGE_KEY)!);

describe('a fresh save', () => {

    it('starts at the first level with full energy', () => {

        const save = new SaveSystem();

        expect(save.getResumeLevel()).toBe(0);
        expect(save.getFurthestLevel()).toBe(0);
        expect(save.getEnergy()).toBe(MAX_ENERGY);
        expect(save.getBestScore(0)).toBeNull();

    });

    it('writes nothing until something changes', () => {

        // eslint-disable-next-line no-new
        new SaveSystem();

        expect(storage.writes).toBe(0);

    });

});

describe('recording progress', () => {

    it('keeps the higher score and reports whether it was beaten', () => {

        const save = new SaveSystem();

        expect(save.recordScore(0, 100)).toBe(true);
        expect(save.getBestScore(0)).toBe(100);

        expect(save.recordScore(0, 50)).toBe(false);
        expect(save.getBestScore(0)).toBe(100);

        expect(save.recordScore(0, 150)).toBe(true);
        expect(save.getBestScore(0)).toBe(150);

    });

    //  Best scores used to start at zero, which quietly broke every run that
    //  ended below it: finishing on -80 did not beat 0, so nothing was stored
    //  and the overlay announced 'BEST 0' - a score the player had never got.
    it('treats a first finish as the best one, however badly it went', () => {

        const save = new SaveSystem();

        expect(save.getBestScore(0), 'nothing played yet').toBeNull();

        expect(save.recordScore(0, -80), 'first finish is a best').toBe(true);
        expect(save.getBestScore(0)).toBe(-80);

    });

    it('improves on a negative best without needing to reach zero', () => {

        const save = new SaveSystem();

        save.recordScore(0, -80);

        expect(save.recordScore(0, -30), 'less bad is still better').toBe(true);
        expect(save.getBestScore(0)).toBe(-30);

        expect(save.recordScore(0, -50), 'worse than the best').toBe(false);
        expect(save.getBestScore(0)).toBe(-30);

    });

    it('keeps a negative best across a reload', () => {

        new SaveSystem().recordScore(2, -40);

        expect(new SaveSystem().getBestScore(2)).toBe(-40);

    });

    //  Finishing a level and going back to the menu used to leave the next one
    //  locked, because only starting a level had ever unlocked it.
    it('opens the next level up without making it the current one', () => {

        const save = new SaveSystem();

        save.setCurrentLevel(0);
        save.unlockLevel(1);

        expect(save.getFurthestLevel(), 'next level reachable').toBe(1);
        expect(save.getResumeLevel(), 'still on the level just played').toBe(0);

    });

    it('never rewinds an unlock', () => {

        const save = new SaveSystem();

        save.setCurrentLevel(4);
        save.unlockLevel(1);

        expect(save.getFurthestLevel()).toBe(4);

    });

    it('advances furthest level but never rewinds it', () => {

        const save = new SaveSystem();

        save.setCurrentLevel(2);
        expect(save.getFurthestLevel()).toBe(2);

        save.setCurrentLevel(0);
        expect(save.getResumeLevel()).toBe(0);
        expect(save.getFurthestLevel()).toBe(2);

    });

    it('survives a round trip through storage', () => {

        const first = new SaveSystem();

        first.setCurrentLevel(1);
        first.recordScore(1, 240);

        const second = new SaveSystem();

        expect(second.getResumeLevel()).toBe(1);
        expect(second.getBestScore(1)).toBe(240);

    });

    it('clamps a level index that is out of range', () => {

        const save = new SaveSystem();

        save.setCurrentLevel(999);

        expect(save.getResumeLevel()).toBe(LEVEL_COUNT - 1);

    });

});

describe('a hostile stored value', () => {

    const expectDefaults = () => {

        const save = new SaveSystem();

        expect(save.getResumeLevel()).toBe(0);
        expect(save.getFurthestLevel()).toBe(0);
        expect(save.getBestScore(0)).toBeNull();

    };

    it('falls back to defaults when the JSON is corrupt', () => {

        storage.seed(STORAGE_KEY, 'not json{{{');

        expectDefaults();

    });

    it('falls back to defaults when the version is unknown', () => {

        storage.seed(STORAGE_KEY, JSON.stringify({ version: 99, currentLevel: 2, bestScores: [ 9, 9, 9 ] }));

        expectDefaults();

    });

    it('falls back to defaults when the payload is not an object', () => {

        storage.seed(STORAGE_KEY, '"a string"');
        expectDefaults();

        storage.seed(STORAGE_KEY, 'null');
        expectDefaults();

    });

    it('discards fields of the wrong type', () => {

        storage.seed(STORAGE_KEY, JSON.stringify({
            version: 1,
            currentLevel: 'x',
            furthestLevel: null,
            bestScores: 'nope'
        }));

        expectDefaults();

    });

    it('clamps values that are out of range', () => {

        storage.seed(STORAGE_KEY, JSON.stringify({
            version: 1,
            currentLevel: 999,
            furthestLevel: -5,
            bestScores: [ -1, Number.NaN, Number.POSITIVE_INFINITY ]
        }));

        const save = new SaveSystem();

        expect(save.getResumeLevel()).toBe(LEVEL_COUNT - 1);
        expect(save.getFurthestLevel()).toBe(0);

        //  A negative score is a real result now, so it survives; only the
        //  values that are not numbers at all are thrown away.
        expect(save.getBestScore(0)).toBe(-1);
        expect(save.getBestScore(1)).toBeNull();
        expect(save.getBestScore(2)).toBeNull();

    });

    it('normalises a score list sized for a different number of levels', () => {

        storage.seed(STORAGE_KEY, JSON.stringify({ version: 1, currentLevel: 0, furthestLevel: 0, bestScores: [ 50 ] }));

        const save = new SaveSystem();

        expect(save.getBestScore(0)).toBe(50);

        for (let i = 1; i < LEVEL_COUNT; i++)
        {
            expect(save.getBestScore(i)).toBeNull();
        }

        save.recordScore(0, 60);

        expect(stored().bestScores).toHaveLength(LEVEL_COUNT);

    });

});

describe('a save written before energy existed', () => {

    it('keeps its progress and is granted full energy', () => {

        storage.seed(STORAGE_KEY, JSON.stringify({
            version: 1,
            currentLevel: 1,
            furthestLevel: 1,
            bestScores: [ 120, 0, 0 ]
        }));

        const save = new SaveSystem();

        expect(save.getResumeLevel()).toBe(1);
        expect(save.getBestScore(0)).toBe(120);
        expect(save.getEnergy()).toBe(MAX_ENERGY);

    });

});

describe('when storage is unavailable', () => {

    it('still runs, and reports that nothing will persist', () => {

        storage.throwOnAccess = true;

        const save = new SaveSystem();

        expect(save.persistent).toBe(false);
        expect(save.getEnergy()).toBe(MAX_ENERGY);

        //  Writing must not throw either.
        expect(() => save.recordScore(0, 100)).not.toThrow();
        expect(save.getBestScore(0)).toBe(100);

    });

    it('still runs when there is no window at all', () => {

        uninstallStorage();

        const save = new SaveSystem();

        expect(save.persistent).toBe(false);
        expect(() => save.setCurrentLevel(1)).not.toThrow();
        expect(save.getResumeLevel()).toBe(1);

    });

});
