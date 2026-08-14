import { MAX_ENERGY, SAVE_VERSION, STORAGE_KEY } from '../config/constants';
import { clampLevelIndex, LEVEL_COUNT } from '../config/levels';
import { clamp } from '../utils/math';

interface SaveData
{
    version: number;

    /** The level the player was last on, so a reload resumes there. */
    currentLevel: number;

    /**
     * Highest level reached. Nothing uses this yet - a level-select menu will,
     * and recording it now means the history exists by the time it is built.
     */
    furthestLevel: number;

    /**
     * Best score per level, index-aligned to LEVELS. Null where the level has
     * never been finished, which is not the same as having finished it on zero
     * - and, now that a run can end below zero, not the same as a bad run
     * either.
     */
    bestScores: (number | null)[];

    /** Energy in hand. */
    energy: number;

    /** When the current refill interval started, as epoch ms. */
    energyAt: number;

    /**
     * Best endless run, or null if none has been finished.
     *
     * Optional on the stored shape rather than a version bump: an older save
     * simply has not got one, which reads as "no run yet" and is exactly true.
     */
    survivalBest?: number | null;
}

function emptySave (): SaveData
{
    return {
        version: SAVE_VERSION,
        currentLevel: 0,
        furthestLevel: 0,
        bestScores: new Array(LEVEL_COUNT).fill(null),
        energy: MAX_ENERGY,
        energyAt: Date.now(),
        survivalBest: null
    };
}

/**
 * Persists progress to localStorage.
 *
 * Everything here assumes the stored value is hostile: it can be missing,
 * corrupt, written by an older build, or sized for a different number of levels.
 * It can also be unreadable outright - Safari's private mode throws on access
 * rather than returning null. In every one of those cases the game has to start
 * anyway, so failures fall back to an empty save held in memory and the session
 * plays normally; only persistence is lost.
 */
export class SaveSystem
{
    private data: SaveData;

    /** False when storage threw. The session still works, it just will not stick. */
    readonly persistent: boolean;

    constructor ()
    {
        const raw = SaveSystem.read();

        this.persistent = raw !== undefined;
        this.data = SaveSystem.parse(raw ?? null);
    }

    /**
     * @returns the stored string, null if absent, or undefined if storage threw.
     */
    private static read (): string | null | undefined
    {
        try
        {
            return window.localStorage.getItem(STORAGE_KEY);
        }
        catch
        {
            return undefined;
        }
    }

    /**
     * Rebuilds a save from an untrusted string, keeping only values that are
     * the right shape and discarding anything else.
     */
    private static parse (raw: string | null): SaveData
    {
        if (!raw)
        {
            return emptySave();
        }

        let parsed: unknown;

        try
        {
            parsed = JSON.parse(raw);
        }
        catch
        {
            return emptySave();
        }

        if (typeof parsed !== 'object' || parsed === null)
        {
            return emptySave();
        }

        const candidate = parsed as Partial<SaveData>;

        //  An older format may mean anything at all; start clean rather than
        //  guess at a migration.
        if (candidate.version !== SAVE_VERSION)
        {
            return emptySave();
        }

        const save = emptySave();

        save.currentLevel = SaveSystem.toLevelIndex(candidate.currentLevel);
        save.furthestLevel = SaveSystem.toLevelIndex(candidate.furthestLevel);

        //  Normalise to the current number of levels, so adding or removing one
        //  cannot leave a short or over-long array behind.
        if (Array.isArray(candidate.bestScores))
        {
            for (let i = 0; i < LEVEL_COUNT; i++)
            {
                save.bestScores[i] = SaveSystem.toScore(candidate.bestScores[i]);
            }
        }

        //  Energy was added after the first saves were written. Missing fields
        //  keep the defaults above - full energy, refilling from now - so an
        //  earlier save stays valid instead of needing a version bump that
        //  would throw away the player's progress.
        if (typeof candidate.energy === 'number' && Number.isFinite(candidate.energy))
        {
            save.energy = clamp(Math.floor(candidate.energy), 0, MAX_ENERGY);
        }

        if (typeof candidate.energyAt === 'number' && Number.isFinite(candidate.energyAt) && candidate.energyAt > 0)
        {
            save.energyAt = Math.floor(candidate.energyAt);
        }

        return save;
    }

    private static toLevelIndex (value: unknown): number
    {
        return typeof value === 'number' && Number.isFinite(value) ? clampLevelIndex(Math.floor(value)) : 0;
    }

    /**
     * Any finite number is a real score, negatives included: wrong colours cost
     * points, so a run genuinely can end below zero and that result has to
     * survive a reload. Only junk becomes null.
     */
    private static toScore (value: unknown): number | null
    {
        return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : null;
    }

    private persist (): void
    {
        try
        {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        }
        catch
        {
            //  Storage full or unavailable. The in-memory save still serves this
            //  session, so there is nothing useful to do here.
        }
    }

    /** Where a fresh load should drop the player. */
    getResumeLevel (): number
    {
        return this.data.currentLevel;
    }

    /** Highest level reached, which is how far level select is unlocked. */
    getFurthestLevel (): number
    {
        return this.data.furthestLevel;
    }

    /** @returns the best score, or null if the level has never been finished. */
    /** The best endless run so far, or null if there has not been one. */
    getSurvivalBest (): number | null
    {
        return this.data.survivalBest ?? null;
    }

    /**
     * Records an endless run.
     *
     * @returns whether it beat what was there, so the panel can say so.
     */
    recordSurvival (score: number): boolean
    {
        const best = this.getSurvivalBest();

        if (best !== null && score <= best)
        {
            return false;
        }

        this.data.survivalBest = score;
        this.persist();

        return true;
    }

    getBestScore (levelIndex: number): number | null
    {
        return this.data.bestScores[clampLevelIndex(levelIndex)] ?? null;
    }

    getEnergy (): number
    {
        return this.data.energy;
    }

    getEnergyAt (): number
    {
        return this.data.energyAt;
    }

    /** Writes only on an actual change, so idle polling does not touch storage. */
    setEnergy (energy: number, energyAt: number): void
    {
        if (this.data.energy === energy && this.data.energyAt === energyAt)
        {
            return;
        }

        this.data.energy = energy;
        this.data.energyAt = energyAt;

        this.persist();
    }

    /** Called as a level begins, so a reload comes back to the same place. */
    setCurrentLevel (levelIndex: number): void
    {
        const index = clampLevelIndex(levelIndex);

        this.data.currentLevel = index;
        this.data.furthestLevel = Math.max(this.data.furthestLevel, index);

        this.persist();
    }

    /**
     * Opens a level up for selection without making it the current one.
     *
     * Reaching a level used to be the only thing that unlocked it, which meant
     * finishing one and going back to the menu left the next still locked: the
     * only way through was to take the NEXT LEVEL button on the spot.
     */
    unlockLevel (levelIndex: number): void
    {
        const index = clampLevelIndex(levelIndex);

        if (index <= this.data.furthestLevel)
        {
            return;
        }

        this.data.furthestLevel = index;

        this.persist();
    }

    /**
     * Records a finished level.
     *
     * @returns true if this run beat the stored best.
     */
    recordScore (levelIndex: number, score: number): boolean
    {
        const index = clampLevelIndex(levelIndex);
        const best = this.data.bestScores[index];

        //  A first finish is always the best one, whatever it scored.
        const isBest = best === null || score > best;

        if (isBest)
        {
            this.data.bestScores[index] = score;

            this.persist();
        }

        return isBest;
    }
}
