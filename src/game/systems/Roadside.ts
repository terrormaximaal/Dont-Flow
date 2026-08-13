import { Scene } from 'phaser';
import {
    DEPTH_ROADSIDE,
    GAME_HEIGHT,
    GAME_WIDTH,
    LIGHT_X,
    PROP_LIGHT_LIFT,
    PROP_LIT_OFFSET,
    PROP_LIT_TINT,
    PROP_LIT_WIDTH,
    PROP_SHADOW_ALPHA,
    PROP_SHADOW_LENGTH,
    PROP_SHADOW_SQUASH,
    TRACK_WIDTH
} from '../config/constants';
import { LayerShape, RoadsideSpec } from '../config/worlds';
import { mixColor } from '../utils/color';
import { fogAt } from '../ui/lighting';
import { depthScale, projectX } from './Projection';
import { drawStrength, screenYFor } from './World';

/**
 * Props stand between the ground and the road, so they are rooted in the world
 * but can never cover the surface the game is played on.
 */
const ROADSIDE_DEPTH = DEPTH_ROADSIDE;

/** How far back props are placed, in world distance. */
const ROADSIDE_VIEW = 3400;

/**
 * Scenery standing along the road: trees, rocks, towers, whatever the world
 * calls for.
 *
 * These are placed at distances along the road rather than parallax-scrolled,
 * so they arrive, sweep past and are gone at the speed the drop is travelling.
 * A backdrop can only ever look like a backdrop; something that passes you is
 * what makes the world feel travelled through.
 *
 * Redrawn each frame, because every prop's size and position change with its
 * own depth.
 */
export class Roadside
{
    private readonly gfx: Phaser.GameObjects.Graphics;
    private readonly spec: RoadsideSpec;

    /** The world's air, which distant props fade into. */
    private readonly haze: number;

    /** The prop's colour with the light on it, for the side facing the lamp. */
    private readonly lit: number;

    /** How thick this world's air is, which is how hard the fog bites. */
    private readonly hazeAlpha: number;

    constructor (scene: Scene, spec: RoadsideSpec, haze: number, hazeAlpha: number)
    {
        this.spec = spec;
        this.haze = haze;
        this.hazeAlpha = hazeAlpha;
        //  Lit by the world's own air rather than by white. Light has a
        //  colour, and mixing every prop towards pure white desaturates it -
        //  space's blue shards came out pale grey, lit by a lamp from some
        //  other world. Brightened first, so a world with dark air still lights
        //  its scenery rather than shading it.
        this.lit = mixColor(spec.color, mixColor(haze, 0xffffff, PROP_LIGHT_LIFT), PROP_LIT_TINT);

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(ROADSIDE_DEPTH);
    }

    update (travelled: number): void
    {
        const gfx = this.gfx;
        const spec = this.spec;

        gfx.clear();

        //  Walk the props from the nearest behind the player to the far limit,
        //  drawing the far ones first so nearer props overlap them correctly.
        const first = Math.floor(travelled / spec.spacing);
        const last = Math.ceil((travelled + ROADSIDE_VIEW) / spec.spacing);

        for (let index = last; index >= first; index--)
        {
            const distance = index * spec.spacing;
            const y = screenYFor(distance, travelled);

            if (y > GAME_HEIGHT + 200) { continue; }

            const scale = depthScale(y);

            if (scale <= 0.02) { continue; }

            const strength = drawStrength(distance, travelled);

            if (strength <= 0) { continue; }

            //  Both sides, mirrored, with each prop varied from its index so the
            //  roadside never repeats visibly.
            for (const side of [ -1, 1 ])
            {
                const jitter = wobble(index * 7.13 * side);
                const out = (TRACK_WIDTH / 2) + spec.offset + (jitter * spec.offset * 0.4);

                this.prop(
                    gfx,
                    (GAME_WIDTH / 2) + (out * side),
                    y,
                    spec.height * scale * (0.7 + (wobble(index * 3.7 * side) * 0.6)),
                    spec.alpha * strength,
                    scale
                );
            }
        }
    }

