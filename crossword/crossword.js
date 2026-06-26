import { readFileSync } from 'node:fs';

/**
 * Represents a slot in the crossword puzzle where a word can be placed.
 */
export class Variable {
    /**
     * @param {number} i 
     * @param {number} j 
     * @param {string} direction - "down" or "across"
     * @param {number} length 
     */
    constructor(i, j, direction, length) {
        this.i = i;
        this.j = j;
        this.direction = direction;
        this.length = length;
        
        /** @type {Array<[number, number]>} */
        this.cells = [];
        
        // Calculate all grid coordinate pairs that this variable spans
        for (let k = 0; k < this.length; k++) {
            this.cells.push([
                this.i + (this.direction === "down" ? k : 0),
                this.j + (this.direction === "across" ? k : 0)
            ]);
        }
    }

    /**
     * Generates a unique string identifier, substituting Python's __hash__
     * @returns {string}
     */
    get id() {
        return `${this.i},${this.j},${this.direction},${this.length}`;
    }

    /**
     * Replaces Python's __eq__ operator for structural equality checks
     * @param {Variable} other 
     * @returns {boolean}
     */
    equals(other) {
        return (
            this.i === other.i &&
            this.j === other.j &&
            this.direction === other.direction &&
            this.length === other.length
        );
    }

    /**
     * Replaces the Python __str__() method
     * @returns {string}
     */
    toString() {
        return `(${this.i}, ${this.j}) ${this.direction} : ${this.length}`;
    }

    /**
     * Replaces the Python __repr__() method
     * @returns {string}
     */
    get repr() {
        return `Variable(${this.i}, ${this.j}, '${this.direction}', ${this.length})`;
    }
}

/**
 * Parses a crossword grid structure and vocabulary list.
 */
export class Crossword {
    /**
     * @param {string} structureFile 
     * @param {string} wordsFile 
     */
    constructor(structureFile, wordsFile) {
        // 1. Determine structure of crossword
        const structureContent = readFileSync(structureFile, "utf-8");
        // Regex seamlessly handles both Windows (\r\n) and Unix (\n) line endings
        const contents = structureContent.split(/\r?\n/).filter(line => line.length > 0);
        
        this.height = contents.length;
        // Spread operator allows Math.max to find the length of the longest row
        this.width = Math.max(...contents.map(line => line.length));

        /** @type {boolean[][]} */
        this.structure = [];
        
        for (let i = 0; i < this.height; i++) {
            const row = [];
            for (let j = 0; j < this.width; j++) {
                if (j >= contents[i].length) {
                    row.push(false);
                } else if (contents[i][j] === "_") {
                    row.push(true);
                } else {
                    row.push(false);
                }
            }
            this.structure.push(row);
        }

        // 2. Save vocabulary list
        const wordsContent = readFileSync(wordsFile, "utf-8");
        const wordLines = wordsContent.toUpperCase().split(/\r?\n/).filter(line => line.length > 0);
        
        /** @type {Set<string>} */
        this.words = new Set(wordLines);

        // 3. Determine variable set
        /** @type {Set<Variable>} */
        this.variables = new Set();
        
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {

                // Vertical words
                const startsWordDown = (
                    this.structure[i][j] && 
                    (i === 0 || !this.structure[i - 1][j])
                );
                
                if (startsWordDown) {
                    let length = 1;
                    for (let k = i + 1; k < this.height; k++) {
                        if (this.structure[k][j]) {
                            length += 1;
                        } else {
                            break;
                        }
                    }
                    if (length > 1) {
                        this.variables.add(new Variable(i, j, "down", length));
                    }
                }

                // Horizontal words
                const startsWordAcross = (
                    this.structure[i][j] && 
                    (j === 0 || !this.structure[i][j - 1])
                );
                
                if (startsWordAcross) {
                    let length = 1;
                    for (let k = j + 1; k < this.width; k++) {
                        if (this.structure[i][k]) {
                            length += 1;
                        } else {
                            break;
                        }
                    }
                    if (length > 1) {
                        this.variables.add(new Variable(i, j, "across", length));
                    }
                }
            }
        }

        // 4. Compute overlaps for each word
        // In JavaScript, a nested Map replaces the Python Dictionary tuple key (v1, v2)
        /** @type {Map<Variable, Map<Variable, [number, number] | null>>} */
        this.overlaps = new Map();
        
        for (const v1 of this.variables) {
            this.overlaps.set(v1, new Map());
            
            for (const v2 of this.variables) {
                // JavaScript Sets hold strict object references, so v1 === v2 works identically
                if (v1 === v2) continue;
                
                // Default intersection state
                this.overlaps.get(v1).set(v2, null);
                
                // Check cross-reference of coordinate pairs
                let foundOverlap = false;
                for (let idx1 = 0; idx1 < v1.cells.length; idx1++) {
                    for (let idx2 = 0; idx2 < v2.cells.length; idx2++) {
                        const cell1 = v1.cells[idx1];
                        const cell2 = v2.cells[idx2];
                        
                        // Array equivalence must be checked by value in JS
                        if (cell1[0] === cell2[0] && cell1[1] === cell2[1]) {
                            this.overlaps.get(v1).set(v2, [idx1, idx2]);
                            foundOverlap = true;
                            break;
                        }
                    }
                    
                    // Break outer loop if an overlap was already found
                    if (foundOverlap) break;
                }
            }
        }
    }

    /**
     * Given a variable, return set of overlapping variables.
     * @param {Variable} v 
     * @returns {Set<Variable>}
     */
    neighbors(v) {
        const result = new Set();
        const overlapsForVar = this.overlaps.get(v);
        
        if (overlapsForVar) {
            for (const [otherVar, overlapData] of overlapsForVar.entries()) {
                if (otherVar !== v && overlapData !== null) {
                    result.add(otherVar);
                }
            }
        }
        
        return result;
    }
}
