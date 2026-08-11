import { Scene } from 'phaser';
import {
    DEPTH_TRAIL,
    TRAIL_ALPHA,
    TRAIL_FADE_DISTANCE,
    TRAIL_STAMP_SPACING,
    TRAIL_SURGE,
    TRAIL_SURGE_CAP,
    TRAIL_SURGE_DECAY,
    TRAIL_TAPER,
    TRAIL_WIDTH
} from '../config/constants';
import { project } from './Projection';
import { screenYFor } from './World';

/**
 * The wet streak the drop leaves on the road.
 *
 * A liquid travelling at speed should mark what it travels over, and this is
 * the only thing on screen that shows where the drop has *been* - everything
 * else is about where it is going.
 *
 * Marks are stamped at a fixed spacing along the course, not once a frame, so
 * the streak is the same length whatever the level's speed and whatever the
 * frame rate does. Each is remembered as a point on the course rather than a
 * point on screen, so the projection carries it away exactly as it carries the
 * road, and pausing holds it still.
 */
export class Trail
{
    private readonly gfx: Phaser.GameObjects.Graphics;

    /** Where the drop was, oldest first. */
    private readonly stamps: Array<{ distance: number; x: number }> = [];

    private lastStamp = -Infinity;

    /**
     * Extra thickness from collecting, and the point on the course it was last
     * topped up at.
     *
     * Held as a distance rather than a timer so a fast level gets the same
     * surge as a slow one, and so it stops dead when the run is paused.
     */
    private surge = 0;
    private surgeAt = 0;

    constructor (scene: Scene)
    {
        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_TRAIL);
    }

    /**
     * @param travelled How far the drop has come.
     * @param x         Its track-space position now.
     * @param color     The colour it is carrying, which the streak takes on.
     */
    /**
     * A collect thickens the streak briefly. Consecutive collects stack, which
     * is what makes a combo build visibly without anything having to count it.
     */
    boost (travelled: number): void
    {
        this.surge = Math.min(TRAIL_SURGE_CAP, this.strengthAt(travelled) + TRAIL_SURGE);
        this.surgeAt = travelled;
    }

    /** What is left of the surge by this point on the course. */
    private strengthAt (travelled: number): number
    {
        const gone = (travelled - this.surgeAt) / TRAIL_SURGE_DECAY;

        return Math.max(0, this.surge * (1 - gone));
    }

    update (travelled: number, x: number, color: number): void
    {
        if (travelled - this.lastStamp >= TRAIL_STAMP_SPACING)
        {
            this.stamps.push({ distance: travelled, x });
            this.lastStamp = travelled;
        }

        //  Drop marks from the front of the queue once they have faded out, so
        //  the list stays as short as the trail is long.
        while (this.stamps.length > 0 && travelled - this.stamps[0].distance > TRAIL_FADE_DISTANCE)
        {
            this.stamps.shift();
        }

        this.gfx.clear();

        const swell = 1 + this.strengthAt(travelled);

        //  Drawn as a ribbon of quads between one mark and the next, rather than
        //  a blob at each. Blobs have to overlap to look continuous, and every
        //  overlap doubles the alpha - which reads as a string of beads however
        //  close together they are put. Consecutive quads share an edge exactly,
        //  so the streak is even along its length and still free to fade.
        for (let i = 0; i < this.stamps.length - 1; i++)
        {
            const near = this.edge(this.stamps[i + 1], travelled, swell);
            const far = this.edge(this.stamps[i], travelled, swell);

            this.gfx.fillStyle(color, Math.min(1, TRAIL_ALPHA * swell * ((near.strength + far.strength) / 2)));

            this.gfx.beginPath();
            this.gfx.moveTo(far.left, far.y);
            this.gfx.lineTo(far.right, far.y);
            this.gfx.lineTo(near.right, near.y);
            this.gfx.lineTo(near.left, near.y);
            this.gfx.closePath();
            this.gfx.fillPath();
        }
    }

    /**
     * One mark worked out as a pair of screen edges: where the streak's sides
     * are at that point, and how strongly it still shows there.
     */
    private edge (stamp: { distance: number; x: number }, travelled: number, swell: number)
    {
        const age = (travelled - stamp.distance) / TRAIL_FADE_DISTANCE;
        const y = screenYFor(stamp.distance, travelled);
        const projected = project(stamp.x, y);

        //  Narrows as well as fades, so the streak tapers away behind rather
        //  than ending on a line.
        const half = (TRAIL_WIDTH / 2) * projected.scale * swell * (1 - (age * TRAIL_TAPER));

        return {
            y,
            left: projected.x - half,
            right: projected.x + half,
            strength: 1 - age
        };
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
