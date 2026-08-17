import { EnergySystem } from './EnergySystem';

//  Noticing that the wait is over.
//
//  Both menu screens ask `mayStart()` once, while they are being built, and
//  hand the answer to everything on them: the title builds its buttons locked
//  or live from it, and the level select only gives a stop a hit area at all if
//  it is startable. Neither ever asks again.
//
//  The meter, meanwhile, updates every frame. So a player sitting on either
//  screen waiting for energy watches the countdown run out and the meter credit
//  them - and the screen still says NO ENERGY, and no stop can be tapped.
//  Measured on the level select with the flag on: energy 1, mayStart true, and
//  not one stop on the screen with a hit area. The only way through is to leave
//  the screen and come back, which is not a thing anybody would think to try.
//
//  This is what the waiting is *for*. If energy is ever switched on, the one
//  moment it has to get right is the moment it ends.

/**
 * Whether the answer to "can a level be started" has changed since it was asked.
 *
 * Pure, and given both the old answer and the system rather than holding state
 * of its own, so a scene can ask every frame without this needing to know
 * anything about scenes.
 */
export function energyChanged (energy: EnergySystem, since: boolean): boolean
{
    return energy.mayStart() !== since;
}
