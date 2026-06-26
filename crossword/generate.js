import fs from 'node:fs';
import process from 'node:process';

// ============================================================================
// Core Crossword Structures
// ============================================================================

/**
 * Emulates the Python Enum for directions
 */
const Direction = Object.freeze({
    ACROSS: "across",
    DOWN: "down"
});

export class Variable {
    /**
     * @param {number} i 
     * @param {number} j 
     * @param {string} direction 
     * @param {number} length 
     */
    constructor(i, j, direction, length) {
        this.i = i;
        this.j = j;
        this.direction = direction;
        this.length = length;
        
        /** @type {Array<[number, number]>} */
        this.cells = [];
        
        // Pre-calculate cells spanned by this variable
        for (let k = 0; k < this.length; k++) {
            this.cells.push([
                this.i + (this.direction === Direction.DOWN ? k : 0),
                this.j + (this.direction === Direction.ACROSS ? k : 0)
            ]);
        }
    }

    /**
     * Python's __eq__ operator translation.
     * Note: Inside Sets/Maps, JS uses strict object reference equality.
     * @param {Variable} other 
     * @returns {boolean}
     */
    equals(other) {
        if (!(other instanceof Variable)) return false;
        return (
            this.i === other.i &&
            this.j === other.j &&
            this.direction === other.direction &&
            this.length === other.length
        );
    }

    toString() {
        return `(${this.i}, ${this.j}) ${this.direction} : ${this.length}`;
    }

    get repr() {
        return `Variable(${this.i}, ${this.j}, Direction.${this.direction === Direction.DOWN ? 'DOWN' : 'ACROSS'}, ${this.length})`;
    }
}

export class Crossword {
    /**
     * @param {string} structureFile 
     * @param {string} wordsFile 
     */
    constructor(structureFile, wordsFile) {
        this.height = 0;
        this.width = 0;
        /** @type {boolean[][]} */
        this.structure = [];
        /** @type {Set<string>} */
        this.words = new Set();
        /** @type {Set<Variable>} */
        this.variables = new Set();
        
        // Maps a Variable to another Variable to their [x, y] intersection
        /** @type {Map<Variable, Map<Variable, [number, number] | null>>} */
        this.overlaps = new Map();

        // 1. Parse puzzle structure
        let contents;
        try {
            const fileData = fs.readFileSync(structureFile, "utf-8");
            contents = fileData.split(/\r?\n/).filter(line => line.length > 0);
        } catch (e) {
            throw new Error(`Could not open structure file: ${e.message}`);
        }

        this.height = contents.length;
        this.width = contents.length > 0 ? Math.max(...contents.map(line => line.length)) : 0;

        // Initialize 2D boolean array
        this.structure = Array.from({ length: this.height }, () => Array(this.width).fill(false));
        
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (j < contents[i].length && contents[i][j] === '_') {
                    this.structure[i][j] = true;
                }
            }
        }

        // 2. Load and normalize vocabulary dictionary
        try {
            const wordData = fs.readFileSync(wordsFile, "utf-8");
            const wordLines = wordData.split(/\r?\n/);
            for (const line of wordLines) {
                const word = line.trim().toUpperCase();
                if (word) {
                    this.words.add(word);
                }
            }
        } catch (e) {
            throw new Error(`Could not open words file: ${e.message}`);
        }

        // 3. Detect grid variables
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                // Vertical words
                if (this.structure[i][j] && (i === 0 || !this.structure[i - 1][j])) {
                    let length = 1;
                    let k = i + 1;
                    while (k < this.height && this.structure[k][j]) {
                        length++;
                        k++;
                    }
                    if (length > 1) {
                        this.variables.add(new Variable(i, j, Direction.DOWN, length));
                    }
                }

                // Horizontal words
                if (this.structure[i][j] && (j === 0 || !this.structure[i][j - 1])) {
                    let length = 1;
                    let k = j + 1;
                    while (k < this.width && this.structure[i][k]) {
                        length++;
                        k++;
                    }
                    if (length > 1) {
                        this.variables.add(new Variable(i, j, Direction.ACROSS, length));
                    }
                }
            }
        }

        // 4. Map geometric line intersections
        for (const v1 of this.variables) {
            this.overlaps.set(v1, new Map());
            
            for (const v2 of this.variables) {
                if (v1 === v2) continue;
                
                let intersection = null;
                for (let idx1 = 0; idx1 < v1.cells.length; idx1++) {
                    for (let idx2 = 0; idx2 < v2.cells.length; idx2++) {
                        const cell1 = v1.cells[idx1];
                        const cell2 = v2.cells[idx2];
                        
                        if (cell1[0] === cell2[0] && cell1[1] === cell2[1]) {
                            intersection = [idx1, idx2];
                            break;
                        }
                    }
                    if (intersection) break;
                }
                this.overlaps.get(v1).set(v2, intersection);
            }
        }
    }

    /**
     * @param {Variable} varObj 
     * @returns {Set<Variable>}
     */
    neighbors(varObj) {
        const result = new Set();
        for (const v of this.variables) {
            if (v === varObj) continue;
            if (this.overlaps.get(v)?.get(varObj) !== null) {
                result.add(v);
            }
        }
        return result;
    }
}

