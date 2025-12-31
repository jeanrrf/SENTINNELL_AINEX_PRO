const fs = require('fs');
const { cyan, green, yellow, red, magenta } = require('colorette');

const infoLogPath = 'backend-dev.out.log';
const errorLogPath = 'backend-dev.err.log';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_RATE_LIMIT_MS = Number(process.env.LOG_RATE_LIMIT_MS || 1000);

const LEVELS = {
    error: 0,
    warn: 1,
    success: 2,
    info: 2,
    debug: 3
};
const currentLevel = LEVELS[LOG_LEVEL] ?? LEVELS.info;
const lastSeen = new Map();

// Truncate log files at start
fs.writeFileSync(infoLogPath, '');
fs.writeFileSync(errorLogPath, '');

function appendToFile(path, msg) {
    fs.appendFileSync(path, msg + '\n', { encoding: 'utf8' });
}

function shouldLog(level, msg) {
    const levelValue = LEVELS[level] ?? LEVELS.info;
    if (levelValue > currentLevel) return false;
    if (!LOG_RATE_LIMIT_MS || levelValue === LEVELS.error) return true;
    const key = `${level}:${msg}`;
    const now = Date.now();
    const last = lastSeen.get(key) || 0;
    if (now - last < LOG_RATE_LIMIT_MS) return false;
    lastSeen.set(key, now);
    return true;
}

const logger = {
    info: (msg) => {
        const formatted = `${cyan('[INFO]')} ${msg}`;
        if (!shouldLog('info', msg)) return;
        appendToFile(infoLogPath, formatted);
        console.log(formatted);
    },
    success: (msg) => {
        const formatted = `${green('[SUCCESS]')} ${msg}`;
        if (!shouldLog('success', msg)) return;
        appendToFile(infoLogPath, formatted);
        console.log(formatted);
    },
    warn: (msg) => {
        const formatted = `${yellow('[WARN]')} ${msg}`;
        if (!shouldLog('warn', msg)) return;
        appendToFile(infoLogPath, formatted);
        console.log(formatted);
    },
    error: (msg, detail = '') => {
        const formatted = `${red('[ERROR]')} ${msg} ${detail}`;
        appendToFile(errorLogPath, formatted);
        console.log(`${red('[ERROR]')} ${msg}`, detail);
    },
    debug: (msg) => {
        const formatted = `${magenta('[DEBUG]')} ${msg}`;
        if (!shouldLog('debug', msg)) return;
        appendToFile(infoLogPath, formatted);
        console.log(formatted);
    }
};

module.exports = logger;
