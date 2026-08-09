import { Scene } from 'phaser';
import {
    COLOR_ENERGY_EMPTY,
    COLOR_ENERGY_FULL,
    COLOR_HUD_DIM,
    DEPTH_HUD,
    ENERGY_PIP_GAP,
    ENERGY_PIP_RADIUS,
    ENERGY_TIMER_OFFSET,
    ENERGY_TIMER_SIZE,
    GAME_WIDTH,
    HUD_FONT,
    MAX_ENERGY
} from '../config/constants';
import { EnergySystem } from '../systems/EnergySystem';

/**
 * A row of pips for energy in hand, with the wait for the next one underneath.
 *
 * The countdown is redrawn only when the displayed second changes, so a
 * per-frame refresh costs nothing.
 */
export class EnergyMeter
{
    private readonly energy: EnergySystem;
    private readonly pips: Phaser.GameObjects.Arc[] = [];
    private readonly timerText: Phaser.GameObjects.Text;

    private shownEnergy = -1;
    private shownLabel = '';

    /**
     * @param layer Optional container to draw into. Overlays need this: their
     *              own depth puts them above the HUD, so a meter left at HUD
     *              depth would render underneath the dim.
     */
    constructor (scene: Scene, y: number, energy: EnergySystem, layer?: Phaser.GameObjects.Container)
    {
        this.energy = energy;

        const step = (ENERGY_PIP_RADIUS * 2) + ENERGY_PIP_GAP;
        const left = (GAME_WIDTH / 2) - (((MAX_ENERGY - 1) * step) / 2);

        const place = (object: Phaser.GameObjects.Arc | Phaser.GameObjects.Text) => {

            if (layer)
            {
                layer.add(object);
            }
            else
            {
                object.setDepth(DEPTH_HUD);
            }

        };

        for (let i = 0; i < MAX_ENERGY; i++)
        {
            const pip = scene.add.circle(left + (i * step), y, ENERGY_PIP_RADIUS, COLOR_ENERGY_EMPTY);

            place(pip);

            this.pips.push(pip);
        }

        this.timerText = scene.add.text(GAME_WIDTH / 2, y + ENERGY_TIMER_OFFSET, '', {
            fontFamily: HUD_FONT,
            fontSize: ENERGY_TIMER_SIZE,
            color: COLOR_HUD_DIM
        });

        this.timerText.setOrigin(0.5, 0);

        place(this.timerText);

        this.update();
    }

    update (): void
    {
        const current = this.energy.getEnergy();

        if (current !== this.shownEnergy)
        {
            this.shownEnergy = current;

            this.pips.forEach((pip, index) => pip.setFillStyle(index < current ? COLOR_ENERGY_FULL : COLOR_ENERGY_EMPTY));
        }

        const remaining = this.energy.getMsUntilNextRefill();
        const label = remaining === 0 ? 'ENERGY FULL' : `NEXT IN ${EnergyMeter.formatTime(remaining)}`;

        if (label !== this.shownLabel)
        {
            this.shownLabel = label;

            this.timerText.setText(label);
        }
    }

    private static formatTime (ms: number): string
    {
        //  Round up, so the last second reads 0:01 rather than sitting on 0:00.
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
}
