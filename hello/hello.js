import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const main = async () => {
    const rl = createInterface({ input, output });

    try {
        // Equivalent to std::getline
        const name = await rl.question("What's your name? ");
        
        // Equivalent to std::println
        console.log(`hello, ${name}`);
    } finally {
        rl.close();
    }
};

main();
