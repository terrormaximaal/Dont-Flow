import { AUTO, Game, Scale } from 'phaser';
import { COLOR_BG, GAME_HEIGHT, GAME_WIDTH } from './config/constants';
import { LevelSelect } from './scenes/LevelSelect';
import { Play } from './scenes/Play';
import { Title } from './scenes/Title';

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
    //  The game owns its own audio: every sound in it is synthesised on the
    //  spot by `systems/SoundSystem`, and there is not a single file for
    //  Phaser's sound manager to play. Left on, it opens a second audio context
    //  the game never uses, and browsers allow only a handful of them.
    audio: {
        noAudio: true
    },
    //  First in the list is the scene the game boots into.
    scene: [
        Title,
        LevelSelect,
        Play
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
