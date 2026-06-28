import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Constants
const DAMPING = 0.85;
const SAMPLES = 10000;

/**
 * Extracts all links from HTML files in a given directory.
 * @param {string} directory 
 * @returns {Map<string, Set<string>>} Corpus Map of filename to a Set of linked pages
 */
function crawl(directory) {
    const pages = new Map();
    
    const folder = path.resolve(directory);
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
        console.error(`Error: ${directory} is not a valid directory.`);
        process.exit(1);
    }

    const files = fs.readdirSync(folder);

    // First pass: extract links
    for (const file of files) {
        if (path.extname(file) !== '.html') continue;

        const filePath = path.join(folder, file);
        let contents = '';
        try {
            contents = fs.readFileSync(filePath, 'utf-8');
        } catch (err) {
            continue;
        }

        // Regex to extract links
        const linkRe = /<a\s+(?:[^>]*?)href="([^"]*)"/g;
        const links = new Set();
        let match;
        while ((match = linkRe.exec(contents)) !== null) {
            links.add(match[1]);
        }

        // Remove self-links
        if (links.has(file)) {
            links.delete(file);
        }

        pages.set(file, links);
    }

    // Second pass: Only include links to other pages that actually exist in the corpus
    for (const [filename, links] of pages.entries()) {
        const validLinks = new Set();
        for (const link of links) {
            if (pages.has(link)) {
                validLinks.add(link);
            }
        }
        pages.set(filename, validLinks);
    }

    return pages;
}

/**
 * Returns a probability distribution over which page to visit next.
 * @param {Map<string, Set<string>>} corpus 
 * @param {string} page 
 * @param {number} dampingFactor 
 * @returns {Map<string, number>} Probability distribution map
 */
function transitionModel(corpus, page, dampingFactor) {
    const probDist = new Map();
    for (const state of corpus.keys()) {
        probDist.set(state, 0.0);
    }

    if (corpus.has(page)) {
        const numPages = corpus.size;
        const linkedPages = corpus.get(page);
        const numLinks = linkedPages.size;

        if (numLinks > 0) {
            // Probability of choosing a link on the page randomly
            for (const state of linkedPages) {
                probDist.set(state, probDist.get(state) + dampingFactor / numLinks);
            }
            
            // Probability of choosing any page at random (damping mechanism)
            for (const state of corpus.keys()) {
                probDist.set(state, probDist.get(state) + (1.0 - dampingFactor) / numPages);
            }
        } else {
            // If no outgoing links, choose randomly over all pages equally
            for (const state of corpus.keys()) {
                probDist.set(state, probDist.get(state) + 1.0 / numPages);
            }
        }
    }

    return probDist;
}

/**
 * Simulates weighted random selection equivalent to Python's random.choices(..., weights=...)
 * @param {Map<string, number>} probDist 
 * @returns {string} Selected page key
 */
function weightedRandomChoice(probDist) {
    const entries = Array.from(probDist.entries());
    const cumulativeWeights = [];
    let sum = 0;

    for (const [, weight] of entries) {
        sum += weight;
        cumulativeWeights.push(sum);
    }

    const r = Math.random() * sum;
    for (let i = 0; i < cumulativeWeights.length; i++) {
        if (r < cumulativeWeights[i]) {
            return entries[i][0];
        }
    }
    return entries[entries.length - 1][0];
}

/**
 * Calculates PageRank values for a corpus by sampling an N-step random surfer.
 * @param {Map<string, Set<string>>} corpus 
 * @param {number} dampingFactor 
 * @param {number} n 
 * @returns {Map<string, number>} Calculated page rank map
 */
function samplePageRank(corpus, dampingFactor, n) {
    const pages = Array.from(corpus.keys());
    const samples = new Map();
    for (const page of pages) {
        samples.set(page, 0);
    }

    // Randomly choose the first sample uniformly
    let sample = pages[Math.floor(Math.random() * pages.length)];
    samples.set(sample, samples.get(sample) + 1);

    // Randomly choose remaining samples based on the transition model
    for (let step = 1; step < n; step++) {
        const model = transitionModel(corpus, sample, dampingFactor);
        sample = weightedRandomChoice(model);
        samples.set(sample, samples.get(sample) + 1);
    }

    // Normalize samples into proportions
    const pageRanks = new Map();
    for (const [page, count] of samples.entries()) {
        pageRanks.set(page, count / n);
    }

    return pageRanks;
}

/**
 * Calculates PageRank values for a corpus iteratively until convergence.
 * @param {Map<string, Set<string>>} corpus 
 * @param {number} dampingFactor 
 * @returns {Map<string, number>} Calculated page rank map
 */
function iteratePageRank(corpus, dampingFactor) {
    const pageRanks = new Map();
    const numPages = corpus.size;

    // Initialize all pages with an equal rank
    if (numPages > 0) {
        for (const page of corpus.keys()) {
            pageRanks.set(page, 1.0 / numPages);
        }
    }

    // Cache the number of links for each page
    const numLinks = new Map();
    for (const [page, links] of corpus.entries()) {
        numLinks.set(page, links.size === 0 ? numPages : links.size);
    }

    // Iteratively update ranks until accuracy varies by less than 0.001
    let iterate = true;
    while (iterate) {
        iterate = false;
        const firstCondition = (1.0 - dampingFactor) / numPages;

        for (const page of corpus.keys()) {
            const currentRank = pageRanks.get(page);
            let secondCondition = 0.0;

            for (const [linkingPage, links] of corpus.entries()) {
                if (links.has(page) || links.size === 0) {
                    secondCondition += pageRanks.get(linkingPage) / numLinks.get(linkingPage);
                }
            }

            secondCondition *= dampingFactor;
            const newRank = firstCondition + secondCondition;
            pageRanks.set(page, newRank);

            if (Math.abs(newRank - currentRank) > 0.001) {
                iterate = true;
            }
        }
    }

    return pageRanks;
}

function main() {
    // Ensure correct CLI usage
    if (process.argv.length !== 3) {
        console.error("Usage: node pagerank.js <corpus_directory>");
        process.exit(1);
    }

    const directory = process.argv[2];
    const corpus = crawl(directory);

    // Print Sampling Results
    const sampledRanks = samplePageRank(corpus, DAMPING, SAMPLES);
    console.log(`PageRank Results from Sampling (n = ${SAMPLES})`);
    for (const [page, rank] of sampledRanks.entries()) {
        console.log(`  ${page}: ${rank.toFixed(4)}`);
    }

    // Print Iterative Results
    const iteratedRanks = iteratePageRank(corpus, DAMPING);
    console.log("\nPageRank Results from Iteration");
    for (const [page, rank] of iteratedRanks.entries()) {
        console.log(`  ${page}: ${rank.toFixed(4)}`);
    }
}

// Execute main
main();
