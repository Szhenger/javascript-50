import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
 * Validates the command line argument cipher key.
 */
function checkKey() {
    const args = process.argv.slice(2);

    if (args.length !== 1) {
        console.log(`Usage: node substitution.js key`);
        return false;
    }

    const key = args[0];

    if (key.length !== 26) {
        console.log("Key must contain 26 characters.");
        return false;
    }

    if (!/^[a-zA-Z]+$/.test(key)) {
        console.log("Key must contain only letters.");
        return false;
    }

    // Set automatically handles unique values
    const uniqueChars = new Set(key.toLowerCase());
    if (uniqueChars.size !== 26) {
        console.log("Key must contain each letter exactly once.");
        return false;
    }

    return true;
}

/**
 * Encrypts and prints the ciphertext.
 */
function printCipherText(text, cipher) {
    const result = [];

    for (const c of text) {
        if (/[a-zA-Z]/.test(c)) {
            const isLower = c === c.toLowerCase();
            const base = isLower ? 'a'.charCodeAt(0) : 'A'.charCodeAt(0);
            
            const index = c.charCodeAt(0) - base;
            const mappedChar = cipher[index];
            
            result.push(isLower ? mappedChar.toLowerCase() : mappedChar.toUpperCase());
        } else {
            result.push(c);
        }
    }

    console.log(`ciphertext: ${result.join('')}`);
}

async function main() {
    if (checkKey()) {
        const rl = readline.createInterface({ input, output });
        const plaintext = await rl.question("plaintext:  ");
        
        printCipherText(plaintext, process.argv[2]);
        
        rl.close();
        return 0;
    } else {
        return 1;
    }
}

// Exit code handling
main().then(code => {
    process.exit(code);
});
