import { Scene } from 'phaser';
import {
    COLOR_LANE_LINE,
    COLOR_RUNG,
    COLOR_TRACK,
    COLOR_TRACK_EDGE,
    DEPTH_TRACK,
    GAME_HEIGHT,
    LANE_COUNT,
    LANE_LINE_THICKNESS,
    LANE_WIDTH,
    RUNG_SPACING,
    RUNG_THICKNESS,
    SIDE_TICK_GAP,
    SIDE_TICK_PARALLAX,
    SIDE_TICK_SPACING,
    SIDE_TICK_THICKNESS,
    SIDE_TICK_WIDTH,
    TRACK_EDGE_THICKNESS,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { WorldSpec } from '../config/worlds';
import { depthScale, fillProjectedQuad, projectX } from './Projection';

/** The corridor's own colours, which each world re-tints. */
export interface TrackPalette
{
    track: number;
    laneLine: number;
    trackEdge: number;
    rung: number;
}

const DEFAULT_PALETTE: TrackPalette = {
    track: COLOR_TRACK,
    laneLine: COLOR_LANE_LINE,
    trackEdge: COLOR_TRACK_EDGE,
    rung: COLOR_RUNG
};

/** How far beyond the screen the corridor is drawn, so its ends are never seen. */
const OVERDRAW = 140;

const TOP = -OVERDRAW;
const BOTTOM = GAME_HEIGHT + OVERDRAW;

/**
 * The corridor the drop travels down, drawn as a diagonal run through the world.
 *
 * Redrawn every frame into a single Graphics rather than moving a pool of
 * rectangles. The projection shifts every point by its own depth, so a lane
 * divider is a slanted line and a cross-bar is a shifted, narrowed one - shapes
 * that cannot be expressed by moving an axis-aligned rectangle. It is a few
 * dozen line segments a frame, which costs nothing.
 *
 * The projection is affine, so straight lines stay straight and only the two
 * ends of each need projecting.
 */
export class TrackScroller
{
    private readonly gfx: Phaser.GameObjects.Graphics;

    /** Wrap length, kept an exact multiple of the spacing. */
    private readonly rungSpan: number;
    private readonly sideSpan: number;
    private readonly rungCount: number;
    private readonly sideCount: number;
    private readonly palette: TrackPalette;

    constructor (scene: Scene, world?: WorldSpec)
    {
        //  A corridor drawn in fixed colours would vanish into a light world and
        //  glare out of a dark one.
        this.palette = world ?? DEFAULT_PALETTE;

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_TRACK);

        const span = BOTTOM - TOP;

        this.rungCount = Math.ceil(span / RUNG_SPACING);
        this.rungSpan = this.rungCount * RUNG_SPACING;

        this.sideCount = Math.ceil(span / SIDE_TICK_SPACING);
        this.sideSpan = this.sideCount * SIDE_TICK_SPACING;
    }

    /**
     * @param distance How far the drop has travelled, in track pixels.
     */
    update (distance: number): void
    {
        const gfx = this.gfx;

        gfx.clear();

        this.fillSlab(gfx);
        this.strokeRails(gfx);
        this.strokeRungs(gfx, distance);
        this.strokeSideTicks(gfx, distance);
    }

    /** The corridor floor: a quad, since the two ends are different widths. */
    private fillSlab (gfx: Phaser.GameObjects.Graphics): void
    {
        gfx.fillStyle(this.palette.track, 1);

        fillProjectedQuad(gfx, TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH, TOP, BOTTOM);
    }

    /** Lane dividers and the two outer edges, running away down the corridor. */
    private strokeRails (gfx: Phaser.GameObjects.Graphics): void
    {
        gfx.lineStyle(LANE_LINE_THICKNESS, this.palette.laneLine, 1);

        for (let i = 1; i < LANE_COUNT; i++)
        {
            const x = TRACK_LEFT + (i * LANE_WIDTH);

            gfx.lineBetween(projectX(x, TOP), TOP, projectX(x, BOTTOM), BOTTOM);
        }

        gfx.lineStyle(TRACK_EDGE_THICKNESS, this.palette.trackEdge, 1);

        for (const x of [ TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH ])
        {
            gfx.lineBetween(projectX(x, TOP), TOP, projectX(x, BOTTOM), BOTTOM);
        }
    }

    /** Cross-bars flowing towards the player, which is what reads as speed. */
    private strokeRungs (gfx: Phaser.GameObjects.Graphics, distance: number): void
    {
        const right = TRACK_LEFT + TRACK_WIDTH;

        for (let i = 0; i < this.rungCount; i++)
        {
            const y = TOP + ((((i * RUNG_SPACING) + distance) % this.rungSpan));

            //  Thinner with distance, along with everything else at that depth.
            gfx.lineStyle(RUNG_THICKNESS * depthScale(y), this.palette.rung, 1);
            gfx.lineBetween(projectX(TRACK_LEFT, y), y, projectX(right, y), y);
        }
    }

    /** Marks outside the corridor, scrolling slower to give the world depth. */
    private strokeSideTicks (gfx: Phaser.GameObjects.Graphics, distance: number): void
    {
        const sideDistance = distance * SIDE_TICK_PARALLAX;

        const leftOuter = TRACK_LEFT - SIDE_TICK_GAP - SIDE_TICK_WIDTH;
        const leftInner = TRACK_LEFT - SIDE_TICK_GAP;
        const rightInner = TRACK_LEFT + TRACK_WIDTH + SIDE_TICK_GAP;
        const rightOuter = rightInner + SIDE_TICK_WIDTH;

        for (let i = 0; i < this.sideCount; i++)
        {
            const y = TOP + ((((i * SIDE_TICK_SPACING) + sideDistance) % this.sideSpan));

            gfx.lineStyle(SIDE_TICK_THICKNESS * depthScale(y), this.palette.laneLine, 0.8);
            gfx.lineBetween(projectX(leftOuter, y), y, projectX(leftInner, y), y);
            gfx.lineBetween(projectX(rightInner, y), y, projectX(rightOuter, y), y);
        }
    }
}
