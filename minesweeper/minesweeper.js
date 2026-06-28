/**
 * Utility functions to handle JS referential equality limitations.
 * Converts [row, col] arrays to string keys for Sets, and vice versa.
 */
const toKey = (r, c) => `${r},${c}`;
const fromKey = (key) => key.split(',').map(Number);

class Minesweeper {
    constructor(height = 8, width = 8, numMines = 8) {
        this.height = height;
        this.width = width;
        this.mines = new Set();
        this.minesFound = new Set();

        // Initialize an empty field with no mines
        this.board = Array.from({ length: height }, () => Array(width).fill(false));

        // Add mines randomly
        while (this.mines.size < numMines) {
            const i = Math.floor(Math.random() * height);
            const j = Math.floor(Math.random() * width);
            
            if (!this.board[i][j]) {
                this.mines.add(toKey(i, j));
                this.board[i][j] = true;
            }
        }
    }

    /** Prints a text-based representation of the board. */
    print() {
        for (let i = 0; i < this.height; i++) {
            console.log("--".repeat(this.width));
            let rowDisplay = [];
            for (let j = 0; j < this.width; j++) {
                if (this.board[i][j]) {
                    rowDisplay.push("|X");
                } else {
                    rowDisplay.push("| ");
                }
            }
            console.log(rowDisplay.join("") + "|");
        }
        console.log("--".repeat(this.width));
    }

    isMine(cell) {
        const [i, j] = cell;
        return this.board[i][j];
    }

    /** Returns the number of mines in neighboring cells. */
    nearbyMines(cell) {
        let count = 0;
        const [row, col] = cell;

        for (let i = row - 1; i <= row + 1; i++) {
            for (let j = col - 1; j <= col + 1; j++) {
                if (i === row && j === col) continue;
                if (i >= 0 && i < this.height && j >= 0 && j < this.width) {
                    if (this.board[i][j]) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    won() {
        return this.minesFound.size === this.mines.size;
    }
}


class Sentence {
    constructor(cells, count) {
        // Ensure cells is a JS Set of string keys
        this.cells = new Set(cells);
        this.count = count;
    }

    equals(other) {
        if (!(other instanceof Sentence)) return false;
        if (this.cells.size !== other.cells.size || this.count !== other.count) return false;
        
        // Using ES2025 native Set method to check exact match
        return this.cells.isSubsetOf(other.cells) && other.cells.isSubsetOf(this.cells);
    }

    toString() {
        return `{${Array.from(this.cells).join(', ')}} = ${this.count}`;
    }

    /** Returns the set of all cells in this.cells known to be mines. */
    knownMines() {
        if (this.cells.size === this.count) {
            return new Set(this.cells);
        }
        return new Set();
    }

    /** Returns the set of all cells in this.cells known to be safe. */
    knownSafes() {
        if (this.count === 0) {
            return new Set(this.cells);
        }
        return new Set();
    }

    /** Updates internal knowledge given the fact that a cell is a mine. */
    markMine(cellKey) {
        if (this.cells.has(cellKey)) {
            this.cells.delete(cellKey);
            this.count--;
        }
    }

    /** Updates internal knowledge given the fact that a cell is safe. */
    markSafe(cellKey) {
        if (this.cells.has(cellKey)) {
            this.cells.delete(cellKey);
        }
    }
}


class MinesweeperAI {
    constructor(height = 8, width = 8) {
        this.height = height;
        this.width = width;
        this.movesMade = new Set();
        this.mines = new Set();
        this.safes = new Set();
        this.knowledge = [];
    }

    /** Marks a cell as a mine, and updates all knowledge. */
    markMine(cellKey) {
        this.mines.add(cellKey);
        for (const sentence of this.knowledge) {
            sentence.markMine(cellKey);
        }
    }

    /** Marks a cell as safe, and updates all knowledge. */
    markSafe(cellKey) {
        this.safes.add(cellKey);
        for (const sentence of this.knowledge) {
            sentence.markSafe(cellKey);
        }
    }

    /** Updates knowledge base when the board reveals how many mines are nearby a safe cell. */
    addKnowledge(cell, count) {
        const cellKey = toKey(cell[0], cell[1]);
        this.movesMade.add(cellKey);
        this.markSafe(cellKey);

        // Gather unresolved neighboring cells
        const nearbyCells = new Set();
        const [row, col] = cell;

        for (let i = row - 1; i <= row + 1; i++) {
            for (let j = col - 1; j <= col + 1; j++) {
                if (i >= 0 && i < this.height && j >= 0 && j < this.width && !(i === row && j === col)) {
                    nearbyCells.add(toKey(i, j));
                }
            }
        }

        const unresolvedCells = new Set();
        for (const c of nearbyCells) {
            if (this.safes.has(c)) {
                continue;
            }
            if (this.mines.has(c)) {
                count--;
                continue;
            }
            unresolvedCells.add(c);
        }

        this.knowledge.push(new Sentence(unresolvedCells, count));

        // Repeatedly check for new safes/mines until no updates can be made
        const updateKnowledge = () => {
            let changed = true;
            while (changed) {
                changed = false;
                for (const sentence of this.knowledge) {
                    // Update safes
                    for (const safeCell of sentence.knownSafes()) {
                        if (!this.safes.has(safeCell)) {
                            this.markSafe(safeCell);
                            changed = true;
                        }
                    }
                    // Update mines
                    for (const mineCell of sentence.knownMines()) {
                        if (!this.mines.has(mineCell)) {
                            this.markMine(mineCell);
                            changed = true;
                        }
                    }
                }
            }
        };

        updateKnowledge();

        // Infer new sentences based on subset evaluation
        const newSentences = [];
        for (const sentence1 of this.knowledge) {
            for (const sentence2 of this.knowledge) {
                if (sentence1 === sentence2) continue;

                // ES2025 native Set methods perfectly replace Python's set operations
                // sentence1.cells > sentence2.cells (Strict superset check)
                if (sentence1.cells.isSupersetOf(sentence2.cells) && sentence1.cells.size > sentence2.cells.size) {
                    const diffCells = sentence1.cells.difference(sentence2.cells);
                    const diffCount = sentence1.count - sentence2.count;

                    if (diffCount >= 0) {
                        const newerSentence = new Sentence(diffCells, diffCount);
                        
                        const alreadyInKnowledge = this.knowledge.some(s => s.equals(newerSentence));
                        const alreadyInNew = newSentences.some(s => s.equals(newerSentence));
                        
                        if (!alreadyInKnowledge && !alreadyInNew) {
                            newSentences.push(newerSentence);
                        }
                    }
                }
            }
        }

        // Append newly inferred knowledge
        this.knowledge.push(...newSentences);
        updateKnowledge();
    }

    /** Returns a known safe move that hasn't been played, or null if none exist. */
    makeSafeMove() {
        for (const cellKey of this.safes) {
            if (!this.movesMade.has(cellKey)) {
                return fromKey(cellKey); // Return as [row, col] array
            }
        }
        return null;
    }

    /** Returns a random valid move, or null if no valid moves exist. */
    makeRandomMove() {
        let maxAttempts = this.height * this.width * 2;

        while (maxAttempts > 0) {
            const i = Math.floor(Math.random() * this.height);
            const j = Math.floor(Math.random() * this.width);
            const randomMoveKey = toKey(i, j);

            if (!this.movesMade.has(randomMoveKey) && !this.mines.has(randomMoveKey)) {
                return [i, j];
            }
            maxAttempts--;
        }

        return null;
    }
}
