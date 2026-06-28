import { train, play } from './nim.js';

// Train the AI with 10,000 games (Synchronous)
const ai = train(10000);

// Play against the trained AI (Asynchronous)
await play(ai);
