import fs from 'node:fs';
import process from 'node:process';

const TEST_SIZE = 0.4;

class KNeighborsClassifier {
    constructor() {
        this.X_train = [];
        this.y_train = [];
    }

    /**
     * @param {number[][]} evidence 
     * @param {number[]} labels 
     */
    fit(evidence, labels) {
        this.X_train = evidence;
        this.y_train = labels;
    }

    /**
     * @param {number[][]} X_test 
     * @returns {number[]}
     */
    predict(X_test) {
        const predictions = [];
        
        for (const testPoint of X_test) {
            // Finding the single nearest neighbor (k=1)
            let minDist = Infinity;
            let bestLabel = 0;

            for (let i = 0; i < this.X_train.length; i++) {
                const trainPoint = this.X_train[i];
                
                // Calculate squared Euclidean distance
                let dist = 0;
                for (let j = 0; j < testPoint.length; j++) {
                    dist += (testPoint[j] - trainPoint[j]) ** 2;
                }

                if (dist < minDist) {
                    minDist = dist;
                    bestLabel = this.y_train[i];
                }
            }
            predictions.push(bestLabel);
        }
        return predictions;
    }
}

/**
 * Loads and maps CSV data into evidence and labels.
 * @param {string} filename 
 * @returns {{ evidence: number[][], labels: number[] }}
 */
function loadData(filename) {
    const evidence = [];
    const labels = [];

    // Mapping definitions
    const visitorMap = { "Returning_Visitor": 1, "New_Visitor": 0, "Other": 0 };
    const boolMap = { "TRUE": 1, "FALSE": 0, "True": 1, "False": 0 };
    const monthMap = {
        "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "June": 5,
        "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
    };

    const fileContent = fs.readFileSync(filename, 'utf-8').trim();
    const lines = fileContent.split(/\r?\n/);
    if (lines.length === 0) return { evidence, labels };

    // Extract headers for dictionary-like mapping
    const headers = lines[0].split(',').map(h => h.trim());

    for (let i = 1; i < lines.length; i++) {
        const rowArr = lines[i].split(',');
        if (rowArr.length !== headers.length) continue;

        const row = {};
        headers.forEach((h, idx) => {
            row[h] = rowArr[idx].trim();
        });

        try {
            const rowEvidence = [
                parseFloat(row["Administrative"]), parseFloat(row["Informational"]),
                parseFloat(row["ProductRelated"]), parseFloat(row["Administrative_Duration"]),
                parseFloat(row["Informational_Duration"]), parseFloat(row["ProductRelated_Duration"]),
                parseFloat(row["BounceRates"]), parseFloat(row["ExitRates"]),
                parseFloat(row["PageValues"]), parseFloat(row["SpecialDay"]),
                monthMap[row["Month"]], parseFloat(row["OperatingSystems"]),
                parseFloat(row["Browser"]), parseFloat(row["Region"]),
                parseFloat(row["TrafficType"]), visitorMap[row["VisitorType"]],
                boolMap[row["Weekend"]]
            ];

            // Validate that no values parsed to NaN (equivalent to Python's ValueError catch)
            if (rowEvidence.some(Number.isNaN) || monthMap[row["Month"]] === undefined) {
                continue;
            }

            const label = boolMap[row["Revenue"]];
            if (label === undefined) continue;

            evidence.push(rowEvidence);
            labels.push(label);
        } catch (error) {
            continue;
        }
    }

    return { evidence, labels };
}

/**
 * Splits data into train and test groups.
 * @param {number[][]} evidence 
 * @param {number[]} labels 
 * @param {number} testSize 
 */
function trainTestSplit(evidence, labels, testSize) {
    // Combine for shuffling (mimicking Python's zip)
    const data = evidence.map((e, i) => ({ e, l: labels[i] }));

    // Fisher-Yates shuffle
    for (let i = data.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [data[i], data[j]] = [data[j], data[i]];
    }

    const splitIdx = Math.floor(data.length * (1.0 - testSize));
    const train = data.slice(0, splitIdx);
    const test = data.slice(splitIdx);

    // Unzip back into separate arrays
    return {
        X_train: train.map(d => d.e),
        X_test: test.map(d => d.e),
        y_train: train.map(d => d.l),
        y_test: test.map(d => d.l)
    };
}

/**
 * Evaluates the model's predictions.
 * @param {number[]} labels 
 * @param {number[]} predictions 
 * @returns {{ sensitivity: number, specificity: number }}
 */
function evaluate(labels, predictions) {
    let positiveCount = 0;
    let negativeCount = 0;
    let truePositives = 0;
    let trueNegatives = 0;

    for (let i = 0; i < labels.length; i++) {
        if (labels[i] === 1) {
            positiveCount++;
            if (predictions[i] === 1) truePositives++;
        } else if (labels[i] === 0) {
            negativeCount++;
            if (predictions[i] === 0) trueNegatives++;
        }
    }

    const sensitivity = positiveCount > 0 ? truePositives / positiveCount : 0.0;
    const specificity = negativeCount > 0 ? trueNegatives / negativeCount : 0.0;

    return { sensitivity, specificity };
}

function main() {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.error("Usage: node shopping.js data.csv");
        process.exit(1);
    }

    const { evidence, labels } = loadData(args[0]);
    const { X_train, X_test, y_train, y_test } = trainTestSplit(evidence, labels, TEST_SIZE);

    const model = new KNeighborsClassifier();
    model.fit(X_train, y_train);
    const predictions = model.predict(X_test);

    const { sensitivity, specificity } = evaluate(y_test, predictions);

    let correct = 0;
    for (let i = 0; i < y_test.length; i++) {
        if (y_test[i] === predictions[i]) {
            correct++;
        }
    }
    const incorrect = y_test.length - correct;

    console.log(`Correct: ${correct}`);
    console.log(`Incorrect: ${incorrect}`);
    console.log(`True Positive Rate: ${(100 * sensitivity).toFixed(2)}%`);
    console.log(`True Negative Rate: ${(100 * specificity).toFixed(2)}%`);
}

// Execute the main function
main();
