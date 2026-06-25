import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const rl = createInterface({ input: stdin, output: stdout });

/**
 * Prompts user for height and validates input between 1 and 8.
 */
async function getHeight() {
    while (true) {
        const input = await rl.question('Height: ');
        const height = parseInt(input, 10);
        
        if (!isNaN(height) && height >= 1 && height <= 8) {
            return height;
        }
    }
}

/**
 * Constructs and prints the double pyramid.
 */
function makePyramid(n) {
    for (let i = 0; i < n; i++) {
        let line = "";
        const limit = n + (i + 3);
        
        for (let j = 0; j < limit; j++) {
            // Logic matches C++ conditional for spaces and hash blocks
            if (j < n - (i + 1) || j > n + (i + 2) || j === n || j === n + 1) {
                line += " ";
            } else {
                line += "#";
            }
        }
        console.log(line);
    }
}

async function main() {
    const height = await getHeight();
    makePyramid(height);
    rl.close();
}

main();
