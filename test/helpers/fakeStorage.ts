/**
 * A stand-in for localStorage, with counters so tests can assert on how often
 * the game writes - not only on what it stores.
 */
export class FakeStorage
{
    private readonly entries = new Map<string, string>();

    reads = 0;
    writes = 0;

    /** When set, every access throws, as Safari's private mode does. */
    throwOnAccess = false;

    getItem (key: string): string | null
    {
        this.reads += 1;

        return this.entries.has(key) ? this.entries.get(key)! : null;
    }

    setItem (key: string, value: string): void
    {
        this.writes += 1;
        this.entries.set(key, String(value));
    }

    removeItem (key: string): void
    {
        this.entries.delete(key);
    }

    /** Reads without counting, for assertions. */
    peek (key: string): string | null
    {
        return this.entries.has(key) ? this.entries.get(key)! : null;
    }

    seed (key: string, value: string): void
    {
        this.entries.set(key, value);
    }
}

/**
 * Installs a fake `window.localStorage`. The game reaches for the real one at
 * call time, so this only has to exist before a SaveSystem is built.
 */
export function installStorage (storage: FakeStorage): void
{
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: {
            get localStorage ()
            {
                if (storage.throwOnAccess)
                {
                    throw new Error('access denied');
                }

                return storage;
            }
        }
    });
}

export function uninstallStorage (): void
{
    delete (globalThis as Record<string, unknown>).window;
}
