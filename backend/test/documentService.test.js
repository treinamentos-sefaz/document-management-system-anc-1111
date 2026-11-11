const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const AppError = require('../src/errors/AppError');
const { MAX_FILE_SIZE_BYTES, STORAGE_DIRECTORY } = require('../src/config/documents');
const documentRepository = require('../src/repositories/documentRepository');
const documentStorageRepository = require('../src/repositories/documentStorageRepository');
const documentService = require('../src/services/documentService');

function uploadedFile(size = 5) {
  return {
    filename: 'generated-id',
    originalname: 'documento.txt',
    size,
    path: '/tmp/generated-id',
  };
}

test('criação persiste metadados e retorna apenas dados públicos', async (t) => {
  const addDocument = t.mock.method(documentRepository, 'addDocument', (document) => document);
  const removeFile = t.mock.method(documentStorageRepository, 'removeFile');

  const document = await documentService.createDocument(uploadedFile(), 'user');

  assert.deepEqual(document, {
    id: 'generated-id',
    originalName: 'documento.txt',
    size: 5,
    uploadedAt: document.uploadedAt,
    owner: 'user',
  });
  assert.equal(new Date(document.uploadedAt).toISOString(), document.uploadedAt);
  assert.equal(addDocument.mock.calls[0].arguments[0].storageName, 'generated-id');
  assert.equal(removeFile.mock.callCount(), 0);
});

test('aceita arquivo exatamente no limite de tamanho', async (t) => {
  t.mock.method(documentRepository, 'addDocument', (document) => document);
  const document = await documentService.createDocument(uploadedFile(MAX_FILE_SIZE_BYTES), 'user');
  assert.equal(document.size, MAX_FILE_SIZE_BYTES);
});

test('validação rejeita arquivos inválidos e remove os arquivos recebidos', async (t) => {
  const removeFile = t.mock.method(documentStorageRepository, 'removeFile', async () => {});
  const addDocument = t.mock.method(documentRepository, 'addDocument');

  await assert.rejects(documentService.createDocument(undefined, 'user'), {
    statusCode: 400,
    code: 'MISSING_FILE',
    message: 'Envie um arquivo no campo file.',
  });
  await assert.rejects(documentService.createDocument(uploadedFile(0), 'user'), {
    statusCode: 400,
    code: 'MISSING_FILE',
    message: 'O arquivo não pode estar vazio.',
  });
  await assert.rejects(documentService.createDocument(uploadedFile(MAX_FILE_SIZE_BYTES + 1), 'user'), {
    statusCode: 413,
    code: 'FILE_TOO_LARGE',
  });

  assert.equal(addDocument.mock.callCount(), 0);
  assert.equal(removeFile.mock.callCount(), 2);
  for (const call of removeFile.mock.calls) {
    assert.deepEqual(call.arguments, ['/tmp/generated-id']);
  }
});

test('falha ao persistir remove o arquivo e preserva o erro original', async (t) => {
  const failure = new Error('Falha ao persistir metadados');
  t.mock.method(documentRepository, 'addDocument', () => { throw failure; });
  const removeFile = t.mock.method(documentStorageRepository, 'removeFile', async () => {});

  await assert.rejects(documentService.createDocument(uploadedFile(), 'user'), (error) => error === failure);
  assert.deepEqual(removeFile.mock.calls[0].arguments, ['/tmp/generated-id']);
});

test('falha na limpeza informa tanto o erro original quanto o erro de remoção', async (t) => {
  const cleanupError = new Error('Falha ao remover arquivo');
  t.mock.method(documentStorageRepository, 'removeFile', async () => { throw cleanupError; });

  await assert.rejects(documentService.createDocument(uploadedFile(0), 'user'), (error) => {
    assert.ok(error instanceof AggregateError);
    assert.ok(error.errors[0] instanceof AppError);
    assert.equal(error.errors[0].code, 'MISSING_FILE');
    assert.equal(error.errors[1], cleanupError);
    return true;
  });
});

test('listagem e download não expõem o nome interno e respeitam o proprietário', (t) => {
  const storedDocument = {
    id: 'generated-id',
    originalName: 'documento.txt',
    size: 5,
    uploadedAt: '2026-01-01T00:00:00.000Z',
    owner: 'user',
    storageName: 'internal-name',
  };
  const { storageName, ...publicDocument } = storedDocument;
  t.mock.method(documentRepository, 'listByOwner', () => [storedDocument]);
  const findById = t.mock.method(documentRepository, 'findById', () => storedDocument);

  assert.deepEqual(documentService.listDocuments('user'), [publicDocument]);
  assert.deepEqual(documentService.getDocumentForDownload('generated-id', 'user'), {
    document: publicDocument,
    filePath: path.join(STORAGE_DIRECTORY, storageName),
  });
  assert.throws(() => documentService.getDocumentForDownload('generated-id', 'other'), {
    statusCode: 404,
    code: 'DOCUMENT_NOT_FOUND',
  });
  findById.mock.mockImplementation(() => null);
  assert.throws(() => documentService.getDocumentForDownload('unknown', 'user'), {
    statusCode: 404,
    code: 'DOCUMENT_NOT_FOUND',
  });
});

test('repositório de storage remove um arquivo no filesystem', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-storage-test-'));
  const filePath = path.join(directory, 'upload');
  t.after(async () => {
    await fs.rm(filePath, { force: true });
    await fs.rmdir(directory);
  });
  await fs.writeFile(filePath, 'documento');

  await documentStorageRepository.removeFile(filePath);

  await assert.rejects(fs.access(filePath), { code: 'ENOENT' });
});
