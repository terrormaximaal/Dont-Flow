import { Scene } from 'phaser';
import {
    COLOR_LANE_LINE,
    COLOR_RUNG,
    COLOR_SIDE_TICK,
    COLOR_TRACK,
    COLOR_TRACK_EDGE,
    DEPTH_RUNGS,
    DEPTH_TRACK,
    GAME_HEIGHT,
    GAME_WIDTH,
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

/**
 * Draws the track and scrolls it to sell forward motion.
 *
 * Nothing here actually moves through the world: a fixed pool of bars is
 * repositioned by `distance % span` every frame, so the cost is constant no
 * matter how far the player travels.
 */
export class TrackScroller
{
    private readonly rungs: Phaser.GameObjects.Rectangle[] = [];
    private readonly sideTicks: Phaser.GameObjects.Rectangle[] = [];

    /** Wrap length for the rungs, kept an exact multiple of the spacing. */
    private readonly rungSpan: number;
    private readonly sideSpan: number;

    constructor (scene: Scene)
    {
        this.drawStaticTrack(scene);

        const rungCount = Math.ceil((GAME_HEIGHT + RUNG_SPACING) / RUNG_SPACING);

        this.rungSpan = rungCount * RUNG_SPACING;

        for (let i = 0; i < rungCount; i++)
        {
            const rung = scene.add.rectangle(GAME_WIDTH / 2, 0, TRACK_WIDTH, RUNG_THICKNESS, COLOR_RUNG);

            rung.setDepth(DEPTH_RUNGS);

            this.rungs.push(rung);
        }

        const sideCount = Math.ceil((GAME_HEIGHT + SIDE_TICK_SPACING) / SIDE_TICK_SPACING);

        this.sideSpan = sideCount * SIDE_TICK_SPACING;

        const leftX = TRACK_LEFT - SIDE_TICK_GAP - (SIDE_TICK_WIDTH / 2);
        const rightX = TRACK_LEFT + TRACK_WIDTH + SIDE_TICK_GAP + (SIDE_TICK_WIDTH / 2);

        for (let i = 0; i < sideCount; i++)
        {
            for (const x of [ leftX, rightX ])
            {
                const tick = scene.add.rectangle(x, 0, SIDE_TICK_WIDTH, SIDE_TICK_THICKNESS, COLOR_SIDE_TICK);

                tick.setDepth(DEPTH_TRACK);

                this.sideTicks.push(tick);
            }
        }
    }

    /**
     * The parts that never move: the track slab, the lane dividers and the two
     * outer edges.
     */
    private drawStaticTrack (scene: Scene): void
    {
        const slab = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, TRACK_WIDTH, GAME_HEIGHT, COLOR_TRACK);

        slab.setDepth(DEPTH_TRACK);

        for (let i = 1; i < LANE_COUNT; i++)
        {
            const line = scene.add.rectangle(
                TRACK_LEFT + (i * LANE_WIDTH),
                GAME_HEIGHT / 2,
                LANE_LINE_THICKNESS,
                GAME_HEIGHT,
                COLOR_LANE_LINE
            );

            line.setDepth(DEPTH_TRACK);
        }

        for (const x of [ TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH ])
        {
            const edge = scene.add.rectangle(x, GAME_HEIGHT / 2, TRACK_EDGE_THICKNESS, GAME_HEIGHT, COLOR_TRACK_EDGE);

            edge.setDepth(DEPTH_TRACK);
        }
    }

    /**
     * @param distance How far the drop has travelled, in track pixels.
     */
    update (distance: number): void
    {
        for (let i = 0; i < this.rungs.length; i++)
        {
            this.rungs[i].y = (((i * RUNG_SPACING) + distance) % this.rungSpan) - RUNG_SPACING;
        }

        //  The side marks scroll slower than the track, which reads as distance.
        const sideDistance = distance * SIDE_TICK_PARALLAX;

        for (let i = 0; i < this.sideTicks.length; i++)
        {
            //  Two ticks (left and right) share each row, hence the halving.
            const row = Math.floor(i / 2);

            this.sideTicks[i].y = (((row * SIDE_TICK_SPACING) + sideDistance) % this.sideSpan) - SIDE_TICK_SPACING;
        }
    }
}
