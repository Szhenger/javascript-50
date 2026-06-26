import fs from 'node:fs';
import process from 'node:process';

/**
 * Returns the length of the longest consecutive run of subsequence in sequence.
 * @param {string} sequence 
 * @param {string} subsequence 
 * @returns {number}
 */
function longestMatch(sequence, subsequence) {
    let longestRun = 0;
    const subseqLen = subsequence.length;
    const seqLen = sequence.length;

    for (let i = 0; i < seqLen; i++) {
        let count = 0;
        while (true) {
            const start = i + count * subseqLen;
            const end = start + subseqLen;
            
            if (end <= seqLen && sequence.substring(start, end) === subsequence) {
                count++;
            } else {
                break;
            }
        }
        longestRun = Math.max(longestRun, count);
    }
    return longestRun;
}

function main() {
    const args = process.argv.slice(2);
    if (args.length !== 2) {
        process.stderr.write("Usage: node dna.js data.csv sequence.txt\n");
        process.exit(1);
    }

    const databaseFile = args[0];
    const sequenceFile = args[1];

    // Read database file
    const dbRaw = fs.readFileSync(databaseFile, "utf-8").trim().split(/\r?\n/);
    const headers = dbRaw[0].split(",");
    const strSubsequences = headers.filter(h => h !== "name");
    
    const database = dbRaw.slice(1).map(line => {
        const values = line.split(",");
        const entry = { name: values[0] };
        for (let i = 1; i < headers.length; i++) {
            entry[headers[i]] = parseInt(values[i], 10);
        }
        return entry;
    });

    // Read DNA sequence
    const sequence = fs.readFileSync(sequenceFile, "utf-8").trim();

    // Find longest match of each STR in DNA sequence
    const sequenceData = {};
    for (const sub of strSubsequences) {
        sequenceData[sub] = longestMatch(sequence, sub);
    }

    // Check database for matching profiles
    for (const person of database) {
        const isMatch = strSubsequences.every(sub => person[sub] === sequenceData[sub]);
        if (isMatch) {
            console.log(person.name);
            return;
        }
    }

    console.log("No match");
}

if (import.meta.filename === process.argv[1] || process.argv[1].endsWith('dna.js')) {
    main();
}
