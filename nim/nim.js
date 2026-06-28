import * as readline from 'node:readline/promises';
import { stdin as processStdin, stdout as processStdout } from 'node:process';

class Nim {
    /**
     * Initialize game board.
     * Each game board has
     * - `piles`: an array of how many elements remain in each pile
     * - `player`: 0 or 1 to indicate which player's turn
     * - `winner`: null, 0, or 1 to indicate who the winner is
     */
    constructor(initial = [1, 3, 5, 7]) {
        this.piles = [...initial];
        this.player = 0;
        this.winner = null;
    }

    /**
     * Takes a `piles` array as input and returns all of the available 
     * actions `[i, j]` in that state.
     * * Action `[i, j]` represents the action of removing `j` items
     * from pile `i` (where piles are 0-indexed).
     */
    static availableActions(piles) {
        const actions = [];
        piles.forEach((pile, i) => {
            for (let j = 1; j <= pile; j++) {
                actions.push([i, j]);
            }
        });
        return actions;
    }

    /**
     * Returns the player that is not `player`. 
     * Assumes `player` is either 0 or 1.
     */
    static otherPlayer(player) {
        return player === 1 ? 0 : 1;
    }

    /**
     * Switch the current player to the other player.
     */
    switchPlayer() {
        this.player = Nim.otherPlayer(this.player);
    }

    /**
     * Make the move `action` for the current player.
     * `action` must be an array `[i, j]`.
     */
    move(action) {
        const [pile, count] = action;

        // Check for errors
        if (this.winner !== null) {
            throw new Error("Game already won");
        } else if (pile < 0 || pile >= this.piles.length) {
            throw new Error("Invalid pile");
        } else if (count < 1 || count > this.piles[pile]) {
            throw new Error("Invalid number of objects");
        }

        // Update pile
        this.piles[pile] -= count;
        this.switchPlayer();

        // Check for a winner
        if (this.piles.every(p => p === 0)) {
            this.winner = this.player;
        }
    }
}


class NimAI {
    /**
     * Initialize AI with an empty Q-learning Map,
     * an alpha (learning) rate, and an epsilon rate.
     */
    constructor(alpha = 0.5, epsilon = 0.1) {
        this.q = new Map();
        this.alpha = alpha;
        this.epsilon = epsilon;
    }

    /** Helper to create unique string keys for the Q Map */
    _getQKey(state, action) {
        return `${state.join(',')}|${action.join(',')}`;
    }

    /**
     * Update Q-learning model, given an old state, an action taken
     * in that state, a new resulting state, and the reward received
     * from taking that action.
     */
    update(oldState, action, newState, reward) {
        const old = this.getQValue(oldState, action);
        const bestFuture = this.bestFutureReward(newState);
        this.updateQValue(oldState, action, old, reward, bestFuture);
    }

    /**
     * Return the Q-value for the state `state` and the action `action`.
     * If no Q-value exists yet in `this.q`, return 0.
     */
    getQValue(state, action) {
        const key = this._getQKey(state, action);
        return this.q.get(key) ?? 0;
    }

    /**
     * Update the Q-value for the state `state` and the action `action`
     * given the previous Q-value `old_q`, a current reward `reward`,
     * and an estimate of future rewards `future_rewards`.
     */
    updateQValue(state, action, oldQ, reward, futureRewards) {
        const key = this._getQKey(state, action);
        const newEstimate = oldQ + this.alpha * (reward + futureRewards - oldQ);
        this.q.set(key, newEstimate);
    }

    /**
     * Given a state `state`, consider all possible `(state, action)`
     * pairs available in that state and return the maximum of all
     * of their Q-values.
     */
    bestFutureReward(state) {
        const actions = Nim.availableActions(state);
        if (actions.length === 0) return 0;
        
        return Math.max(...actions.map(action => this.getQValue(state, action)));
    }

    /**
     * Given a state `state`, return an action `[i, j]` to take.
     */
    chooseAction(state, epsilon = true) {
        const actions = Nim.availableActions(state);
        const best = this.bestFutureReward(state);

        if (epsilon && Math.random() < this.epsilon) {
            return actions[Math.floor(Math.random() * actions.length)];
        }

        const bestActions = actions.filter(action => this.getQValue(state, action) === best);
        return bestActions[Math.floor(Math.random() * bestActions.length)];
    }
}


/**
 * Train an AI by playing `n` games against itself.
 */
function train(n) {
    const player = new NimAI();

    // Play n games
    for (let i = 0; i < n; i++) {
        console.log(`Playing training game ${i + 1}`);
        const game = new Nim();

        // Keep track of last move made by either player
        const last = {
            0: { state: null, action: null },
            1: { state: null, action: null }
        };

        // Game loop
        while (true) {
            // Keep track of current state and action
            const state = [...game.piles];
            const action = player.chooseAction(game.piles);

            // Keep track of last state and action
            last[game.player].state = state;
            last[game.player].action = action;

            // Make move
            game.move(action);
            const newState = [...game.piles];

            // When game is over, update Q values with rewards
            if (game.winner !== null) {
                player.update(state, action, newState, -1);
                player.update(
                    last[game.player].state,
                    last[game.player].action,
                    newState,
                    1
                );
                break;
            } 
            // If game is continuing, no rewards yet
            else if (last[game.player].state !== null) {
                player.update(
                    last[game.player].state,
                    last[game.player].action,
                    newState,
                    0
                );
            }
        }
    }

    console.log("Done training");
    return player; // Return the trained AI
}

/**
 * Utility to pause execution in async functions (like Python's time.sleep)
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Play human game against the AI.
 * `humanPlayer` can be set to 0 or 1 to specify whether
 * human player moves first or second.
 */
async function play(ai, humanPlayer = null) {
    // If no player order set, choose human's order randomly
    if (humanPlayer === null) {
        humanPlayer = Math.floor(Math.random() * 2);
    }

    // Create new game and setup async readline interface
    const game = new Nim();
    const rl = readline.createInterface({ input: processStdin, output: processStdout });

    // Game loop
    while (true) {
        // Print contents of piles
        console.log("\nPiles:");
        game.piles.forEach((pile, i) => {
            console.log(`Pile ${i}: ${pile}`);
        });
        console.log();

        // Compute available actions
        const availableActions = Nim.availableActions(game.piles);
        await sleep(1000);

        let pile, count;

        // Let human make a move
        if (game.player === humanPlayer) {
            console.log("Your Turn");
            while (true) {
                const pileInput = await rl.question("Choose Pile: ");
                const countInput = await rl.question("Choose Count: ");
                
                pile = parseInt(pileInput, 10);
                count = parseInt(countInput, 10);

                // Check if the move is in availableActions
                const isValidMove = availableActions.some(
                    (action) => action[0] === pile && action[1] === count
                );

                if (isValidMove) {
                    break;
                }
                console.log("Invalid move, try again.");
            }
        } 
        // Have AI make a move
        else {
            console.log("AI's Turn");
            [pile, count] = ai.chooseAction(game.piles, false);
            console.log(`AI chose to take ${count} from pile ${pile}.`);
        }

        // Make move
        game.move([pile, count]);

        // Check for winner
        if (game.winner !== null) {
            console.log("\nGAME OVER");
            const winner = game.winner === humanPlayer ? "Human" : "AI";
            console.log(`Winner is ${winner}`);
            rl.close();
            return;
        }
    }
}

// ---------------------------------------------------------
// Example Usage (Can be run directly with modern Node.js):
// ---------------------------------------------------------
// const trainedAI = train(10000);
// await play(trainedAI);
