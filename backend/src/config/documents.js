const path = require('node:path');

const STORAGE_DIRECTORY = path.resolve(__dirname, '../../storage');
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

module.exports = { STORAGE_DIRECTORY, MAX_FILE_SIZE_BYTES };