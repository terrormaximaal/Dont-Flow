import { ENERGY_COST_PER_LEVEL, ENERGY_ENABLED, ENERGY_REFILL_MS, MAX_ENERGY } from '../config/constants';
import { SaveSystem } from './SaveSystem';

/**
 * Energy: how many level attempts are in hand, refilling with real time.
 *
 * Refills are worked out lazily from a single stored timestamp rather than
 * ticked, so time passes while the game is closed and there is no timer to keep
 * alive. `energyAt` marks the start of the interval currently being waited out.
 *
 * Note this trusts the device clock, so winding it forward grants energy. That
 * is inherent to storing progress locally - a server-checked clock is the only
 * real fix, and there is no server.
 */
export class EnergySystem
{
    private readonly save: SaveSystem;

    constructor (save: SaveSystem)
    {
        this.save = save;

        this.refresh();
    }

    /**
     * Credits any energy earned since the last check. Safe to call as often as
     * you like: it only writes when something actually changed.
     */
    private refresh (): void
    {
        const energy = this.save.getEnergy();

        //  At the cap there is nothing to credit, and no timestamp to keep:
        //  spend() starts a fresh interval the moment energy drops below max, so
        //  time spent full can never bank up.
        //
        //  Returning here also matters for cost. This runs once a frame behind
        //  the menu meter, and re-anchoring the timestamp to now would have
        //  meant a synchronous localStorage write on every one of those frames.
        if (energy >= MAX_ENERGY)
        {
            return;
        }

        const now = Date.now();

        //  A clock that has moved backwards would otherwise leave a timestamp in
        //  the future and stall refills indefinitely.
        const at = Math.min(this.save.getEnergyAt(), now);
        const gained = Math.floor((now - at) / ENERGY_REFILL_MS);

        if (gained <= 0)
        {
            //  Still writes back a clamped timestamp, but only when the clamp
            //  actually changed something; setEnergy ignores a no-op.
            this.save.setEnergy(energy, at);

            return;
        }

        const credited = Math.min(MAX_ENERGY, energy + gained);

        //  Advance by whole intervals rather than to now, so the part of the
        //  current interval already waited is not thrown away.
        this.save.setEnergy(credited, credited >= MAX_ENERGY ? now : at + (gained * ENERGY_REFILL_MS));
    }

    getEnergy (): number
    {
        this.refresh();

        return this.save.getEnergy();
    }

    canPlay (): boolean
    {
        return this.getEnergy() >= ENERGY_COST_PER_LEVEL;
    }

    /**
     * Whether the game should let a level start.
     *
     * This is what the scenes and menus ask, rather than `canPlay` - with the
     * system switched off every level is free, while `canPlay` stays the honest
     * answer about the energy itself, which is what the meter and the tests are
     * about.
     */
    mayStart (): boolean
    {
        return !ENERGY_ENABLED || this.canPlay();
    }

    /**
     * Charges for a level start, or waves it through when the system is off.
     *
     * @returns false only when there was genuinely not enough, in which case
     *          nothing was spent.
     */
    charge (): boolean
    {
        return !ENERGY_ENABLED || this.spend();
    }

    /**
     * Milliseconds until the next energy arrives, or 0 when already full.
     */
    getMsUntilNextRefill (): number
    {
        if (this.getEnergy() >= MAX_ENERGY)
        {
            return 0;
        }

        const elapsed = Date.now() - this.save.getEnergyAt();

        return Math.max(0, ENERGY_REFILL_MS - elapsed);
    }

    /**
     * Charges for a level start.
     *
     * @returns false if there was not enough energy, in which case nothing was
     *          spent.
     */
    spend (): boolean
    {
        if (!this.canPlay())
        {
            return false;
        }

        const wasFull = this.save.getEnergy() >= MAX_ENERGY;

        //  Dropping below the cap starts a fresh interval; below it already, the
        //  one in progress keeps running.
        const at = wasFull ? Date.now() : this.save.getEnergyAt();

        this.save.setEnergy(this.save.getEnergy() - ENERGY_COST_PER_LEVEL, at);

        return true;
    }
}
