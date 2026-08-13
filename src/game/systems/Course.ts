import { Scene } from 'phaser';
import { ColorId, CULL_MARGIN, GAME_HEIGHT } from '../config/constants';
import { Level } from '../config/level';
import { FinishGate } from '../entities/FinishGate';
import { GatePair } from '../entities/GatePair';
import { Obstacle } from '../entities/Obstacle';
import { Orb } from '../entities/Orb';
import { isBlockedBy, isOrbTouched } from './contact';

export interface CourseEvents
{
    /** The drop has passed through one of a pair's gates. */
    onGate: (color: ColorId) => void;

    /** The drop has touched an orb. `matched` is whether the colours agreed. */
    onOrb: (orb: Orb, matched: boolean, y: number) => void;

    /**
     * The drop has hit a barrier of the wrong colour. A matching barrier is
     * passed straight through and never reported.
     */
    onBlocked: (x: number, y: number) => void;

    /** The drop has crossed the finish line. */
    onFinish: () => void;
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
    private orbs: Orb[] = [];
    private obstacles: Obstacle[] = [];

    private readonly finish: FinishGate;
    private readonly events: CourseEvents;

    constructor (scene: Scene, level: Level, events: CourseEvents)
    {
        this.events = events;
        this.finish = new FinishGate(scene, level.finishDistance);

        //  The whole course is only a few dozen objects, so it is built up
        //  front and culled behind the drop rather than streamed in.
        for (const spec of level.gates)
        {
            this.gates.push(new GatePair(scene, spec));
        }

        for (const spec of level.orbs)
        {
            this.orbs.push(new Orb(scene, spec));
        }

        for (const spec of level.obstacles)
        {
            this.obstacles.push(new Obstacle(scene, spec));
        }
    }

    /**
     * @param travelled Distance the drop has covered.
     * @param dropX     Current screen x of the drop.
     * @param targetX   Centre of the lane the drop is heading for.
     * @param dropColor The drop's colour, or null before its first gate.
     * @param wild      Whether a rainbow drop is in hand, which matches every
     *                  colour there is: each orb scores and no barrier blocks.
     */
    update (
        travelled: number,
        dropX: number,
        targetX: number,
        dropColor: ColorId | null,
        wild = false
    ): void
    {
        const cullY = GAME_HEIGHT + CULL_MARGIN;

        this.updateGates(travelled, dropX, cullY);
        this.updateObstacles(travelled, dropX, dropColor, wild, cullY);
        this.updateOrbs(travelled, dropX, targetX, dropColor, wild, cullY);

        this.finish.update(travelled);

        if (!this.finish.triggered && travelled >= this.finish.distance)
        {
            this.finish.triggered = true;

            this.events.onFinish();
        }
    }

    private updateGates (travelled: number, dropX: number, cullY: number): void
    {
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

    private updateObstacles (
        travelled: number,
        dropX: number,
        dropColor: ColorId | null,
        wild: boolean,
        cullY: number
    ): void
    {
        for (let i = this.obstacles.length - 1; i >= 0; i--)
        {
            const obstacle = this.obstacles[i];
            const y = obstacle.update(travelled);

            if (!obstacle.consumed && travelled >= obstacle.distance)
            {
                obstacle.consumed = true;

                //  Position comes from the same functions the barrier just drew
                //  itself with, so what is hit is what was on screen.
                const centre = obstacle.trackXAt(travelled);

                if (!wild && obstacle.color !== dropColor && isBlockedBy(dropX, centre, obstacle.halfWidthAt(travelled)))
                {
                    this.events.onBlocked(centre, y);
                }
            }

            if (y > cullY)
            {
                obstacle.destroy();
                this.obstacles.splice(i, 1);
            }
        }
    }

    private updateOrbs (
        travelled: number,
        dropX: number,
        targetX: number,
        dropColor: ColorId | null,
        wild: boolean,
        cullY: number
    ): void
    {
        for (let i = this.orbs.length - 1; i >= 0; i--)
        {
            const orb = this.orbs[i];
            const y = orb.update(travelled);

            //  Reaching an orb's distance is only half of it - the drop also has
            //  to be in the right place across the track, and settling there
            //  rather than sliding through. Orbs it steers around, or crosses on
            //  its way somewhere else, are simply left behind.
            if (!orb.consumed && travelled >= orb.distance)
            {
                orb.consumed = true;

                if (isOrbTouched(dropX, targetX, orb.x))
                {
                    this.events.onOrb(orb, wild || orb.color === dropColor, y);

                    orb.destroy();
                    this.orbs.splice(i, 1);

                    continue;
                }
            }

            if (y > cullY)
            {
                orb.destroy();
                this.orbs.splice(i, 1);
            }
        }
    }
}
