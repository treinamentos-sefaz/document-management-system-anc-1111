const fs = require('node:fs/promises');
const path = require('node:path');
const { STORAGE_DIRECTORY } = require('../config/documents');

function getFilePath(storageName) {
  return path.join(STORAGE_DIRECTORY, storageName);
}

function removeFile(filePath) {
  return fs.unlink(filePath);
}

module.exports = { getFilePath, removeFile };
