import * as genai from '@google/genai';
import fs from 'fs';
fs.writeFileSync('exports.txt', JSON.stringify(Object.keys(genai).sort(), null, 2));

