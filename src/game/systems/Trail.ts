import { Scene } from 'phaser';
import {
    DEPTH_TRAIL,
    TRAIL_ALPHA,
    TRAIL_FADE_DISTANCE,
    TRAIL_STAMP_SPACING,
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

        //  Drawn as a ribbon of quads between one mark and the next, rather than
        //  a blob at each. Blobs have to overlap to look continuous, and every
        //  overlap doubles the alpha - which reads as a string of beads however
        //  close together they are put. Consecutive quads share an edge exactly,
        //  so the streak is even along its length and still free to fade.
        for (let i = 0; i < this.stamps.length - 1; i++)
        {
            const near = this.edge(this.stamps[i + 1], travelled);
            const far = this.edge(this.stamps[i], travelled);

            this.gfx.fillStyle(color, TRAIL_ALPHA * ((near.strength + far.strength) / 2));

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
    private edge (stamp: { distance: number; x: number }, travelled: number)
    {
        const age = (travelled - stamp.distance) / TRAIL_FADE_DISTANCE;
        const y = screenYFor(stamp.distance, travelled);
        const projected = project(stamp.x, y);

        //  Narrows as well as fades, so the streak tapers away behind rather
        //  than ending on a line.
        const half = (TRAIL_WIDTH / 2) * projected.scale * (1 - (age * TRAIL_TAPER));

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