// ============================================================================
// Crossword Creator & Solver Logic
// ============================================================================

export class CrosswordCreator {
    /**
     * @param {Crossword} crossword 
     */
    constructor(crossword) {
        this.crossword = crossword;
        // Track active domain pool for each grid entry variable
        /** @type {Map<Variable, Set<string>>} */
        this.domains = new Map();
        
        for (const varObj of crossword.variables) {
            this.domains.set(varObj, new Set(crossword.words));
        }
    }

    /**
     * @param {Map<Variable, string>} assignment 
     * @returns {Array<Array<string | null>>}
     */
    letterGrid(assignment) {
        const letters = Array.from({ length: this.crossword.height }, () => Array(this.crossword.width).fill(null));
        
        for (const [variable, word] of assignment.entries()) {
            const direction = variable.direction;
            for (let k = 0; k < word.length; k++) {
                const char = word[k];
                const i = variable.i + (direction === Direction.DOWN ? k : 0);
                const j = variable.j + (direction === Direction.ACROSS ? k : 0);
                letters[i][j] = char;
            }
        }
        return letters;
    }

    /**
     * @param {Map<Variable, string>} assignment 
     */
    print(assignment) {
        const letters = this.letterGrid(assignment);
        for (let i = 0; i < this.crossword.height; i++) {
            let rowString = "";
            for (let j = 0; j < this.crossword.width; j++) {
                if (this.crossword.structure[i][j]) {
                    rowString += (letters[i][j] !== null ? letters[i][j] : " ");
                } else {
                    rowString += "█";
                }
            }
            console.log(rowString);
        }
    }

    /**
     * @param {Map<Variable, string>} assignment 
     * @param {string} filename 
     */
    save(assignment, filename) {
        console.log(`[Info] Image saving triggered for '${filename}'.`);
    }

    enforceNodeConsistency() {
        for (const [varObj, wordSet] of this.domains.entries()) {
            const filteredSet = new Set(
                [...wordSet].filter(word => word.length === varObj.length)
            );
            this.domains.set(varObj, filteredSet);
        }
    }

    /**
     * @param {Variable} x 
     * @param {Variable} y 
     * @returns {boolean}
     */
    revise(x, y) {
        let revision = false;
        const overlap = this.crossword.overlaps.get(x)?.get(y);
        
        if (overlap !== null && overlap !== undefined) {
            const [idxX, idxY] = overlap;
            const wordsToRemove = [];

            // Pre-collect characters mapped at the intersection index from Y's domain
            const correspondingChars = new Set(
                [...this.domains.get(y)].map(yWord => yWord[idxY])
            );

            for (const xWord of this.domains.get(x)) {
                if (!correspondingChars.has(xWord[idxX])) {
                    wordsToRemove.push(xWord);
                    revision = true;
                }
            }

            for (const word of wordsToRemove) {
                this.domains.get(x).delete(word);
            }
        }
        
        return revision;
    }

    /**
     * @param {Array<[Variable, Variable]>} [arcs=null] 
     * @returns {boolean}
     */
    ac3(arcs = null) {
        let queue = [];
        
        if (arcs === null) {
            for (const var1 of this.crossword.variables) {
                for (const var2 of this.crossword.variables) {
                    if (var1 !== var2) queue.push([var1, var2]);
                }
            }
        } else {
            queue = [...arcs];
        }

        while (queue.length > 0) {
            // Using shift() mimics Python's deque.popleft()
            const [var1, var2] = queue.shift();

            if (this.revise(var1, var2)) {
                if (this.domains.get(var1).size === 0) {
                    return false;
                }
                for (const var3 of this.crossword.neighbors(var1)) {
                    if (var3 !== var1 && var3 !== var2) {
                        queue.push([var3, var1]);
                    }
                }
            }
        }
        return true;
    }

