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

    private readonly finish: FinishGate | null;
    private readonly events: CourseEvents;
    private readonly scene: Scene;

    /**
     * @param endless Whether the course has an end at all. An endless one gets
     *                no finish gate and is topped up by `extend` as the drop
     *                works through it - a run that cannot be completed must
     *                not have a finish line drawn somewhere in front of it.
     */
    constructor (scene: Scene, level: Level, events: CourseEvents, endless = false)
    {
        this.scene = scene;
        this.events = events;
        this.finish = endless ? null : new FinishGate(scene, level.finishDistance);

        this.extend(level);
    }

    /**
     * Adds more course in front of what is already there.
     *
     * A level's worth is only a few dozen objects, which is why the whole thing
     * used to be built at once. An endless run cannot be: the pieces arrive a
     * batch at a time and the ones behind the drop are culled, so the number
     * standing at any moment stays about what a level costs however long the
     * run goes on.
     */
    extend (level: Level): void
    {
        for (const spec of level.gates)
        {
            this.gates.push(new GatePair(this.scene, spec));
        }

        for (const spec of level.orbs)
        {
            this.orbs.push(new Orb(this.scene, spec));
        }

        for (const spec of level.obstacles)
        {
            this.obstacles.push(new Obstacle(this.scene, spec));
        }
    }

    /**
     * @param travelled Distance the drop has covered.
     * @param dropX     Current track x of the drop, never a projected one.
     * @param targetX   Centre of the lane the drop is heading for.
     * @param dropColor The drop's colour, or null before its first gate.
     * @param wild      Whether a rainbow drop is in hand, which matches every
     *                  colour there is: each orb scores and no barrier blocks.
     * @param dropHeight How far off the road the drop is, 0 to 1. High enough
     *                  and it sails over whatever it is passing.
     */
    update (
        travelled: number,
        dropX: number,
        targetX: number,
        dropColor: ColorId | null,
        wild = false,
        dropHeight = 0
    ): void
    {
        const cullY = GAME_HEIGHT + CULL_MARGIN;

        this.updateGates(travelled, dropX, cullY);
        this.updateObstacles(travelled, dropX, dropColor, wild, cullY, dropHeight);
        this.updateOrbs(travelled, dropX, targetX, dropColor, wild, cullY, dropHeight);

        if (this.finish === null)
        {
            return;
        }

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
            const y = gate.update(travelled, dropX);

            if (!gate.triggered && travelled >= gate.distance)
            {
                gate.triggered = true;

                //  A barred doorway costs what a wall costs and repaints the
                //  drop anyway. Charging without repainting would leave the
                //  player carrying the last section's colour into this one,
                //  which turns one missed reading into a section of unmatchable
                //  orbs - a mistake should cost what it costs and then be over.
                if (gate.isSealed(dropX))
                {
                    this.events.onBlocked(dropX, y);
                }

                this.events.onGate(gate.colorAt(dropX, travelled));
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
        cullY: number,
        dropHeight: number
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

                //  A disappearing floor that is shut right now is road, and
                //  road is not an obstacle. Asked here rather than inside
                //  isBlockedBy because it is not a question about where the
                //  drop is: the barrier is not there to be hit.
                const blocked = obstacle.presentAt(travelled) && isBlockedBy(
                    dropX,
                    centre,
                    obstacle.halfWidthAt(travelled),
                    dropHeight,
                    obstacle.profile
                );

                //  Colour excuses a barrier of the same colour, and a rainbow
                //  excuses any of them - but neither excuses a hole. There is
                //  nothing to match: the road is simply not there.
                const excused = obstacle.profile !== 'gap' && (wild || obstacle.color === dropColor);

                if (!excused && blocked)
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
        cullY: number,
        dropHeight: number
    ): void
    {
        for (let i = this.orbs.length - 1; i >= 0; i--)
        {
            const orb = this.orbs[i];

            //  The same question drives both what an orb does and what it is
            //  worth, so it is asked once: would this orb be taken right now?
            //  An orb that leans out towards the drop is then always one the
            //  drop is really about to swallow.
            const touching = isOrbTouched(dropX, targetX, orb.x, dropHeight);

            const y = orb.update(travelled, dropX, touching);

            //  Reaching an orb's distance is only half of it - the drop also has
            //  to be in the right place across the track, settling there rather
            //  than sliding through, and on the road rather than over it. Orbs it
            //  steers around, crosses on its way elsewhere, or jumps clean over
            //  are simply left behind.
            if (!orb.consumed && travelled >= orb.distance)
            {
                orb.consumed = true;

                if (touching)
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
