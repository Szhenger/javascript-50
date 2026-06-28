import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

/**
 * Counts alphabetic characters in a string.
 */
function countLetters(s) {
    // Matches all letters a-z (case-insensitive)
    const matches = s.match(/[a-zA-Z]/g);
    return matches ? matches.length : 0;
}

/**
 * Counts words based on whitespace separation.
 */
function countWords(s) {
    const trimmed = s.trim();
    if (trimmed === "") return 0;
    // Splits by one or more whitespace characters
    return trimmed.split(/\s+/).length;
}

/**
 * Counts terminal punctuation marks.
 */
function countSentences(s) {
    const terminals = new Set(['.', '!', '?']);
    let count = 0;
    for (const char of s) {
        if (terminals.has(char)) count++;
    }
    return count;
}

/**
 * Computes the Coleman-Liau index.
 */
function computeIndex(letterC, wordC, sentenceC) {
    if (wordC === 0) return 0;

    const L = (letterC / wordC) * 100.0;
    const S = (sentenceC / wordC) * 100.0;

    const index = 0.0588 * L - 0.296 * S - 15.8;
    return Math.round(index);
}

async function main() {
    const rl = readline.createInterface({ input: stdin, output: stdout });

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

main();
