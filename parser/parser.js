import * as fs from 'node:fs';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// --- Data Structures ---

class Tree {
    constructor(label, children = [], word = "") {
        this.label = label;
        this.children = children;
        this.word = word;
    }

    isLeaf() {
        return this.children.length === 0 && this.word.length > 0;
    }

    // Deep equality check for chart duplicate prevention
    equals(other) {
        if (!(other instanceof Tree)) return false;
        if (this.label !== other.label || this.word !== other.word) return false;
        if (this.children.length !== other.children.length) return false;
        return this.children.every((child, i) => child.equals(other.children[i]));
    }
}

class Rule {
    constructor(lhs, rhs, isTerminal) {
        this.lhs = lhs;
        this.rhs = rhs; // array of strings
        this.isTerminal = isTerminal;
    }
}

// --- Helpers ---

function prettyPrint(tree, depth = 0) {
    const indent = "    ".repeat(depth);
    if (tree.isLeaf()) {
        console.log(`${indent}${tree.word}`);
    } else {
        console.log(`${indent}${tree.label}(`);
        for (const child of tree.children) {
            prettyPrint(child, depth + 1);
        }
        console.log(`${indent})`);
    }
}

function flatten(t) {
    if (t.isLeaf()) return [t.word];
    return t.children.flatMap(flatten);
}

function getSubtrees(t, result) {
    result.push(t);
    for (const c of t.children) {
        getSubtrees(c, result);
    }
}

// --- Parsing Logic ---

function parseCFG(terminalsStr, nonterminalsStr) {
    const rules = [];

    const processBlock = (block, isTerm) => {
        block.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.includes("->")) return;

            const [lhs, rhsPart] = trimmed.split("->").map(s => s.trim());
            rhsPart.split('|').forEach(option => {
                let tokens = option.trim().split(/\s+/);
                if (isTerm) tokens = tokens.map(t => t.replace(/"/g, ''));
                if (tokens.length > 0) rules.push(new Rule(lhs, tokens, isTerm));
            });
        });
    };

    processBlock(nonterminalsStr, false);
    processBlock(terminalsStr, true);
    return rules;
}

function preprocess(sentence) {
    const punct = new Set(".,!?;:\"()[]{}");
    let padded = "";
    for (const char of sentence) {
        padded += punct.has(char) ? ` ${char} ` : char;
    }
    return padded.toLowerCase().split(/\s+/).filter(token => /[a-z]/.test(token));
}

function npChunk(tree) {
    const chunks = [];
    const allSubtrees = [];
    getSubtrees(tree, allSubtrees);

    for (const parent of allSubtrees) {
        if (parent.label === "NP") {
            const childSubtrees = [];
            parent.children.forEach(c => getSubtrees(c, childSubtrees));
            if (!childSubtrees.some(d => d.label === "NP")) {
                chunks.push(parent);
            }
        }
    }
    return chunks;
}

class ChartParser {
    constructor(rules) {
        this.rules = rules;
    }

    _findMatches(chart, i, j, rhs, rhsIdx, currentChildren, results) {
        if (rhsIdx === rhs.length) {
            if (i === j) results.push([...currentChildren]);
            return;
        }
        if (i === j) return;

        for (let k = i + 1; k <= j; k++) {
            for (const t of chart[i][k]) {
                if (t.label === rhs[rhsIdx]) {
                    currentChildren.push(t);
                    this._findMatches(chart, k, j, rhs, rhsIdx + 1, currentChildren, results);
                    currentChildren.pop();
                }
            }
        }
    }

    parse(words) {
        const n = words.length;
        if (n === 0) return [];
        const chart = Array.from({ length: n }, () => Array.from({ length: n + 1 }, () => []));

        for (let i = 0; i < n; i++) {
            const leaf = new Tree("", [], words[i]);
            this.rules.forEach(r => {
                if (r.isTerminal && r.rhs.length === 1 && r.rhs[0] === words[i]) {
                    chart[i][i + 1].push(new Tree(r.lhs, [leaf], ""));
                }
            });
        }

        for (let len = 1; len <= n; len++) {
            for (let i = 0; i <= n - len; i++) {
                let j = i + len;
                let added = true;
                while (added) {
                    added = false;
                    for (const r of this.rules.filter(r => !r.isTerminal)) {
                        const results = [];
                        this._findMatches(chart, i, j, r.rhs, 0, [], results);
                        results.forEach(children => {
                            const newTree = new Tree(r.lhs, children, "");
                            if (!chart[i][j].some(t => t.equals(newTree))) {
                                chart[i][j].push(newTree);
                                added = true;
                            }
                        });
                    }
                }
            }
        }
        return chart[0][n].filter(t => t.label === "S");
    }
}

// --- Execution ---

async function main() {
    const TERMINALS = `...`; // Paste your terminal strings
    const NONTERMINALS = `...`; // Paste your nonterminal strings

    let inputSentence = "";
    if (process.argv[2]) {
        inputSentence = fs.readFileSync(process.argv[2], 'utf-8');
    } else {
        const rl = readline.createInterface({ input: stdin, output: stdout });
        inputSentence = await rl.question("Sentence: ");
        rl.close();
    }

    const words = preprocess(inputSentence);
    const parser = new ChartParser(parseCFG(TERMINALS, NONTERMINALS));
    const trees = parser.parse(words);

    if (trees.length === 0) {
        console.log("Could not parse sentence.");
        return;
    }

    trees.forEach(tree => {
        prettyPrint(tree);
        console.log("\nNoun Phrase Chunks");
        npChunk(tree).forEach(np => console.log(flatten(np).join(" ")));
        console.log();
    });
}

main();