    /**
     * @param {Map<Variable, string>} assignment 
     * @returns {boolean}
     */
    assignmentComplete(assignment) {
        return assignment.size === this.crossword.variables.size;
    }

    /**
     * @param {Map<Variable, string>} assignment 
     * @returns {boolean}
     */
    consistent(assignment) {
        for (const [var1, word1] of assignment.entries()) {
            if (word1.length !== var1.length) {
                return false;
            }
            for (const var2 of this.crossword.neighbors(var1)) {
                const overlap = this.crossword.overlaps.get(var1)?.get(var2);
                if (overlap !== null && overlap !== undefined && assignment.has(var2)) {
                    const [idx1, idx2] = overlap;
                    if (word1[idx1] !== assignment.get(var2)[idx2]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * @param {Variable} varObj 
     * @param {Map<Variable, string>} assignment 
     * @returns {Array<string>}
     */
    orderDomainValues(varObj, assignment) {
        const domain = [...this.domains.get(varObj)];
        const neighborhood = this.crossword.neighbors(varObj);
        
        const mapsValuesToNumbers = new Map();
        
        for (const value of domain) {
            let count = 0;
            for (const neighbor of neighborhood) {
                if (assignment.has(neighbor)) continue;
                
                const overlap = this.crossword.overlaps.get(varObj)?.get(neighbor);
                if (overlap !== null && overlap !== undefined) {
                    const [idx1, idx2] = overlap;
                    for (const word of this.domains.get(neighbor)) {
                        if (value[idx1] !== word[idx2]) {
                            count++;
                        }
                    }
                }
            }
            mapsValuesToNumbers.set(value, count);
        }

        // Sort values based on the calculated LCV heuristic (ascending)
        domain.sort((a, b) => mapsValuesToNumbers.get(a) - mapsValuesToNumbers.get(b));
        return domain;
    }

    /**
     * @param {Map<Variable, string>} assignment 
     * @returns {Variable}
     */
    selectUnassignedVariable(assignment) {
        const unassigned = [...this.domains.keys()].filter(varObj => !assignment.has(varObj));

        // Matches C++ sorting logic:
        // Primary: Domain Size ascending (MRV)
        // Secondary: Neighbor Count ascending (Degree Heuristic fallback tier)
        unassigned.sort((a, b) => {
            const domainDiff = this.domains.get(a).size - this.domains.get(b).size;
            if (domainDiff !== 0) return domainDiff;
            
            return this.crossword.neighbors(a).size - this.crossword.neighbors(b).size;
        });
        
        return unassigned[0];
    }

    /**
     * @param {Map<Variable, string>} assignment 
     * @returns {Map<Variable, string> | null}
     */
    backtrack(assignment) {
        if (this.assignmentComplete(assignment)) {
            return assignment;
        }

        const varObj = this.selectUnassignedVariable(assignment);
        for (const value of this.orderDomainValues(varObj, assignment)) {
            assignment.set(varObj, value);
            
            if (this.consistent(assignment)) {
                const result = this.backtrack(assignment);
                if (result !== null) {
                    return result;
                }
            }
            // Revert state if path fails
            assignment.delete(varObj);
        }
        return null;
    }

    /**
     * @returns {Map<Variable, string> | null}
     */
    solve() {
        this.enforceNodeConsistency();
        this.ac3();
        return this.backtrack(new Map());
    }
}

// ============================================================================
// Execution Core
// ============================================================================

function main() {
    const args = process.argv.slice(2);
    
    if (args.length !== 2 && args.length !== 3) {
        console.error("Usage: node generate.js structure words [output]");
        return 1;
    }

    const structureFile = args[0];
    const wordsFile = args[1];
    const outputFile = args.length === 3 ? args[2] : "";

    try {
        const crossword = new Crossword(structureFile, wordsFile);
        const creator = new CrosswordCreator(crossword);
        const assignment = creator.solve();

        if (assignment === null) {
            console.log("No solution.");
        } else {
            creator.print(assignment);
            if (outputFile) {
                creator.save(assignment, outputFile);
            }
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
        return 1;
    }

    return 0;
}

if (process.argv[1] && process.argv[1] === import.meta.filename || process.argv[1].endsWith('generate.js')) {
    process.exit(main());
}
