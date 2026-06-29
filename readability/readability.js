import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
 * Counts alphabetic characters in a string.
 * @param {string} s 
 * @returns {number}
 */
function countLetters(s) {
    let count = 0;
    for (const char of s) {
        // Regex test to mimic Python's str.isalpha()
        if (/[a-zA-Z]/.test(char)) {
            count++;
        }
    }
    return count;
}

/**
 * Counts words based on whitespace separation.
 * @param {string} s 
 * @returns {number}
 */
function countWords(s) {
    const trimmed = s.trim();
    if (!trimmed) return 0;
    
    // Split by one or more whitespace characters
    const words = trimmed.split(/\s+/);
    return words.length;
}

/**
 * Counts terminal punctuation marks.
 * @param {string} s 
 * @returns {number}
 */
function countSentences(s) {
    const terminals = new Set(['.', '!', '?']);
    let count = 0;
    
    for (const char of s) {
        if (terminals.has(char)) {
            count++;
        }
    }
    return count;
}

/**
 * Computes the Coleman-Liau index.
 * @param {number} letterC 
 * @param {number} wordC 
 * @param {number} sentenceC 
 * @returns {number}
 */
function computeIndex(letterC, wordC, sentenceC) {
    if (wordC === 0) return 0;

    const L = (letterC / wordC) * 100.0;
    const S = (sentenceC / wordC) * 100.0;

    const index = 0.0588 * L - 0.296 * S - 15.8;
    return Math.round(index);
}

async function main() {
    const rl = readline.createInterface({ input, output });

    // Await the user's input to avoid blocking the event loop
    const text = await rl.question("Text: ");

    const letterCount = countLetters(text);
    const wordCount = countWords(text);
    const sentenceCount = countSentences(text);

    const grade = computeIndex(letterCount, wordCount, sentenceCount);

    if (grade < 1) {
        console.log("Before Grade 1");
    } else if (grade >= 16) {
        console.log("Grade 16+");
    } else {
        console.log(`Grade ${grade}`);
    }

    rl.close();
}

// Execute the main function
main();
