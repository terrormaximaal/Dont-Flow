import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', () => {

    const game = StartGame('game-container');

    //  Reachable from the console and from a test harness while developing.
    //  Guarded on the dev flag, which Vite replaces with a literal at build
    //  time - so the whole branch is dropped from the production bundle rather
    //  than shipping a handle to the game's internals.
    if (import.meta.env.DEV)
    {
        (window as unknown as { game: unknown }).game = game;
    }

});