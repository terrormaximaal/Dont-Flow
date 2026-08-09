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
    LANE_WIDTH,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { GatePairSpec } from '../config/level';
import { screenYFor } from '../systems/World';

/**
 * Two gates side by side spanning the track. Passing through one repaints the
 * drop; the pair covers the whole track, so passing through is unavoidable.
 */
export class GatePair
{
    readonly distance: number;

    /** Set once the drop has passed, so a pair can only fire a single time. */
    triggered = false;

    private readonly splitX: number;
    private readonly colors: [ ColorId, ColorId ];
    private readonly container: Phaser.GameObjects.Container;

    constructor (scene: Scene, spec: GatePairSpec)
    {
        this.distance = spec.distance;
        this.colors = spec.colors;
        this.splitX = TRACK_LEFT + ((spec.splitAfterLane + 1) * LANE_WIDTH);

        this.container = scene.add.container(0, 0);
        this.container.setDepth(DEPTH_GATES);

        this.buildGate(scene, TRACK_LEFT, this.splitX, this.colors[0]);
        this.buildGate(scene, this.splitX, TRACK_LEFT + TRACK_WIDTH, this.colors[1]);

        //  The post makes the boundary between the two gates readable at speed.
        const post = scene.add.rectangle(this.splitX, 0, GATE_POST_WIDTH, GATE_HEIGHT, 0xffffff, GATE_POST_ALPHA);

        this.container.add(post);
    }

    /**
     * One gate: a translucent panel with a solid bar on its leading and
     * trailing edge, drawn relative to the pair's centre line.
     */
    private buildGate (scene: Scene, left: number, right: number, color: ColorId): void
    {
        const width = right - left;
        const centerX = left + (width / 2);
        const value = COLOR_VALUES[color];

        const panel = scene.add.rectangle(centerX, 0, width, GATE_HEIGHT, value, GATE_PANEL_ALPHA);

        this.container.add(panel);

        for (const edge of [ -GATE_HEIGHT / 2, GATE_HEIGHT / 2 ])
        {
            const bar = scene.add.rectangle(centerX, edge, width, GATE_BAR_THICKNESS, value);

            this.container.add(bar);
        }
    }

    /**
     * Which gate a given screen x falls inside.
     */
    colorAt (x: number): ColorId
    {
        return x < this.splitX ? this.colors[0] : this.colors[1];
    }

    update (travelled: number): number
    {
        const y = screenYFor(this.distance, travelled);

        this.container.y = y;

        return y;
    }

    destroy (): void
    {
        this.container.destroy();
    }
}
