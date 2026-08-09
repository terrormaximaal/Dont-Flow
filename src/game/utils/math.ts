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
