import { Minesweeper, MinesweeperAI } from './minesweeper.js';

// Constants
const HEIGHT = 8, WIDTH = 8, MINES = 8;
const SCREEN_WIDTH = 600, SCREEN_HEIGHT = 400;
const BLACK = "#000000";
const GRAY = "#B4B4B4";
const WHITE = "#FFFFFF";

// Fonts (Relying on standard Web API string formatting)
const SMALL_FONT = "20px 'Open Sans', sans-serif";
const MEDIUM_FONT = "28px 'Open Sans', sans-serif";
const LARGE_FONT = "40px 'Open Sans', sans-serif";

function main() {
    // Canvas Setup
    const canvas = document.createElement('canvas');
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Load Assets
    const flagImg = new Image();
    flagImg.src = "assets/images/flag.png";
    const mineImg = new Image();
    mineImg.src = "assets/images/mine.png";

    // Board Setup
    const boardPadding = 20;
    const boardW = ((2 / 3) * SCREEN_WIDTH) - (boardPadding * 2);
    const boardH = SCREEN_HEIGHT - (boardPadding * 2);
    const cellSize = Math.min(boardW / WIDTH, boardH / HEIGHT);

    // Game State
    let game = new Minesweeper(HEIGHT, WIDTH, MINES);
    let ai = new MinesweeperAI(HEIGHT, WIDTH);
    
    // JS Sets use referential equality, so we map coords to string keys (e.g., "0,1")
    let revealed = new Set();
    let flags = new Set();
    let lost = false;
    let instructions = true;

    let mx = 0, my = 0;

    // Track mouse position continuously
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mx = e.clientX - rect.left;
        my = e.clientY - rect.top;
    });

    // Right-Click (Flags)
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // Prevent standard browser menu
        if (instructions || lost) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        for (let i = 0; i < HEIGHT; i++) {
            for (let j = 0; j < WIDTH; j++) {
                const cellX = boardPadding + j * cellSize;
                const cellY = boardPadding + i * cellSize;

                if (clickX >= cellX && clickX < cellX + cellSize &&
                    clickY >= cellY && clickY < cellY + cellSize) {
                    
                    const cellKey = `${i},${j}`;
                    if (!revealed.has(cellKey)) {
                        if (flags.has(cellKey)) {
                            flags.delete(cellKey);
                        } else {
                            flags.add(cellKey);
                        }
                    }
                }
            }
        }
    });

    // Left-Click (Interactions & Buttons)
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        if (instructions) {
            const btnX = SCREEN_WIDTH / 4;
            const btnY = (3 / 4) * SCREEN_HEIGHT;
            const btnW = SCREEN_WIDTH / 2;
            const btnH = 50;

            if (clickX >= btnX && clickX <= btnX + btnW &&
                clickY >= btnY && clickY <= btnY + btnH) {
                instructions = false;
            }
        } else if (!lost) {
            // (Add board left-click/AI logic here following similar cell boundary checks...)
        }
    });

    // Render Loop (Replaces the `while True` and `clock.tick(60)` block)
    function draw() {
        ctx.fillStyle = BLACK;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        if (instructions) {
            // Draw Title
            ctx.fillStyle = WHITE;
            ctx.font = LARGE_FONT;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Play Minesweeper", SCREEN_WIDTH / 2, 50);

            // Draw Button
            const btnX = SCREEN_WIDTH / 4;
            const btnY = (3 / 4) * SCREEN_HEIGHT;
            const btnW = SCREEN_WIDTH / 2;
            const btnH = 50;
            
            ctx.fillStyle = WHITE;
            ctx.fillRect(btnX, btnY, btnW, btnH);
            
            ctx.fillStyle = BLACK;
            ctx.font = MEDIUM_FONT;
            ctx.fillText("Play Game", SCREEN_WIDTH / 2, btnY + btnH / 2);
        } else {
            // Draw Board
            for (let i = 0; i < HEIGHT; i++) {
                for (let j = 0; j < WIDTH; j++) {
                    const rectX = boardPadding + j * cellSize;
                    const rectY = boardPadding + i * cellSize;
                    const cell = [i, j];
                    const cellKey = `${i},${j}`;

                    // Base Cell
                    ctx.fillStyle = GRAY;
                    ctx.fillRect(rectX, rectY, cellSize, cellSize);
                    
                    // Cell Border
                    ctx.strokeStyle = WHITE;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(rectX, rectY, cellSize, cellSize);

                    if (lost && game.isMine(cell)) {
                        // Ensure image is loaded before drawing
                        if (mineImg.complete) {
                            ctx.drawImage(mineImg, rectX, rectY, cellSize, cellSize);
                        }
                    } else if (flags.has(cellKey)) {
                        if (flagImg.complete) {
                            ctx.drawImage(flagImg, rectX, rectY, cellSize, cellSize);
                        }
                    } else if (revealed.has(cellKey)) {
                        const count = game.nearbyMines(cell);
                        ctx.fillStyle = BLACK;
                        ctx.font = SMALL_FONT;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(count.toString(), rectX + (cellSize / 2), rectY + (cellSize / 2));
                    }
                }
            }
        }

        // Schedule next frame (Browsers typically optimize this to ~60 FPS)
        requestAnimationFrame(draw);
    }

    // Initialize Game Loop
    requestAnimationFrame(draw);
}

// Execute upon script load (replaces `if __name__ == "__main__":`)
main();
