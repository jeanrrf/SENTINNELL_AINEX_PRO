// SENTINNELL_PRO/backend/src/services/document.service.js

const officeParser = require('officeparser');
const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');

const SUPPORTED_EXTENSIONS = new Set([
    'pdf',
    'docx',
    'pptx',
    'xlsx',
    'odt',
    'odp',
    'ods'
]);

const SUPPORTED_MIME_TYPES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.spreadsheet'
]);

function getExtension(name = '') {
    const parts = String(name).toLowerCase().split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
}

function isDocumentAttachment(attachment = {}) {
    const mimeType = String(attachment.mimeType || '').toLowerCase();
    const ext = getExtension(attachment.name);
    return SUPPORTED_MIME_TYPES.has(mimeType) || SUPPORTED_EXTENSIONS.has(ext);
}

function toBuffer(base64Data) {
    if (!base64Data) return null;
    try {
        return Buffer.from(base64Data, 'base64');
    } catch (error) {
        logger.error(`Falha ao converter base64 em buffer: ${error.message}`);
        return null;
    }
}

async function extractDocumentText(attachment, config = {}) {
    const buffer = toBuffer(attachment?.data);
    if (!buffer) return { text: '', error: 'invalid_buffer' };

    try {
        const mimeType = String(attachment?.mimeType || '').toLowerCase();
        const ext = getExtension(attachment?.name);
        const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
        if (isPdf) {
            const result = await pdfParse(buffer);
            return { text: (result?.text || '').trim(), error: null, parser: 'pdf-parse' };
        }

        const text = await officeParser.parseOfficeAsync(buffer, {
            newLineDelimiter: '\n',
            ...config
        });

        return { text: (text || '').trim(), error: null, parser: 'officeparser' };
    } catch (error) {
        logger.error(`Erro ao extrair texto do documento: ${error.message}`);
        return { text: '', error: error.message, parser: null };
    }
}

module.exports = {
    isDocumentAttachment,
    extractDocumentText
};
