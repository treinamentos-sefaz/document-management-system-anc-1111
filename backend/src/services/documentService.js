const AppError = require('../errors/AppError');
const { MAX_FILE_SIZE_BYTES } = require('../config/documents');
const documentRepository = require('../repositories/documentRepository');
const documentStorageRepository = require('../repositories/documentStorageRepository');

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

function validateFile(file) {
  if (!file) {
    throw new AppError(400, 'MISSING_FILE', 'Envie um arquivo no campo file.');
  }

  if (file.size === 0) {
    throw new AppError(400, 'MISSING_FILE', 'O arquivo não pode estar vazio.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError(413, 'FILE_TOO_LARGE', 'O arquivo excede o limite de 10 MiB.');
  }
}

async function createDocument(file, owner) {
  try {
    validateFile(file);

    const document = {
      id: file.filename,
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner,
      storageName: file.filename,
    };

    return toPublicDocument(documentRepository.addDocument(document));
  } catch (error) {
    if (file && file.path) {
      try {
        await documentStorageRepository.removeFile(file.path);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Não foi possível remover o arquivo após falha no upload.',
        );
      }
    }
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
    filePath: documentStorageRepository.getFilePath(document.storageName),
  };
}

module.exports = { createDocument, listDocuments, getDocumentForDownload };