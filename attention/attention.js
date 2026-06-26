import fs from 'fs';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { AutoTokenizer, AutoModelForMaskedLM } from '@huggingface/transformers';
import { createCanvas } from 'canvas';

// ---------------------------------------------------------
// Hyperparameters & Constants
// ---------------------------------------------------------
const K = 3;

async function main() {
    const rl = readline.createInterface({ input, output });
    const text = await rl.question("Text: ");
    rl.close();

    // 1. Native Hugging Face Tokenizer & Model
    // Load the tokenizer and model with attention outputs enabled via configuration overrides
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/bert-base-uncased");
    
    if (!text.includes(tokenizer.mask_token)) {
        console.log(`Input must include mask token ${tokenizer.mask_token}.`);
        return 1;
    }

    const model = await AutoModelForMaskedLM.from_pretrained("Xenova/bert-base-uncased", {
        config: { output_attentions: true }
    });

    // 2. Tokenize and prep tensors
    const inputs = await tokenizer(text);
    
    // Convert token IDs back to string tokens for visualization axes
    const inputIdsArray = Array.from(inputs.input_ids.data);
    const tokens = tokenizer.convert_ids_to_tokens(inputIdsArray);

    // Find the index of the [MASK] token inside the native flat TypedArray
    const maskTokenId = tokenizer.vocab[tokenizer.mask_token];
    const maskTokenIndex = inputIdsArray.indexOf(maskTokenId);

    // 3. Model Inference
    // Transformers.js runs inside an optimized pipeline (similar to torch.no_grad()) by default
    const outputs = await model(inputs);

    const logits = outputs.logits;          // Shape: [Batch, SeqLen, VocabSize]
    const attentions = outputs.attentions;  // Array of Tensors: [Layers](Shape: [Batch, Heads, SeqLen, SeqLen])

    // 4. Generate Predictions
    const vocabSize = logits.dims[2];
    const stride = vocabSize;
    const offset = maskTokenIndex * stride;
    
    // Extract the logits subarray slice for the specific [MASK] token index
    const maskTokenLogits = logits.data.subarray(offset, offset + vocabSize);

    // Replicate torch.topk behavior by pairing values with indices and sorting
    const indexedLogits = Array.from(maskTokenLogits).map((val, idx) => ({ val, idx }));
    indexedLogits.sort((a, b) => b.val - a.val);
    const topK = indexedLogits.slice(0, K);

    for (const prediction of topK) {
        // Decode the single token ID
        const decodedToken = tokenizer.decode([prediction.idx]).trim();
        
        // Replace only the first instance of the mask token (parity with Python/C++ behavior)
        const predictedText = text.replace(tokenizer.mask_token, decodedToken);
        console.log(predictedText);
    }

    // 5. Visualize Attentions
    visualizeAttentions(tokens, attentions);
    
    return 0;
}

// ---------------------------------------------------------
// Attention Visualization Logic
// ---------------------------------------------------------
/**
 * Visualizes attention weights using HTML5 Canvas inside Node.js, replacing Matplotlib.
 * @param {string[]} tokens 
 * @param {import('@huggingface/transformers').Tensor[]} attentions 
 */
function visualizeAttentions(tokens, attentions) {
    const numLayers = attentions.length;
    const numHeads = attentions[0].dims[1];
    const seqLen = attentions[0].dims[2];

    // Image layout parameters matching the Python 8x8 figure feel
    const canvasSize = 800;
    const marginIdxX = 120; // Left margin for Y-axis labels
    const marginIdxY = 80;  // Top margin for Title
    const plotSize = 600;   // The core heatmap rendering square
    const cellSize = plotSize / seqLen;

    for (let i = 0; i < numLayers; i++) {
        const layerTensor = attentions[i];
        const headStride = seqLen * seqLen;

        for (let j = 0; j < numHeads; j++) {
            const canvas = createCanvas(canvasSize, canvasSize);
            const ctx = canvas.getContext('2d');

            // Fill background white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasSize, canvasSize);

            // Compute the correct flat data matrix slice offset for Layer i, Head j (Batch 0)
            const headOffset = j * headStride;
            const headAttention = layerTensor.data.subarray(headOffset, headOffset + headStride);

            // --- 1. Draw Grayscale Attention Heatmap Matrix ---
            for (let r = 0; r < seqLen; r++) {
                for (let c = 0; c < seqLen; c++) {
                    const weight = headAttention[r * seqLen + c];
                    
                    // Map float 0.0 - 1.0 directly to grayscale intensity 0 - 255
                    const grayValue = Math.floor(weight * 255);
                    ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;

                    const posX = marginIdxX + c * cellSize;
                    const posY = marginIdxY + r * cellSize;
                    ctx.fillRect(posX, posY, cellSize, cellSize);
                }
            }

            // --- 2. Apply Text Tokens Layout (Axes Labels) ---
            ctx.fillStyle = '#000000';
            ctx.font = '14px sans-serif';
            ctx.textBaseline = 'middle';

            for (let idx = 0; idx < seqLen; idx++) {
                const label = tokens[idx];
                const centerOffset = marginIdxY + idx * cellSize + cellSize / 2;

                // Y-Axis labels (Horizontal placement on the left margin)
                ctx.textAlign = 'right';
                ctx.fillText(label, marginIdxX - 10, centerOffset);

                // X-Axis labels (Rotated 90 degrees downward beneath the matrix)
                ctx.save();
                const xLabelPos = marginIdxX + idx * cellSize + cellSize / 2;
                ctx.translate(xLabelPos, marginIdxY + plotSize + 10);
                ctx.rotate(Math.PI / 2);
                ctx.textAlign = 'left';
                ctx.fillText(label, 0, 0);
                ctx.restore();
            }

            // --- 3. Add Graph Decoration (Title) ---
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Attention Layer ${i + 1} Head ${j + 1}`, canvasSize / 2, 40);

            // --- 4. Save Image to Disk ---
            const buffer = canvas.toBuffer('image/png');
            const filename = `Attention_Layer${i + 1}_Head${j + 1}.png`;
            fs.writeFileSync(filename, buffer);
        }
    }
}

// Global script execution trigger matching Python __main__ hook
main().then((exitCode) => {
    if (exitCode !== 0) process.exit(exitCode);
});
