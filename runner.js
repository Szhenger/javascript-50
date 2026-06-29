// --- Constants ---
const EMPTY = 0, X = 1, O = 2;
const WIDTH = 600, HEIGHT = 400;
const WHITE = "#FFFFFF", BLACK = "#000000";

// --- State ---
let board = Array.from({ length: 3 }, () => Array(3).fill(EMPTY));
let user = null; // null = Menu, X or O = Playing
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Game Logic ---
const initial_state = () => Array.from({ length: 3 }, () => Array(3).fill(EMPTY));

const player = (board) => {
    const xCount = board.flat().filter(c => c === X).length;
    const oCount = board.flat().filter(c => c === O).length;
    return xCount <= oCount ? X : O;
};

const winner = (board) => {
    for (let i = 0; i < 3; i++) {
        if (board[i][0] !== EMPTY && board[i][0] === board[i][1] && board[i][0] === board[i][2]) return board[i][0];
        if (board[0][i] !== EMPTY && board[0][i] === board[1][i] && board[0][i] === board[2][i]) return board[0][i];
    }
    if (board[0][0] !== EMPTY && board[0][0] === board[1][1] && board[0][0] === board[2][2]) return board[0][0];
    if (board[0][2] !== EMPTY && board[0][2] === board[1][1] && board[0][2] === board[2][0]) return board[0][2];
    return EMPTY;
};

const terminal = (board) => winner(board) !== EMPTY || board.flat().every(c => c !== EMPTY);

const utility = (board) => {
    const w = winner(board);
    return w === X ? 1 : w === O ? -1 : 0;
};

const result = (board, move) => {
    if (board[move[0]][move[1]] !== EMPTY) throw new Error("Invalid move");
    const newBoard = structuredClone(board); // ES2022+ deep copy
    newBoard[move[0]][move[1]] = player(board);
    return newBoard;
};

const minimax = (board) => {
    if (terminal(board)) return [-1, -1];
    
    const curr = player(board);
    let bestVal = (curr === X) ? -Infinity : Infinity;
    let bestMove = [-1, -1];

    const helper = (b, maximizing) => {
        if (terminal(b)) return utility(b);
        let best = maximizing ? -1000 : 1000;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (b[r][c] === EMPTY) {
                    const val = helper(result(b, [r, c]), !maximizing);
                    best = maximizing ? Math.max(best, val) : Math.min(best, val);
                }
            }
        }
        return best;
    };

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (board[r][c] === EMPTY) {
                const val = helper(result(board, [r, c]), curr === O);
                if ((curr === X && val > bestVal) || (curr === O && val < bestVal)) {
                    bestVal = val;
                    bestMove = [r, c];
                }
            }
        }
    }
    return bestMove;
};

// --- Rendering & Interaction ---
function draw() {
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = WHITE;
    ctx.font = "40px Arial";

    if (user === null) {
        ctx.fillText("Play Tic-Tac-Toe", WIDTH / 2 - 130, 50);
        // Buttons
        ctx.fillRect(WIDTH / 8, HEIGHT / 2, WIDTH / 4, 50);
        ctx.fillRect(5 * WIDTH / 8, HEIGHT / 2, WIDTH / 4, 50);
        ctx.fillStyle = BLACK;
        ctx.fillText("X", WIDTH / 8 + 30, HEIGHT / 2 + 40);
        ctx.fillText("O", 5 * WIDTH / 8 + 30, HEIGHT / 2 + 40);
    } else {
        // Draw Board
        ctx.fillStyle = WHITE;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const x = WIDTH / 2 - 120 + c * 80;
                const y = HEIGHT / 2 - 120 + r * 80;
                ctx.strokeRect(x, y, 80, 80);
                if (board[r][c] !== EMPTY) {
                    ctx.fillText(board[r][c] === X ? "X" : "O", x + 25, y + 55);
                }
            }
        }
        // AI Turn
        if (player(board) !== user && !terminal(board)) {
            board = result(board, minimax(board));
        }
    }
    requestAnimationFrame(draw);
}

canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (user === null) {
        if (y > HEIGHT / 2 && y < HEIGHT / 2 + 50) {
            if (x > WIDTH / 8 && x < WIDTH / 8 + WIDTH / 4) user = X;
            else if (x > 5 * WIDTH / 8 && x < 5 * WIDTH / 8 + WIDTH / 4) user = O;
        }
    } else if (user === player(board) && !terminal(board)) {
        const c = Math.floor((x - (WIDTH / 2 - 120)) / 80);
        const r = Math.floor((y - (HEIGHT / 2 - 120)) / 80);
        if (r >= 0 && r < 3 && c >= 0 && c < 3 && board[r][c] === EMPTY) {
            board = result(board, [r, c]);
        }
    } else if (terminal(board)) {
        board = initial_state();
        user = null;
    }
});

draw();
