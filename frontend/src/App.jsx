import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import {
  CURRENT_USER_ID,
  downloadDocument,
  listDocuments,
  uploadDocument,
} from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    listDocuments()
      .then((items) => {
        if (isMounted) {
          setDocuments(items);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setFeedback({ type: 'error', message: error.message });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    setFeedback(null);

    try {
      setDocuments(await listDocuments());
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleUpload(file) {
    setIsUploading(true);
    setFeedback(null);

    try {
      const createdDocument = await uploadDocument(file);
      setDocuments((currentDocuments) => (
        [createdDocument, ...currentDocuments].sort((left, right) => (
          right.uploadedAt.localeCompare(left.uploadedAt)
          || left.id.localeCompare(right.id)
        ))
      ));
      setFeedback({ type: 'success', message: 'Arquivo enviado.' });
      return true;
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setFeedback(null);

    try {
      await downloadDocument(document.id, document.originalName);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Documentos, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">arquivo<span>/</span>local</span>
        </a>
        <div className="session-info">
          <span className="session-indicator" aria-hidden="true" />
          <span className="session-label">Sessão local</span>
          <span className="session-user">{CURRENT_USER_ID}</span>
        </div>
      </header>

      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">BIBLIOTECA PESSOAL</p>
            <h1>Documentos</h1>
          </div>
          <button
            className="text-button refresh-button"
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <span className={isRefreshing ? 'refresh-glyph is-spinning' : 'refresh-glyph'} aria-hidden="true">↻</span>
            {isRefreshing ? 'Atualizando' : 'Atualizar'}
          </button>
        </div>

        {feedback && (
          <div className={`feedback feedback-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
            <span className="feedback-mark" aria-hidden="true">{feedback.type === 'error' ? '!' : '✓'}</span>
            {feedback.message}
          </div>
        )}

        <div className="workspace-grid">
          <UploadComponent onUpload={handleUpload} isUploading={isUploading} />
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            downloadingId={downloadingId}
            onDownload={handleDownload}
          />
        </div>
      </main>
      <footer className="app-footer">
        <span>ARQUIVOS LOCAIS</span>
        <span>Usuário: {CURRENT_USER_ID}</span>
      </footer>
    </div>
  );
}