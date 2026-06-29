import fs from 'node:fs';
import process from 'node:process';

const HEADER_SIZE = 44;

class WavHeader {
    constructor(buffer) {
        // Node.js Buffers allow reading little-endian values directly, 
        // avoiding the need for a format string like '<4sI4s...'
        this.chunkId = buffer.subarray(0, 4).toString('ascii');
        this.chunkSize = buffer.readUInt32LE(4);
        this.format = buffer.subarray(8, 12).toString('ascii');
        this.subchunk1Id = buffer.subarray(12, 16).toString('ascii');
        this.subchunk1Size = buffer.readUInt32LE(16);
        this.audioFormat = buffer.readUInt16LE(20);
        this.numChannels = buffer.readUInt16LE(22);
        this.sampleRate = buffer.readUInt32LE(24);
        this.byteRate = buffer.readUInt32LE(28);
        this.blockAlign = buffer.readUInt16LE(32);
        this.bitsPerSample = buffer.readUInt16LE(34);
        this.subchunk2Id = buffer.subarray(36, 40).toString('ascii');
        this.subchunk2Size = buffer.readUInt32LE(40);
    }
}

/**
 * Returns true when the header's format field is 'WAVE'.
 * @param {WavHeader} header 
 * @returns {boolean}
 */
function checkFormat(header) {
    return header.format === 'WAVE';
}

/**
 * Returns the size in bytes of one audio block.
 * @param {WavHeader} header 
 * @returns {number}
 */
function getBlockSize(header) {
    return Math.floor((header.numChannels * header.bitsPerSample) / 8);
}

function main() {
    const args = process.argv.slice(2);
    
    // Ensure proper usage
    if (args.length !== 2) {
        console.error("Usage: node reverse.js input.wav output.wav");
        process.exit(1);
    }

    const inputPath = args[0];
    const outputPath = args[1];

    let inFile, outFile;

    try {
        // Open input file in synchronous read mode
        inFile = fs.openSync(inputPath, 'r');
        
        const headerBuffer = Buffer.alloc(HEADER_SIZE);
        const bytesRead = fs.readSync(inFile, headerBuffer, 0, HEADER_SIZE, 0);
        
        if (bytesRead < HEADER_SIZE) {
            console.error("Error: Could not read WAV header.");
            process.exit(1);
        }

        // Unpack binary data into the WavHeader class
        const header = new WavHeader(headerBuffer);

        // Validate WAV format
        if (!checkFormat(header)) {
            console.error("Error: Input is not a WAV file.");
            process.exit(1);
        }

        // Calculate block size and blocks count
        const blockSize = getBlockSize(header);
        
        const stats = fs.statSync(inputPath);
        const audioSize = stats.size - HEADER_SIZE;
        const numBlocks = Math.floor(audioSize / blockSize);

        // Open output file in synchronous write mode
        outFile = fs.openSync(outputPath, 'w');
        
        // Write identical header to output
        fs.writeSync(outFile, headerBuffer, 0, HEADER_SIZE, 0);

        const blockBuffer = Buffer.alloc(blockSize);

        // Read and write blocks in reverse order
        for (let i = 0; i < numBlocks; i++) {
            const offset = HEADER_SIZE + (numBlocks - (i + 1)) * blockSize;
            
            // Read from the calculated offset in the input file
            fs.readSync(inFile, blockBuffer, 0, blockSize, offset);
            
            // Write sequentially to the output file (position: null appends)
            fs.writeSync(outFile, blockBuffer, 0, blockSize, null); 
        }

    } catch (error) {
        console.error("Error: Cannot open or process file.", error.message);
        process.exit(1);
    } finally {
        // Ensure file descriptors are closed to prevent memory leaks
        if (inFile !== undefined) fs.closeSync(inFile);
        if (outFile !== undefined) fs.closeSync(outFile);
    }
}

main();
