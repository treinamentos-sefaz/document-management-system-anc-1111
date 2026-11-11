const { randomUUID } = require('node:crypto');
const express = require('express');
const multer = require('multer');
const AppError = require('../errors/AppError');
const { MAX_FILE_SIZE_BYTES, STORAGE_DIRECTORY } = require('../config/documents');
const documentController = require('../controllers/documentController');
const requireUserId = require('../middleware/requireUserId');

const router = express.Router();
const storage = multer.diskStorage({
  destination: STORAGE_DIRECTORY,
  filename: (req, file, callback) => callback(null, randomUUID()),
});
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

function receiveUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'FILE_TOO_LARGE', 'O arquivo excede o limite de 10 MiB.'));
    }

    if (error instanceof multer.MulterError) {
      return next(new AppError(400, 'INVALID_UPLOAD', 'Envie exatamente um arquivo no campo file.'));
    }

    return next(new AppError(500, 'UPLOAD_FAILED', 'Não foi possível enviar o arquivo.'));
  });
}

router.use(requireUserId);
router.post('/upload', receiveUpload, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;