/**
 * Small maths helpers.
 *
 * Note: we deliberately do not reach for `Phaser.Math.*` here. The `Phaser`
 * global is only an ambient *type* namespace under the ESM build, so calling it
 * at runtime type-checks fine and then throws "Phaser is not defined" in the
 * browser. Anything used at runtime must be imported, or written here.
 */

export function clamp (value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

/**
 * Eases `current` towards `target` by an exponential rate.
 *
 * `rate` is a rate constant, not a duration: higher is snappier. The result is
 * frame-rate independent, and exactly so - the remaining distance is multiplied
 * by e^(-rate * dt) each call, and those factors compose, so two half steps land
 * precisely where one whole step would. It also never overshoots, which is what
 * lets the drop be re-targeted mid-slide without stuttering.
 */
export function easeTowards (current: number, target: number, rate: number, dt: number): number
{
    if (dt <= 0)
    {
        return current;
    }

    return current + ((target - current) * (1 - Math.exp(-rate * dt)));
}
