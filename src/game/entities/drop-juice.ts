import {
    DROP_GROWTH_FULL_SCORE,
    DROP_GROWTH_MAX_SCALE,
    DROP_GROWTH_SPEED,
    DROP_IDLE_SPEED,
    DROP_IDLE_SQUASH,
    DROP_IDLE_SWAY,
    DROP_POP_AMOUNT,
    DROP_POP_SPEED
} from '../config/constants';
import { clamp, easeTowards } from '../utils/math';

/**
 * The drop's cosmetic life: how big it has grown, the pop when it swallows an
 * orb, and the idle breathing that keeps it from looking frozen.
 *
 * Split out of `Drop` because none of it is gameplay - nothing here is ever
 * read by collision, so these numbers can be tuned freely without changing how
 * hard the game is. `Drop` keeps the lane logic, this keeps the feel.
 */
export class DropJuice
{
    /** Eased 0..1 progress towards full size. */
    private growth = 0;

    /** Where `growth` is heading, set from the score. */
    private growthTarget = 0;

    /** Decaying overshoot from the last orb. */
    private pop = 0;

    /** Seconds since the run began, driving the idle cycles. */
    private elapsed = 0;

    /**
     * Point the drop at the size its score has earned. A penalty lowers the
     * score, so the drop deflates again on its own - no separate call needed.
     */
    setScore (score: number): void
    {
        this.growthTarget = clamp(score / DROP_GROWTH_FULL_SCORE, 0, 1);
    }

    /**
     * Swallowing an orb: a one-off wobble on top of whatever size it is.
     */
    pulse (): void
    {
        this.pop = DROP_POP_AMOUNT;
    }

    /**
     * @param dt Seconds since the last frame.
     */
    update (dt: number): void
    {
        this.elapsed += dt;

        this.growth = easeTowards(this.growth, this.growthTarget, DROP_GROWTH_SPEED, dt);
        this.pop = easeTowards(this.pop, 0, DROP_POP_SPEED, dt);
    }

    /** Seconds since the run began, for anything on the drop's own clock. */
    getElapsed (): number
    {
        return this.elapsed;
    }

    /**
     * How churned up the surface should be, 0 to 1: full right after an orb,
     * settling back to nothing. Normalised so the pop's size can be tuned
     * without also changing how hard the drop ripples.
     */
    getAgitation (): number
    {
        return this.pop / DROP_POP_AMOUNT;
    }

    /** Overall size multiplier, from the score. */
    getSize (): number
    {
        return 1 + (this.growth * (DROP_GROWTH_MAX_SCALE - 1));
    }

    /**
     * How much wider than tall the drop should be right now: the idle breathing
     * plus whatever is left of the last pop.
     */
    getSquash (): number
    {
        return (Math.sin(this.elapsed * DROP_IDLE_SPEED) * DROP_IDLE_SQUASH) + this.pop;
    }

    /** Radians of idle sway. */
    getSway (): number
    {
        return Math.sin(this.elapsed * DROP_IDLE_SPEED * 0.6) * DROP_IDLE_SWAY;
    }
}
