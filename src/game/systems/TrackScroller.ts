import { Scene } from 'phaser';
import {
    DEPTH_TRACK,
    GAME_HEIGHT,
    GAME_WIDTH,
    HORIZON_Y,
    LANE_COUNT,
    LANE_LINE_THICKNESS,
    LANE_WIDTH,
    RUNG_SPACING,
    RUNG_THICKNESS,
    TRACK_EDGE_THICKNESS,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { WorldSpec } from '../config/worlds';
import { depthScale, fillProjectedQuad, projectX, VANISH_X } from './Projection';
import { screenYFor } from './World';

/** The corridor's own colours, which each world re-tints. */
export interface TrackPalette
{
    track: number;
    laneLine: number;
    trackEdge: number;
    rung: number;
}

/** Drawn past the bottom of the screen so the road's near end is never seen. */
const OVERDRAW = 260;

/** How far ahead the road is drawn, in world distance. */
const VIEW_DISTANCE = 26000;

/** Ground beyond the road's edges, so the path floats on something. */
const GROUND_SPREAD = 3.4;

/** Rungs closer together than this on screen are skipped as unreadable mush. */
const MIN_RUNG_GAP = 3;

/**
 * The road the drop travels along, drawn in perspective towards the horizon.
 *
 * Redrawn every frame into one Graphics. Perspective moves every point by its
 * own depth, so a lane divider is a converging line and a cross-bar is a
 * shorter, narrower one the further off it is - shapes no axis-aligned
 * rectangle can express.
 *
 * The projection is linear in screen y, so straight things stay straight and
 * only the two ends of each line need projecting.
 */
export class TrackScroller
{
    private readonly gfx: Phaser.GameObjects.Graphics;
    private readonly palette: TrackPalette;
    private readonly ground: number;

    constructor (scene: Scene, world: WorldSpec)
    {
        this.palette = world;

        //  The ground reads as the road's own surface pushed out to either side
        //  and dimmed, which keeps the path sitting *in* the world.
        this.ground = world.groundColor ?? world.track;

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_TRACK);
    }

    update (distance: number): void
    {
        const gfx = this.gfx;
        const near = GAME_HEIGHT + OVERDRAW;
        const far = screenYFor(distance + VIEW_DISTANCE, distance);

        gfx.clear();

        this.fillGround(gfx, near, far);
        this.fillRoad(gfx, near, far);
        this.strokeRungs(gfx, distance, near);
        this.strokeRails(gfx, near, far);
    }

    /** The plane the road sits on, running back to the horizon. */
    private fillGround (gfx: Phaser.GameObjects.Graphics, near: number, far: number): void
    {
        const spread = TRACK_WIDTH * GROUND_SPREAD;
        const left = (GAME_WIDTH / 2) - spread;
        const right = (GAME_WIDTH / 2) + spread;

        gfx.fillStyle(this.ground, 1);
        gfx.fillTriangle(0, GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT, GAME_WIDTH, HORIZON_Y);
        gfx.fillTriangle(0, GAME_HEIGHT, GAME_WIDTH, HORIZON_Y, 0, HORIZON_Y);

        //  A slightly lighter apron either side of the path, so the road is a
        //  surface rather than a stripe painted on nothing.
        gfx.fillStyle(this.palette.track, 0.45);
        fillProjectedQuad(gfx, left, right, far, near);
    }

    private fillRoad (gfx: Phaser.GameObjects.Graphics, near: number, far: number): void
    {
        gfx.fillStyle(this.palette.track, 1);

        fillProjectedQuad(gfx, TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH, far, near);
    }

    /** Lane dividers and edges, converging on the vanishing point. */
    private strokeRails (gfx: Phaser.GameObjects.Graphics, near: number, far: number): void
    {
        gfx.lineStyle(LANE_LINE_THICKNESS, this.palette.laneLine, 0.9);

        for (let i = 1; i < LANE_COUNT; i++)
        {
            const x = TRACK_LEFT + (i * LANE_WIDTH);

            gfx.lineBetween(projectX(x, far), far, projectX(x, near), near);
        }

        gfx.lineStyle(TRACK_EDGE_THICKNESS, this.palette.trackEdge, 1);

        for (const x of [ TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH ])
        {
            gfx.lineBetween(projectX(x, far), far, projectX(x, near), near);
        }
    }

    /**
     * Cross-bars laid at fixed distances along the road, not at fixed gaps on
     * screen. Perspective then bunches them towards the horizon by itself,
     * which is most of what reads as speed and depth.
     */
    private strokeRungs (gfx: Phaser.GameObjects.Graphics, distance: number, near: number): void
    {
        const right = TRACK_LEFT + TRACK_WIDTH;

        //  Start at the last bar already behind the player and walk away.
        let index = Math.floor(distance / RUNG_SPACING);
        let previousY = Number.POSITIVE_INFINITY;

        for (let i = 0; i < 240; i++, index++)
        {
            const y = screenYFor(index * RUNG_SPACING, distance);

            if (y > near) { continue; }

            //  Once they are within a few pixels of each other they are no
            //  longer bars, just noise on the horizon.
            if (previousY - y < MIN_RUNG_GAP) { break; }

            previousY = y;

            gfx.lineStyle(Math.max(1, RUNG_THICKNESS * depthScale(y)), this.palette.rung, 0.85);
            gfx.lineBetween(projectX(TRACK_LEFT, y), y, projectX(right, y), y);
        }
    }
}

/** The vanishing point, for anything that needs to line up with the road. */
export { VANISH_X };
