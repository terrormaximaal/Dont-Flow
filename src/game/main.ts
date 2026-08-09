import { AUTO, Game, Scale } from 'phaser';
import { COLOR_BG, GAME_HEIGHT, GAME_WIDTH } from './config/constants';
import { Play } from './scenes/Play';

//  The game is authored in portrait at a fixed design resolution and letterboxed
//  to fit whatever screen it lands on, so every device sees the same layout.
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: COLOR_BG,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        Play
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
