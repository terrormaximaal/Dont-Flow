import { Scene } from 'phaser';
import { ColorId, CULL_MARGIN, GAME_HEIGHT } from '../config/constants';
import { Level } from '../config/level';
import { GatePair } from '../entities/GatePair';

export interface CourseEvents
{
    /** The drop has passed through one of a pair's gates. */
    onGate: (color: ColorId) => void;
}

/**
 * Owns everything placed along the track, moves it past the drop, and reports
 * what the drop has just passed through.
 *
 * Hit detection is a distance comparison rather than an overlap test: an object
 * is "reached" the moment `travelled` passes its distance. That cannot tunnel
 * at any speed, and it makes the moment of contact exact.
 */
export class Course
{
    private gates: GatePair[] = [];

    private readonly events: CourseEvents;

    constructor (scene: Scene, level: Level, events: CourseEvents)
    {
        this.events = events;

        //  The whole course is only a few dozen objects, so it is built up
        //  front and culled behind the drop rather than streamed in.
        for (const spec of level.gates)
        {
            this.gates.push(new GatePair(scene, spec));
        }
    }

    /**
     * @param travelled Distance the drop has covered.
     * @param dropX     Current screen x of the drop, for deciding which gate it
     *                  went through.
     */
    update (travelled: number, dropX: number): void
    {
        const cullY = GAME_HEIGHT + CULL_MARGIN;

        for (let i = this.gates.length - 1; i >= 0; i--)
        {
            const gate = this.gates[i];
            const y = gate.update(travelled);

            if (!gate.triggered && travelled >= gate.distance)
            {
                gate.triggered = true;

                this.events.onGate(gate.colorAt(dropX));
            }

            if (y > cullY)
            {
                gate.destroy();
                this.gates.splice(i, 1);
            }
        }
    }
}
