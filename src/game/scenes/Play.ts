import { Scene } from 'phaser';
import { FORWARD_SPEED, MAX_DELTA } from '../config/constants';
import { Drop } from '../entities/Drop';
import { InputSystem } from '../systems/InputSystem';
import { TrackScroller } from '../systems/TrackScroller';

/**
 * The one and only scene for now. It owns the single piece of shared state -
 * how far we have flowed - and pumps the systems each frame.
 */
export class Play extends Scene
{
    private drop: Drop;
    private track: TrackScroller;
    private input_: InputSystem;

    /** Distance travelled in track pixels. Everything else is placed from this. */
    private distance = 0;

    constructor ()
    {
        super('Play');
    }

    create ()
    {
        this.track = new TrackScroller(this);
        this.drop = new Drop(this);

        this.input_ = new InputSystem(this, (direction) => this.drop.moveLane(direction));

        this.events.once('shutdown', () => this.input_.destroy());
    }

    update (_time: number, delta: number)
    {
        //  Clamp so a stalled frame cannot jump the drop across the track.
        const dt = Math.min(delta / 1000, MAX_DELTA);

        this.distance += FORWARD_SPEED * dt;

        this.track.update(this.distance);
        this.drop.update(dt);
    }
}
