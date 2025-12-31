// SENTINNELL_PRO/backend/src/utils/logger.js
const { cyan, green, yellow, red, magenta } = require('colorette');
const logger = {
    info: (msg) => console.log(`${cyan('[INFO]')} ${msg}`),
    success: (msg) => console.log(`${green('[SUCCESS]')} ${msg}`),
    warn: (msg) => console.log(`${yellow('[WARN]')} ${msg}`),
    error: (msg, detail = '') => console.log(`${red('[ERROR]')} ${msg}`, detail),
    debug: (msg) => console.log(`${magenta('[DEBUG]')} ${msg}`)
};
module.exports = logger;