    private prop (
        gfx: Phaser.GameObjects.Graphics,
        trackX: number,
        y: number,
        height: number,
        alpha: number,
        scale: number
    ): void
    {
        const x = projectX(trackX, y);
        const width = height * 0.42;

        if (height < 1.5) { return; }

        //  Its shadow first, thrown along the ground away from the light, so
        //  the prop stands on the world rather than in front of it.
        gfx.fillStyle(0x000000, PROP_SHADOW_ALPHA * alpha);
        gfx.fillEllipse(
            x - (LIGHT_X * width * PROP_SHADOW_LENGTH),
            y,
            width * 2.2,
            width * 2.2 * PROP_SHADOW_SQUASH
        );

        //  Distance fades a prop into the world's own air, exactly as it does
        //  the road. Without it, scenery beside a road receding into haze reads
        //  as cut out and pasted on. How far is the world's own business: a
        //  world with thin air barely fogs at all.
        const fog = fogAt(scale, this.hazeAlpha);

        this.shape(gfx, x, y, width, height, mixColor(this.spec.color, this.haze, fog), alpha);

        //  A narrow strip shifted towards the light, which is the lit edge.
        //  Doing it this way rather than per shape means every prop in every
        //  world is lit from the same place for free.
        this.shape(
            gfx,
            x + (LIGHT_X * width * PROP_LIT_OFFSET),
            y,
            width * PROP_LIT_WIDTH,
            height,
            mixColor(this.lit, this.haze, fog),
            alpha * 0.9
        );
    }

    /** The prop's silhouette in one colour, whatever shape this world uses. */
    private shape (
        gfx: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        width: number,
        height: number,
        color: number,
        alpha: number
    ): void
    {
        gfx.fillStyle(color, alpha);

        const shape: LayerShape = this.spec.shape;

        if (shape === 'trees')
        {
            gfx.fillRect(x - (width * 0.1), y - (height * 0.45), width * 0.2, height * 0.45);
            gfx.fillTriangle(x - width, y - (height * 0.3), x, y - height, x + width, y - (height * 0.3));
            gfx.fillTriangle(x - (width * 0.8), y - (height * 0.6), x, y - (height * 1.25), x + (width * 0.8), y - (height * 0.6));

            return;
        }

        if (shape === 'buildings')
        {
            gfx.fillRect(x - width, y - height, width * 2, height);

            //  A couple of lit windows, which is all a tower needs to read.
            //  Taken from the colour being drawn rather than the spec's, so a
            //  hazed tower's windows haze with it.
            gfx.fillStyle(color, alpha * 0.4);
            gfx.fillRect(x - (width * 0.4), y - (height * 0.8), width * 0.3, height * 0.12);
            gfx.fillRect(x + (width * 0.1), y - (height * 0.5), width * 0.3, height * 0.12);

            return;
        }

        if (shape === 'shards')
        {
            gfx.fillTriangle(x - width, y, x + (width * 0.3), y - height, x + width, y);

            return;
        }

        if (shape === 'blobs')
        {
            gfx.fillCircle(x, y - (height * 0.5), height * 0.5);

            return;
        }

        if (shape === 'mesa')
        {
            gfx.fillRect(x - width, y - height, width * 2, height);
            gfx.fillTriangle(x - width, y - height, x, y - (height * 1.25), x + width, y - height);

            return;
        }

        if (shape === 'hills' || shape === 'dunes')
        {
            this.mound(gfx, x, y, width * 1.5, height);

            return;
        }

        //  'peaks' stand as a sharp cone: rock, not landscape.
        gfx.fillTriangle(x - width, y, x, y - height, x + width, y);
    }

    /**
     * A rounded hump, for the shapes that are landscape rather than rock. Drawn
     * as a fan of triangles from the middle of its own base, because a filled
     * polygon here would have to be closed below the ground line.
     */
    private mound (
        gfx: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        width: number,
        height: number
    ): void
    {
        const steps = 12;

        let previousX = x - width;
        let previousY = y;

        for (let i = 1; i <= steps; i++)
        {
            const t = i / steps;
            const nextX = x - width + (2 * width * t);

            //  A sine hump, flattened slightly so the sides fall away rather
            //  than rising straight out of the ground.
            const nextY = y - (height * Math.pow(Math.sin(Math.PI * t), 0.7));

            gfx.fillTriangle(x, y, previousX, previousY, nextX, nextY);

            previousX = nextX;
            previousY = nextY;
        }
    }
}

/** Deterministic -1..1 from an index, so a prop is identical on every run. */
function wobble (n: number): number
{
    return Math.sin(n * 127.1) * 0.5 + Math.sin(n * 311.7) * 0.5;
}
