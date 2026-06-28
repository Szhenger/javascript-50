import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const MAX = 9;

/**
 * Safely grabs a positive integer for voter count.
 */
async function getVoterCount(rl) {
    while (true) {
        const answer = await rl.question("Number of voters: ");
        const count = parseInt(answer, 10);
        if (!isNaN(count) && count > 0) {
            return count;
        }
    }
}

/**
 * Update vote totals given a new vote.
 */
function vote(candidates, name) {
    if (candidates.has(name)) {
        candidates.set(name, candidates.get(name) + 1);
        return true;
    }
    return false;
}

/**
 * Print the winner (or winners) of the election.
 */
function printWinner(candidates) {
    const maxVotes = Math.max(...candidates.values());

    for (const [name, votes] of candidates.entries()) {
        if (votes === maxVotes) {
            console.log(name);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);

    // Check for invalid usage
    if (args.length === 0) {
        console.log("Usage: node plurality.js [candidate ...]");
        process.exit(1);
    }

    if (args.length > MAX) {
        console.log(`Maximum number of candidates is ${MAX}`);
        process.exit(2);
    }

    // Map candidate names to vote counts
    const candidates = new Map();
    args.forEach(name => candidates.set(name, 0));

    const rl = readline.createInterface({ input, output });

    const voterCount = await getVoterCount(rl);

    // Loop over all voters
    for (let i = 0; i < voterCount; i++) {
        const name = (await rl.question("Vote: ")).trim();

        if (!vote(candidates, name)) {
            console.log("Invalid vote.");
        }
    }

    // Display winner(s)
    printWinner(candidates);
    rl.close();
}

main();
