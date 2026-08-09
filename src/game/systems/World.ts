import { DROP_SCREEN_Y } from '../config/constants';

//  Everything on the course is placed at a distance along the track rather than
//  at a screen position. The drop is pinned to DROP_SCREEN_Y, so an object sits
//  exactly on the drop at the moment `travelled` reaches its distance - which is
//  also the moment it counts as hit.

/**
 * Screen y for an object at `distance`, given how far the drop has travelled.
 */
export function screenYFor (distance: number, travelled: number): number
{
    return DROP_SCREEN_Y - (distance - travelled);
}
