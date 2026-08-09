import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: [ 'test/**/*.test.ts' ],

        //  The suite covers the game's pure logic - level compilation, save
        //  validation, energy refills - none of which touches Phaser or a real
        //  DOM. The browser globals these need are stubbed per test, which keeps
        //  the run fast and free of a jsdom dependency.
        environment: 'node'
    }
});
