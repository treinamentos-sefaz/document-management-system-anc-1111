const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');
const app = require('../src/app');
const { STORAGE_DIRECTORY } = require('../src/config/documents');

async function startServer(t) {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

function createFileForm(contents, filename = 'relatorio.txt') {
  const form = new FormData();
  form.append('file', new Blob([contents], { type: 'text/plain' }), filename);
  return form;
}

test('upload, listagem e download respeitam o proprietário', async (t) => {
  const baseUrl = await startServer(t);
  const owner = `user-${Date.now()}`;
  const content = 'conteúdo do documento';

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: createFileForm(content),
  });

  assert.equal(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.equal(document.originalName, 'relatorio.txt');
  assert.equal(document.size, Buffer.byteLength(content));
  assert.equal(document.owner, owner);
  assert.match(document.id, /^[0-9a-f-]{36}$/i);
  assert.equal(Object.hasOwn(document, 'storageName'), false);

  const storedPath = path.join(STORAGE_DIRECTORY, document.id);
  t.after(() => fs.rm(storedPath, { force: true }));

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': owner },
  });
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).documents, [document]);

  const otherUserList = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': `${owner}-other` },
  });
  assert.deepEqual((await otherUserList.json()).documents, []);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': owner },
  });
  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get('content-type'), 'application/octet-stream');
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.equal(await downloadResponse.text(), content);

  const deniedDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': `${owner}-other` },
  });
  assert.equal(deniedDownload.status, 404);
  assert.deepEqual(await deniedDownload.json(), {
    error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
  });
});

test('rejeita usuário ausente, arquivo ausente e arquivo vazio', async (t) => {
  const baseUrl = await startServer(t);

  const missingUser = await fetch(`${baseUrl}/documents`);
  assert.equal(missingUser.status, 400);
  assert.equal((await missingUser.json()).error.code, 'MISSING_USER_ID');

  const missingFile = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'validation-user' },
    body: new FormData(),
  });
  assert.equal(missingFile.status, 400);
  assert.equal((await missingFile.json()).error.code, 'MISSING_FILE');

  const emptyFile = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'validation-user' },
    body: createFileForm('', 'empty.txt'),
  });
  assert.equal(emptyFile.status, 400);
  assert.equal((await emptyFile.json()).error.code, 'MISSING_FILE');
});

test('rejeita arquivos acima do limite configurado', async (t) => {
  const baseUrl = await startServer(t);
  const tooLarge = new Uint8Array(10 * 1024 * 1024 + 1);

  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'large-file-user' },
    body: createFileForm(tooLarge, 'large.bin'),
  });

  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, 'FILE_TOO_LARGE');
});

test('exige usuário em todos os endpoints de documentos', async (t) => {
  const baseUrl = await startServer(t);
  const requests = [
    ['/upload', { method: 'POST', body: createFileForm('conteúdo') }],
    ['/documents', {}],
    ['/documents/inexistente/download', {}],
  ];

  for (const [endpoint, options] of requests) {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'MISSING_USER_ID');
  }
});

test('retorna 404 ao baixar um documento inexistente', async (t) => {
  const baseUrl = await startServer(t);
  const response = await fetch(`${baseUrl}/documents/inexistente/download`, {
    headers: { 'X-User-Id': 'download-user' },
  });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
  });
});