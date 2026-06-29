import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// --- Constants & Global State ---
const MAX = 9;
const rl = createInterface({ input: stdin, output: stdout });

// Data structures
let preferences = [];
let locked = [];
let candidates = [];
let pairs = [];

class Pair {
    constructor(winner, loser) {
        this.winner = winner;
        this.loser = loser;
    }
}

// --- Helper Functions ---

async function getVoterCount() {
    while (true) {
        const input = await rl.question("Number of voters: ");
        const count = parseInt(input);
        if (!isNaN(count) && count > 0) return count;
    }
}

function vote(rank, name, ranks) {
    const index = candidates.indexOf(name);
    if (index !== -1) {
        ranks[rank] = index;
        return true;
    }
    return false;
}

function recordPreferences(ranks) {
    const count = candidates.length;
    for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
            preferences[ranks[i]][ranks[j]]++;
        }
    }
}

function addPairs() {
    const count = candidates.length;
    for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
            if (preferences[i][j] > preferences[j][i]) {
                pairs.push(new Pair(i, j));
            } else if (preferences[i][j] < preferences[j][i]) {
                pairs.push(new Pair(j, i));
            }
        }
    }
}

function sortPairs() {
    pairs.sort((a, b) => preferences[b.winner][b.loser] - preferences[a.winner][a.loser]);
}

function makesCycle(start, end) {
    if (start === end) return true;
    for (let i = 0; i < candidates.length; i++) {
        if (locked[end][i]) {
            if (makesCycle(start, i)) return true;
        }
    }
    return false;
}

function lockPairs() {
    for (const pair of pairs) {
        if (!makesCycle(pair.winner, pair.loser)) {
            locked[pair.winner][pair.loser] = true;
        }
    }
}

function printWinner() {
    const count = candidates.length;
    const candidateEdges = new Array(count).fill(0);

    for (let i = 0; i < count; i++) {
        for (let j = 0; j < count; j++) {
            if (locked[j][i]) candidateEdges[i]++;
        }
    }

    const minEdges = Math.min(...candidateEdges);
    for (let i = 0; i < count; i++) {
        if (candidateEdges[i] === minEdges) {
            console.log(candidates[i]);
            break;
        }
    }
}

// --- Main Execution ---

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log("Usage: node tideman.js [candidate ...]");
        process.exit(1);
    }

    candidates = args;
    const candidateCount = candidates.length;

    if (candidateCount > MAX) {
        console.log(`Maximum number of candidates is ${MAX}`);
        process.exit(2);
    }

    // Initialize matrices
    preferences = Array.from({ length: candidateCount }, () => new Array(candidateCount).fill(0));
    locked = Array.from({ length: candidateCount }, () => new Array(candidateCount).fill(false));

    const voterCount = await getVoterCount();

    // Query for votes
    for (let i = 0; i < voterCount; i++) {
        const ranks = new Array(candidateCount);
        for (let j = 0; j < candidateCount; j++) {
            const name = await rl.question(`Rank ${j + 1}: `);
            if (!vote(j, name, ranks)) {
                console.log("Invalid vote.");
                process.exit(3);
            }
        }
        recordPreferences(ranks);
        console.log();
    }

    addPairs();
    sortPairs();
    lockPairs();
    printWinner();

    rl.close();
    process.exit(0);
}

main().catch(console.error);
