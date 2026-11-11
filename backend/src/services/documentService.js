const fs = require('node:fs/promises');
const path = require('node:path');
const AppError = require('../errors/AppError');
const { MAX_FILE_SIZE_BYTES, STORAGE_DIRECTORY } = require('../config/documents');
const documentRepository = require('../repositories/documentRepository');

async function removeUploadedFile(filePath) {
  if (filePath) {
    await fs.unlink(filePath).catch(() => {});
  }
}

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

async function createDocument(file, owner) {
  if (!file) {
    throw new AppError(400, 'MISSING_FILE', 'Envie um arquivo no campo file.');
  }

  if (file.size === 0) {
    await removeUploadedFile(file.path);
    throw new AppError(400, 'MISSING_FILE', 'O arquivo não pode estar vazio.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    await removeUploadedFile(file.path);
    throw new AppError(413, 'FILE_TOO_LARGE', 'O arquivo excede o limite de 10 MiB.');
  }

  const document = {
    id: file.filename,
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
  };

  try {
    return toPublicDocument(documentRepository.addDocument(document));
  } catch (error) {
    await removeUploadedFile(file.path);
    throw error;
  }
}

function listDocuments(owner) {
  return documentRepository.listByOwner(owner).map(toPublicDocument);
}

function getDocumentForDownload(id, owner) {
  const document = documentRepository.findById(id);

  if (!document || document.owner !== owner) {
    throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return {
    document: toPublicDocument(document),
    filePath: path.join(STORAGE_DIRECTORY, document.storageName),
  };
}

module.exports = { createDocument, listDocuments, getDocumentForDownload };