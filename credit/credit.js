import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
 * Safely gets a BigInt from the user, rejecting bad input.
 * @param {string} promptText 
 * @param {readline.Interface} rl 
 * @returns {Promise<bigint>}
 */
async function getLong(promptText, rl) {
    while (true) {
        const answer = await rl.question(promptText);
        try {
            // Regex strictly enforces digits to prevent scientific notation or floats
            if (/^\d+$/.test(answer)) {
                return BigInt(answer);
            }
        } catch (error) {
            // If BigInt fails or input is invalid, catch it and loop again (like Python's 'pass')
        }
    }
}

async function main() {
    // Initialize the readline interface
    const rl = readline.createInterface({ input, output });

    // Get number
    let number = await getLong("Number: ", rl);
    rl.close(); // Close the input stream once we have valid data

    // Initialize checksum, length, and startingDigits using BigInts ('n' suffix)
    let checksum = 0n;
    let length = 0;
    let startingDigits = 0n;

    // Compute checksum, length, and startingDigits of number
    while (number > 0n) {
        if (startingDigits === 0n && number < 100n) {
            startingDigits = number;
        }

        const digit = number % 10n;
        // BigInt division inherently truncates decimals, mirroring Python's `//` operator
        number = number / 10n; 
        length += 1;

        if (length % 2 === 0) {
            const doubled = 2n * digit;
            if (doubled > 9n) {
                checksum += (doubled / 10n) + (doubled % 10n);
            } else {
                checksum += doubled;
            }
        } else {
            checksum += digit;
        }
    }

    // Check number and bank
    if (checksum % 10n !== 0n) {
        console.log("INVALID");
    } else if (length === 13 || length === 16) {
        if (length === 16 && startingDigits > 50n && startingDigits < 56n) {
            console.log("MASTERCARD");
        } else if (startingDigits / 10n === 4n) {
            console.log("VISA");
        } else {
            console.log("INVALID");
        }
    } else if (length === 15) {
        if (startingDigits === 34n || startingDigits === 37n) {
            console.log("AMEX");
        } else {
            console.log("INVALID");
        }
    } else {
        console.log("INVALID");
    }
}

// Execute the main function (equivalent to `if __name__ == "__main__":`)
main().catch(console.error);
