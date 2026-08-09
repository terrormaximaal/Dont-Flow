import { Scene } from 'phaser';
import {
    COLOR_VALUES,
    ColorId,
    DEPTH_GATES,
    GATE_BAR_THICKNESS,
    GATE_HEIGHT,
    GATE_PANEL_ALPHA,
    GATE_POST_ALPHA,
    GATE_POST_WIDTH,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { GatePairSpec } from '../config/level';
import { gateSideAt, gateSplitX } from '../systems/contact';
import { depthScale, fillProjectedQuad, projectX } from '../systems/Projection';
import { screenYFor } from '../systems/World';

/**
 * Two gates side by side spanning the track. Passing through one repaints the
 * drop; the pair covers the whole track, so passing through is unavoidable.
 *
 * Drawn as projected quads rather than rectangles: the corridor leans, so the
 * near and far edges of a gate sit at different offsets and widths.
 */
export class GatePair
{
    readonly distance: number;

    /** Set once the drop has passed, so a pair can only fire a single time. */
    triggered = false;

    private readonly splitX: number;
    private readonly splitAfterLane: 0 | 1;
    private readonly colors: [ ColorId, ColorId ];
    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene, spec: GatePairSpec)
    {
        this.distance = spec.distance;
        this.colors = spec.colors;
        this.splitAfterLane = spec.splitAfterLane;
        this.splitX = gateSplitX(spec.splitAfterLane);

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_GATES);
    }

    /**
     * Which gate a given track-space x falls inside.
     */
    colorAt (x: number): ColorId
    {
        return this.colors[gateSideAt(x, this.splitAfterLane)];
    }

    update (travelled: number): number
    {
        const y = screenYFor(this.distance, travelled);

        const near = y + (GATE_HEIGHT / 2);
        const far = y - (GATE_HEIGHT / 2);

        const gfx = this.gfx;

        gfx.clear();

        this.drawGate(gfx, TRACK_LEFT, this.splitX, this.colors[0], near, far);
        this.drawGate(gfx, this.splitX, TRACK_LEFT + TRACK_WIDTH, this.colors[1], near, far);

        //  The post makes the boundary between the two gates readable at speed.
        gfx.lineStyle(GATE_POST_WIDTH * depthScale(y), 0xffffff, GATE_POST_ALPHA);
        gfx.lineBetween(projectX(this.splitX, far), far, projectX(this.splitX, near), near);

        return y;
    }

    /**
     * One gate: a translucent panel with a solid bar on its near and far edge.
     */
    private drawGate (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        right: number,
        color: ColorId,
        near: number,
        far: number
    ): void
    {
        const value = COLOR_VALUES[color];

        gfx.fillStyle(value, GATE_PANEL_ALPHA);

        fillProjectedQuad(gfx, left, right, far, near);

        for (const edge of [ far, near ])
        {
            gfx.lineStyle(GATE_BAR_THICKNESS * depthScale(edge), value, 1);
            gfx.lineBetween(projectX(left, edge), edge, projectX(right, edge), edge);
        }
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
