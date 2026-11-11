const fs = require('node:fs');
const AppError = require('../errors/AppError');
const documentService = require('../services/documentService');

async function upload(req, res, next) {
  try {
    const document = await documentService.createDocument(req.file, req.userId);
    return res.status(201).json({ document });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError(500, 'UPLOAD_FAILED', 'Não foi possível enviar o arquivo.'));
  }
}

function list(req, res, next) {
  try {
    return res.status(200).json({
      documents: documentService.listDocuments(req.userId),
    });
  } catch (error) {
    return next(new AppError(500, 'LIST_FAILED', 'Não foi possível listar os documentos.'));
  }
}

function download(req, res, next) {
  let downloadData;
  try {
    downloadData = documentService.getDocumentForDownload(req.params.id, req.userId);
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError(500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.'));
  }

  const stream = fs.createReadStream(downloadData.filePath);
  stream.on('error', (error) => {
    if (error.code === 'ENOENT') {
      return next(new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.'));
    }
    return next(new AppError(500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.'));
  });

  res.attachment(downloadData.document.originalName);
  res.type('application/octet-stream');
  return stream.pipe(res);
}

module.exports = { upload, list, download };