import fs from 'node:fs';

/**
 * Represents a node in the hash table.
 * By strictly defining properties in the constructor, JS engines (like V8) 
 * can optimize this using hidden classes, acting as a functional equivalent 
 * to Python's __slots__.
 */
class Node {
    /**
     * @param {string} word 
     * @param {Node | null} nextNode 
     */
    constructor(word, nextNode = null) {
        this.word = word;
        this.next = nextNode;
    }
}

// Number of buckets in the hash table
const N = 28;

// Hash table: each bucket owns its singly-linked chain
/** @type {Array<Node | null>} */
let table = Array(N).fill(null);

// Number of words currently loaded
let wordCount = 0;

/**
 * Hashes word to a bucket index.
 * @param {string} word 
 * @returns {number}
 */
function hashWord(word) {
    let total = 0;
    const lowerWord = word.toLowerCase();
    
    for (let i = 0; i < lowerWord.length; i++) {
        // charCodeAt returns the integer ASCII/Unicode value of the character
        total += lowerWord.charCodeAt(i);
    }
    
    return total % N;
}

/**
 * Returns true if word is in the dictionary, else false (case-insensitive).
 * @param {string} word 
 * @returns {boolean}
 */
function check(word) {
    const target = word.toLowerCase();
    let node = table[hashWord(word)];
    
    while (node !== null) {
        if (node.word.toLowerCase() === target) {
            return true;
        }
        node = node.next;
    }
    
    return false;
}

/**
 * Loads dictionary into memory; returns true on success, false on failure.
 * @param {string} dictionaryFile 
 * @returns {boolean}
 */
function load(dictionaryFile) {
    try {
        const data = fs.readFileSync(dictionaryFile, 'utf-8');
        
        // Splitting by regex /\s+/ mimics C++ file >> word and Python's .split()
        // filtering out any empty strings resulting from leading/trailing whitespace
        const words = data.split(/\s+/).filter(w => w.length > 0);
        
        for (const word of words) {
            const bucket = hashWord(word);
            // Prepend to chain
            table[bucket] = new Node(word, table[bucket]);
            wordCount += 1;
        }
        return true;
    } catch (error) {
        // Catches file IOErrors (like ENOENT for missing files)
        return false;
    }
}

/**
 * Returns number of words loaded, or 0 if not yet loaded.
 * @returns {number}
 */
function size() {
    return wordCount;
}

/**
 * Unloads the dictionary from memory; returns true.
 * Dropping references allows JavaScript's garbage collector to free the nodes.
 * @returns {boolean}
 */
function unload() {
    table = Array(N).fill(null);
    wordCount = 0;
    return true;
}

// Export the functions and state for use in other ECMA modules
export { hashWord, check, load, size, unload };
