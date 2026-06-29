/**
 * @typedef {(string|null)[][]} Board
 * @typedef {[number, number]} Action
 */

// --- Constants ---
const X = "X";
const O = "O";
const EMPTY = null;

/** @returns {Board} */
const initial_state = () => Array.from({ length: 3 }, () => Array(3).fill(EMPTY));

/** @param {Board} board */
const player = (board) => {
    if (terminal(board)) return null;

    const flat = board.flat();
    const xCount = flat.filter(c => c === X).length;
    const oCount = flat.filter(c => c === O).length;

    return xCount === oCount ? X : O;
};

/** @param {Board} board */
const actions = (board) => {
    if (terminal(board)) return [];
    
    const possibleActions = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (board[r][c] === EMPTY) possibleActions.push([r, c]);
        }
    }
    return possibleActions;
};

/** * @param {Board} board 
 * @param {Action} action 
 */
const result = (board, action) => {
    if (!actions(board).some(a => a[0] === action[0] && a[1] === action[1])) {
        throw new Error("Invalid action");
    }

    const newBoard = structuredClone(board);
    const currentPlayer = player(board);
    if (currentPlayer) {
        newBoard[action[0]][action[1]] = currentPlayer;
    }
    return newBoard;
};

/** @param {Board} board */
const winner = (board) => {
    // Generate lines: rows, columns, and diagonals
    const cols = [0, 1, 2].map(c => [board[0][c], board[1][c], board[2][c]]);
    const diags = [
        [board[0][0], board[1][1], board[2][2]],
        [board[0][2], board[1][1], board[2][0]]
    ];
    const lines = [...board, ...cols, ...diags];

    for (const line of lines) {
        if (line[0] !== null && line[0] === line[1] && line[1] === line[2]) {
            return line[0];
        }
    }
    return null;
};

/** @param {Board} board */
const terminal = (board) => {
    return winner(board) !== null || board.flat().every(cell => cell !== EMPTY);
};

/** @param {Board} board */
const utility = (board) => {
    const win = winner(board);
    return win === X ? 1 : win === O ? -1 : 0;
};

/** @param {Board} board */
const minimax = (board) => {
    if (terminal(board)) return null;

    const currentPlayer = player(board);
    const possibleMoves = actions(board);

    const play = (b) => {
        if (terminal(b)) return utility(b);
        
        const moveValues = actions(b).map(m => play(result(b, m)));
        return player(b) === X ? Math.max(...moveValues) : Math.min(...moveValues);
    };

    if (currentPlayer === X) {
        // Find move with max score
        return possibleMoves.reduce((best, m) => {
            const score = play(result(board, m));
            return score > best.score ? { move: m, score } : best;
        }, { move: null, score: -Infinity }).move;
    } else {
        // Find move with min score
        return possibleMoves.reduce((best, m) => {
            const score = play(result(board, m));
            return score < best.score ? { move: m, score } : best;
        }, { move: null, score: Infinity }).move;
    }
};
