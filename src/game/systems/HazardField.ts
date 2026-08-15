import { Scene } from 'phaser';
import {
    COLOR_VALUES,
    DEPTH_TRACK,
    DRAW_DISTANCE,
    DROP_SCREEN_Y,
    HAZARD_BAND_SPACING,
    HAZARD_BAND_ALPHA,
    HAZARD_EDGE_ALPHA,
    HAZARD_EDGE_THICKNESS,
    HAZARD_PLAIN_COLOR,
    HAZARD_SLASH_ALPHA,
    HAZARD_SLASH_THICKNESS,
    HAZARD_SLASHES,
    HAZARD_WASH_ALPHA,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { HazardZone } from '../config/level';
import { fillProjectedQuad, projectX } from './Projection';
import { screenYFor } from './World';

/**
 * The stretches of road that cost score to be on.
 *
 * A drain the player cannot see is not a hazard, it is a bug they will report
 * as one: the only answers to a zone are to cross it quickly and to arrive with
 * enough score to pay, and both are decisions that have to be made before the
 * drop is inside it. So the zone is drawn on the road from as far away as
 * anything else is, and its far edge is drawn too - knowing where it ends is
 * what turns being inside one from a punishment into a stretch to get through.
 *
 * Drawn under everything that stands on the road, because it is the road. The
 * bands run across it rather than along it so they read as ground being covered
 * rather than as lanes, and they are pinned to absolute distance rather than to
 * how far the drop has come, so they hold still on the road instead of crawling
 * along with the camera.
 */
export class HazardField
{
    private readonly gfx: Phaser.GameObjects.Graphics;

    private zones: HazardZone[] = [];

    constructor (scene: Scene)
    {
        this.gfx = scene.add.graphics();

        //  Just above the road surface and below everything standing on it.
        this.gfx.setDepth(DEPTH_TRACK + 1);
    }

    setZones (zones: HazardZone[]): void
    {
        this.zones = zones;
    }

    update (travelled: number): void
    {
        const gfx = this.gfx;

        gfx.clear();

        for (const zone of this.zones)
        {
            //  Only the part of it on screen. A zone can be thousands of pixels
            //  long, and the far end of one is behind the horizon.
            const from = Math.max(zone.from, travelled - 200);
            const to = Math.min(zone.to, travelled + DRAW_DISTANCE);

            if (to <= from)
            {
                continue;
            }

            const color = zone.color === undefined
                ? HAZARD_PLAIN_COLOR
                : COLOR_VALUES[zone.color];

            this.wash(gfx, from, to, travelled, color);
            this.bands(gfx, from, to, travelled, color);

            //  Always amber, whatever the zone objects to. Hue says *which*
            //  colour is unwelcome here, and hue alone cannot say that anything
            //  is unwelcome at all - a green zone washed green reads as a place
            //  to go rather than a place to hurry through. The frame is the
            //  part that means hazard, and it is the same on every one.
            this.edges(gfx, zone, travelled, HAZARD_PLAIN_COLOR);
        }
    }

    /** The ground itself, tinted. */
    private wash (
        gfx: Phaser.GameObjects.Graphics,
        from: number,
        to: number,
        travelled: number,
        color: number
    ): void
    {
        gfx.fillStyle(color, HAZARD_WASH_ALPHA);
        fillProjectedQuad(
            gfx,
            TRACK_LEFT,
            TRACK_LEFT + TRACK_WIDTH,
            screenYFor(to, travelled),
            screenYFor(from, travelled)
        );
    }

    /**
     * Bars across the road, at fixed points along the course.
     *
     * Stepped from a multiple of the spacing rather than from the zone's own
     * start, so every zone's bars line up with every other's and the rhythm is
     * the same one wherever the player meets it.
     *
     * Each carries a slash leaning against the direction of travel. Hatching
     * leaning the wrong way is the oldest "do not" mark there is, it is already
     * what every barrier in this game wears, and unlike a colour it means the
     * same thing whatever hue it is drawn in.
     */
    private bands (
        gfx: Phaser.GameObjects.Graphics,
        from: number,
        to: number,
        travelled: number,
        color: number
    ): void
    {
        const first = Math.ceil(from / HAZARD_BAND_SPACING) * HAZARD_BAND_SPACING;

        for (let at = first; at < to; at += HAZARD_BAND_SPACING)
        {
            const near = screenYFor(at, travelled);
            const far = screenYFor(at + (HAZARD_BAND_SPACING / 2), travelled);

            //  Behind the drop the projection folds over; nothing back there is
            //  worth drawing.
            if (near > DROP_SCREEN_Y + 40)
            {
                continue;
            }

            gfx.fillStyle(color, HAZARD_BAND_ALPHA);
            fillProjectedQuad(gfx, TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH, far, near);

            gfx.lineStyle(HAZARD_SLASH_THICKNESS, color, HAZARD_SLASH_ALPHA);

            for (let i = 0; i < HAZARD_SLASHES; i++)
            {
                const t = (i + 0.5) / HAZARD_SLASHES;
                const lean = TRACK_WIDTH / (HAZARD_SLASHES * 2);
                const left = TRACK_LEFT + (TRACK_WIDTH * t);

                gfx.lineBetween(
                    projectX(left, near),
                    near,
                    projectX(left + lean, far),
                    far
                );
            }
        }
    }

    /**
     * Lines across the road where the zone starts and where it stops.
     *
     * The far one matters more than the near one. Being inside a drain with no
     * idea how much of it is left is the difference between a stretch of road
     * and a punishment, and the player should be able to see the end from the
     * moment they can see the start.
     */
    private edges (
        gfx: Phaser.GameObjects.Graphics,
        zone: HazardZone,
        travelled: number,
        color: number
    ): void
    {
        for (const at of [ zone.from, zone.to ])
        {
            const y = screenYFor(at, travelled);

            if (y > DROP_SCREEN_Y + 40 || at - travelled > DRAW_DISTANCE)
            {
                continue;
            }

            gfx.lineStyle(HAZARD_EDGE_THICKNESS, color, HAZARD_EDGE_ALPHA);
            gfx.lineBetween(
                projectX(TRACK_LEFT, y),
                y,
                projectX(TRACK_LEFT + TRACK_WIDTH, y),
                y
            );
        }
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
