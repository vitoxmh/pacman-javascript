const CONFIG = {
    game: {
        tileSize: 8,
        readyTimer: 4.5,
        canvas: {
            width: 500,
            height: 600
        }
    },

    pacman: {
        type: 'mspacman',
        speed: 7,
        startX: 13,
        startY: 23,
        animSpeed: 12
    },

    ghost: {
        baseSpeed: 7,
        frightenedSpeed: 3.5,
        deadSpeed: 14,
        houseSpeed: 3.5,
        tunnelSpeed: 3,
        animSpeed: 8,

        frightenedDuration: 5,
        flashDuration: 2,

        scatterDuration: 7,
        chaseDuration: 20,

        exitDelay: {
            pink: 0,
            cyan: 2000,
            orange: 4000
        },

        startPositions: {
            blinky: { x: 13, y: 11 },
            pinky: { x: 13.5, y: 14 },
            inky: { x: 11.5, y: 14 },
            clyde: { x: 15.5, y: 14 }
        },

        colors: {
            blinky: 'red',
            pinky: 'pink',
            inky: 'cyan',
            clyde: 'orange'
        },

        scatterTargets: {
            blinky: { x: 1, y: 1 },
            pinky: { x: 30, y: 1 },
            inky: { x: 27, y: 1 },
            clyde: { x: 27, y: 30 }
        }
    },

    score: {
        pellet: 10,
        powerPellet: 50,
        ghostEat: [200, 400, 800, 1600],
        fruit: [100, 300, 500, 700, 1000, 2000, 5000],
        fruitAppear: [15, 30]
    },

    fruit: [
        { x: 13.5, y: 17, sprite: 'cherry' },      // Nivel 1
        { x: 13.5, y: 17, sprite: 'strawberry' }, // Nivel 2
        { x: 13.5, y: 17, sprite: 'orange' },      // Nivel 3
        { x: 13.5, y: 17, sprite: 'apple' },       // Nivel 4
        { x: 13.5, y: 17, sprite: 'grape' },      // Nivel 5
        { x: 13.5, y: 17, sprite: 'melon' },      // Nivel 6
        { x: 13.5, y: 17, sprite: 'galaxian' },   // Nivel 7+
    ],

    tileColors: {
        1: { color12: '#0000FF', color13: '#000000' },
        2: { color12: '#FF0000', color13: '#FFB7AE' },
        3: { color12: '#00D900', color13: '#00FF7F' },
        4: { color12: '#00D900', color13: '#00FF7F' }
    },

    debug: {
        showDebugGrid: false,
        debugModeEnabled: false
    }
};
