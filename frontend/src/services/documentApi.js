const API_PREFIX = '/api';
const DEFAULT_USER_ID = 'demo-user';

export const CURRENT_USER_ID = (import.meta.env.VITE_USER_ID || DEFAULT_USER_ID).trim() || DEFAULT_USER_ID;
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('X-User-Id', CURRENT_USER_ID);

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || 'Não foi possível concluir a operação.');
  }

  return response;
}

export async function listDocuments() {
  const response = await request('/documents');
  const payload = await response.json();
  return payload.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    body: formData,
  });
  const payload = await response.json();
  return payload.document;
}

export async function downloadDocument(id, originalName) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');

  link.href = downloadUrl;
  link.download = originalName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
}