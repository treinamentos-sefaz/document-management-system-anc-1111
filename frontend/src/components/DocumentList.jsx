import DownloadButton from './DownloadButton.jsx';
import { formatFileSize, formatUploadedAt } from '../utils/fileFormatting.js';

export default function DocumentList({ documents, isLoading, downloadingId, onDownload }) {
  return (
    <section className="documents-section" aria-labelledby="documents-heading" aria-busy={isLoading}>
      <div className="documents-heading">
        <div className="panel-heading">
          <span className="panel-index">02</span>
          <h2 id="documents-heading">Seus arquivos</h2>
        </div>
        {!isLoading && <span className="document-count">{documents.length.toString().padStart(2, '0')}</span>}
      </div>

      {isLoading ? (
        <div className="list-state" role="status">Carregando documentos...</div>
      ) : documents.length === 0 ? (
        <div className="list-state empty-state">
          <span className="empty-mark" aria-hidden="true">—</span>
          <p>Nenhum documento ainda</p>
        </div>
      ) : (
        <div className="document-table-wrap">
          <table className="document-table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th className="document-size" scope="col">Tamanho</th>
                <th className="document-date" scope="col">Enviado em</th>
                <th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="document-name" title={document.originalName}>{document.originalName}</td>
                  <td className="document-size">{formatFileSize(document.size)}</td>
                  <td className="document-date">{formatUploadedAt(document.uploadedAt)}</td>
                  <td className="document-action">
                    <DownloadButton
                      document={document}
                      onDownload={onDownload}
                      isDownloading={downloadingId === document.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}