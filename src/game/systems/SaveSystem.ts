import { SAVE_VERSION, STORAGE_KEY } from '../config/constants';
import { clampLevelIndex, LEVEL_COUNT } from '../config/levels';

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

    /** Best score per level, index-aligned to LEVELS. */
    bestScores: number[];
}

function emptySave (): SaveData
{
    return {
        version: SAVE_VERSION,
        currentLevel: 0,
        furthestLevel: 0,
        bestScores: new Array(LEVEL_COUNT).fill(0)
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

        return save;
    }

    private static toLevelIndex (value: unknown): number
    {
        return typeof value === 'number' && Number.isFinite(value) ? clampLevelIndex(Math.floor(value)) : 0;
    }

    private static toScore (value: unknown): number
    {
        return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
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

    getBestScore (levelIndex: number): number
    {
        return this.data.bestScores[clampLevelIndex(levelIndex)] ?? 0;
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
     * Records a finished level.
     *
     * @returns true if this run beat the stored best.
     */
    recordScore (levelIndex: number, score: number): boolean
    {
        const index = clampLevelIndex(levelIndex);
        const isBest = score > this.data.bestScores[index];

        if (isBest)
        {
            this.data.bestScores[index] = score;

            this.persist();
        }

        return isBest;
    }
}
