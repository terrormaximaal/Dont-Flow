import { Scene } from 'phaser';
import {
    DEPTH_GROUND,
    DEPTH_TRACK,
    EDGE_GLOW_ALPHA,
    EDGE_GLOW_LAYERS,
    EDGE_GLOW_SPREAD,
    GAME_HEIGHT,
    GAME_WIDTH,
    HORIZON_Y,
    LANE_LINE_THICKNESS,
    ROAD_CONTACT_ALPHA,
    ROAD_CONTACT_WIDTH,
    ROAD_DEPTH_ALPHA,
    ROAD_DEPTH_BANDS,
    ROAD_SHEEN_LAYERS,
    ROAD_SHEEN_WIDTH,
    STRIP_INSET,
    STRIP_WIDTH,
    TRACK_EDGE_THICKNESS,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { WorldSpec } from '../config/worlds';
import { RoadSurface, resolveSurface } from './roadSurface';
import { depthScale, fillProjectedQuad, projectX, VANISH_X } from './Projection';
import { laneCount, laneWidth } from './Lanes';
import { visibleStrips } from './strips';
import { airAtHorizon, hazeHorizon } from './horizon';
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

//  The road used to be drawn out to a fixed distance - 26000 - and stop there.
//  Measured, that left its far end 20 pixels short of the horizon and still 15
//  pixels wide: a blunt stub with a wedge of bare ground above it, which is
//  what "the road doesn't reach the horizon" looked like. There is no distance
//  that fixes it, because the projection only approaches the horizon - it would
//  take 553000 to come within a pixel.
//
//  So the far end is the horizon itself, which is exactly where a flat straight
//  road converges. The quad closes to a point there rather than a stub, and the
//  haze bands wash the last of it into the world's own air.

/** Dashes shorter than this on screen are a dotted line, not a divider. */
const MIN_DASH_PIXELS = 3;

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

    /**
     * The ground is a separate layer below the road, so anything standing on it
     * - roadside scenery - can be drawn between the two. Painted into the same
     * Graphics it would simply cover them.
     */
    private readonly groundGfx: Phaser.GameObjects.Graphics;

    private readonly palette: TrackPalette;
    private readonly ground: number;

    /** How this world marks its road, with every gap filled from the default. */
    private readonly surface: RoadSurface;

    /** The world's own atmosphere, which the far end of the road fades into. */
    private readonly haze: number;

    /** The sky's colour at the horizon, which is where all of it ends up. */
    private readonly air: number;

    constructor (scene: Scene, world: WorldSpec)
    {
        this.palette = world;

        //  The ground reads as the road's own surface pushed out to either side
        //  and dimmed, which keeps the path sitting *in* the world.
        this.ground = world.groundColor ?? world.track;
        this.haze = world.hazeColor;
        this.air = airAtHorizon(world);

        this.surface = resolveSurface(world.surface);

        this.groundGfx = scene.add.graphics();
        this.groundGfx.setDepth(DEPTH_GROUND);

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_TRACK);
    }

    update (distance: number): void
    {
        const gfx = this.gfx;
        const near = GAME_HEIGHT + OVERDRAW;
        const far = HORIZON_Y;

        gfx.clear();
        this.groundGfx.clear();

        this.fillGround(this.groundGfx, near, far);
        this.fillRoad(gfx, near, far);

        //  Order matters: shade the surface, light it, then lay the markings on
        //  top so nothing washes them out.
        this.hazeDepth(gfx, near, far);
        this.fillSheen(gfx, near, far);
        this.strokeStrips(gfx, distance, near);
        this.strokeRungs(gfx, distance, near);
        this.strokeRails(gfx, near, far);
        this.strokeDashes(gfx, distance, near);
        this.glowEdges(gfx, near, far);

        //  Last, over the road, the scenery and the ground alike: the far end of
        //  all three going to air together is what makes them one distance
        //  rather than three things that each stop somewhere.
        hazeHorizon(gfx, this.air);
    }

    /**
     * The far end of the road fading into the world's own atmosphere.
     *
     * Aerial perspective, and the direction matters: distance washes a surface
     * out towards the colour of the air in front of it, it does not darken it.
     * The first attempt here laid black over the far road and it read as dirt -
     * the road got muddier rather than deeper.
     *
     * Drawn in many thin bands rather than a few thick ones. Each band is a
     * flat tone, so the step between two of them is visible as a line across
     * the road unless the step is small enough to disappear.
     */
    private hazeDepth (gfx: Phaser.GameObjects.Graphics, near: number, far: number): void
    {
        const left = TRACK_LEFT - ROAD_CONTACT_WIDTH;
        const right = TRACK_LEFT + TRACK_WIDTH + ROAD_CONTACT_WIDTH;

        for (let band = 0; band < ROAD_DEPTH_BANDS; band++)
        {
            const from = far + ((near - far) * (band / ROAD_DEPTH_BANDS));
            const to = far + ((near - far) * ((band + 1) / ROAD_DEPTH_BANDS));

            //  Strongest at the far end, gone by the time the road arrives.
            const strength = 1 - (band / ROAD_DEPTH_BANDS);

            gfx.fillStyle(this.haze, ROAD_DEPTH_ALPHA * strength * strength);
            fillProjectedQuad(gfx, left, right, from, to);
        }
    }

    /** A soft sheen down the middle, as if the sky were reflected in the surface. */
    private fillSheen (gfx: Phaser.GameObjects.Graphics, near: number, far: number): void
    {
        const middle = TRACK_LEFT + (TRACK_WIDTH / 2);

        if (this.surface.sheenAlpha <= 0)
        {
            return;
        }

        for (let layer = ROAD_SHEEN_LAYERS; layer > 0; layer--)
        {
            const half = (TRACK_WIDTH / 2) * ROAD_SHEEN_WIDTH * (layer / ROAD_SHEEN_LAYERS);

            //  Only over the near half of the road: a reflection reaching all
            //  the way to the horizon reads as fog sitting on the surface.
            gfx.fillStyle(0xffffff, this.surface.sheenAlpha);
            fillProjectedQuad(gfx, middle - half, middle + half, (far + near) / 2, near);
        }
    }

    /**
     * Light strips running down the road, spaced further apart than the rungs
     * so they sweep past at a visibly different rate.
     *
     * Two rates of movement read as more speed than one, because the eye takes
     * the difference between them rather than either alone.
     */
    private strokeStrips (gfx: Phaser.GameObjects.Graphics, distance: number, near: number): void
    {
        if (this.surface.stripAlpha <= 0)
        {
            return;
        }

        const inset = TRACK_WIDTH * STRIP_INSET;
        const left = TRACK_LEFT + inset;
        const right = TRACK_LEFT + TRACK_WIDTH - inset;

        for (const strip of visibleStrips(distance, near))
        {
            gfx.fillStyle(this.palette.trackEdge, this.surface.stripAlpha * strip.strength);

            fillProjectedQuad(gfx, left, left + STRIP_WIDTH, strip.y, strip.tailY);
            fillProjectedQuad(gfx, right - STRIP_WIDTH, right, strip.y, strip.tailY);
        }
    }

    /** Soft light along the road's two edges, widest and faintest outermost. */
    private glowEdges (gfx: Phaser.GameObjects.Graphics, near: number, far: number): void
    {
        for (let layer = EDGE_GLOW_LAYERS; layer > 0; layer--)
        {
            const spread = EDGE_GLOW_SPREAD * (layer / EDGE_GLOW_LAYERS);

            gfx.lineStyle(TRACK_EDGE_THICKNESS + (spread * 2), this.palette.trackEdge, EDGE_GLOW_ALPHA);

            for (const x of [ TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH ])
            {
                gfx.lineBetween(projectX(x, far), far, projectX(x, near), near);
            }
        }
    }

    /** The plane the road sits on, running back to the horizon. */
    private fillGround (gfx: Phaser.GameObjects.Graphics, near: number, far: number): void
    {
        gfx.fillStyle(this.ground, 1);
        gfx.fillTriangle(0, GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT, GAME_WIDTH, HORIZON_Y);
        gfx.fillTriangle(0, GAME_HEIGHT, GAME_WIDTH, HORIZON_Y, 0, HORIZON_Y);

        //  A verge hugging each edge of the road, so the path meets the ground
        //  at a worn margin rather than a cut line.
        const verge = this.surface.vergeWidth;

        gfx.fillStyle(this.palette.track, 0.4);
        fillProjectedQuad(gfx, TRACK_LEFT - verge, TRACK_LEFT + TRACK_WIDTH + verge, far, near);

        //  A darker band right against the road, which seats it on the verge
        //  instead of letting the two meet as one flat join.
        gfx.fillStyle(0x000000, ROAD_CONTACT_ALPHA);
        fillProjectedQuad(gfx, TRACK_LEFT - ROAD_CONTACT_WIDTH, TRACK_LEFT, far, near);
        fillProjectedQuad(gfx, TRACK_LEFT + TRACK_WIDTH, TRACK_LEFT + TRACK_WIDTH + ROAD_CONTACT_WIDTH, far, near);
    }

    private fillRoad (gfx: Phaser.GameObjects.Graphics, near: number, far: number): void
    {
        gfx.fillStyle(this.palette.track, 1);

        fillProjectedQuad(gfx, TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH, far, near);
    }

    /** Lane dividers and edges, converging on the vanishing point. */
    private strokeRails (gfx: Phaser.GameObjects.Graphics, near: number, far: number): void
    {
        //  A world that dashes its dividers draws them in strokeDashes, and a
        //  solid line underneath would defeat the whole point of dashing them.
        if (this.surface.dashSpacing === undefined)
        {
            gfx.lineStyle(LANE_LINE_THICKNESS, this.palette.laneLine, 0.9);

            for (let i = 1; i < laneCount(); i++)
            {
                const x = TRACK_LEFT + (i * laneWidth());

                gfx.lineBetween(projectX(x, far), far, projectX(x, near), near);
            }
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

        if (this.surface.rungAlpha <= 0)
        {
            return;
        }

        const spacing = this.surface.rungSpacing;

        //  Start at the last bar already behind the player and walk away.
        let index = Math.floor(distance / spacing);
        let previousY = Number.POSITIVE_INFINITY;

        for (let i = 0; i < 240; i++, index++)
        {
            const y = screenYFor(index * spacing, distance);

            if (y > near) { continue; }

            //  Once they are within a few pixels of each other they are no
            //  longer bars, just noise on the horizon.
            if (previousY - y < MIN_RUNG_GAP) { break; }

            previousY = y;

            gfx.lineStyle(
                Math.max(1, this.surface.rungThickness * depthScale(y)),
                this.palette.rung,
                this.surface.rungAlpha
            );

            gfx.lineBetween(projectX(TRACK_LEFT, y), y, projectX(right, y), y);
        }
    }

    /**
     * Lane dividers broken into dashes, for the worlds that mark a road rather
     * than a grid.
     *
     * Laid at fixed distances along the track like the rungs, so perspective
     * bunches them towards the horizon by itself - dashes at a fixed gap on
     * screen would slide up the road at a rate unrelated to travelling, which
     * is the one thing that would make them read as wrong.
     */
    private strokeDashes (gfx: Phaser.GameObjects.Graphics, distance: number, near: number): void
    {
        const spacing = this.surface.dashSpacing;

        if (spacing === undefined)
        {
            return;
        }

        const length = this.surface.dashLength ?? spacing / 2;

        let index = Math.floor(distance / spacing);

        for (let i = 0; i < 120; i++, index++)
        {
            const head = index * spacing;

            const y = screenYFor(head, distance);
            const tailY = screenYFor(head + length, distance);

            if (y > near) { continue; }

            //  Once a dash is a few pixels long it is a speck, and a column of
            //  specks on the horizon reads as noise rather than as a divider.
            if (y - tailY < MIN_DASH_PIXELS) { break; }

            gfx.fillStyle(this.palette.laneLine, 0.9);

            for (let lane = 1; lane < laneCount(); lane++)
            {
                const x = TRACK_LEFT + (lane * laneWidth());
                const half = LANE_LINE_THICKNESS * 1.6;

                fillProjectedQuad(gfx, x - half, x + half, tailY, y);
            }
        }
    }
}

/** The vanishing point, for anything that needs to line up with the road. */
export { VANISH_X };
