import { Scene } from 'phaser';
import { DEPTH_ROADSIDE, GAME_HEIGHT, GAME_WIDTH, TRACK_WIDTH } from '../config/constants';
import { LayerShape, RoadsideSpec } from '../config/worlds';
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

    constructor (scene: Scene, spec: RoadsideSpec)
    {
        this.spec = spec;

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
                    spec.alpha * strength
                );
            }
        }
    }

    private prop (
        gfx: Phaser.GameObjects.Graphics,
        trackX: number,
        y: number,
        height: number,
        alpha: number
    ): void
    {
        const x = projectX(trackX, y);
        const scale = depthScale(y);
        const width = height * 0.42;

        if (height < 1.5) { return; }

        gfx.fillStyle(this.spec.color, alpha);

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
            gfx.fillStyle(this.spec.color, alpha * 0.4);
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

        //  'peaks', 'hills' and 'dunes' all stand as a simple mound.
        gfx.fillTriangle(x - width, y, x, y - height, x + width, y);

        void scale;
    }
}

/** Deterministic -1..1 from an index, so a prop is identical on every run. */
function wobble (n: number): number
{
    return Math.sin(n * 127.1) * 0.5 + Math.sin(n * 311.7) * 0.5;
}
