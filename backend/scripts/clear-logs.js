// Clear log files to ensure only the latest execution is kept
const fs = require('fs');

const logFiles = [
    'backend-dev.err.log',
    'backend-dev.out.log',
    'frontend-dev.err.log',
    'frontend-dev.out.log'
];

logFiles.forEach(file => {
    try {
        fs.writeFileSync(file, '');
        console.log(`Cleared log file: ${file}`);
    } catch (e) {
        console.error(`Failed to clear log file ${file}:`, e.message);
    }
});

process.exit(0);
