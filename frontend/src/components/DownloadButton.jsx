export default function DownloadButton({ document, onDownload, isDownloading }) {
  return (
    <button
      className="download-button"
      type="button"
      onClick={() => onDownload(document)}
      disabled={isDownloading}
      aria-label={`${isDownloading ? 'Baixando' : 'Baixar'} ${document.originalName}`}
    >
      {isDownloading ? 'Baixando...' : 'Baixar'}
      <span aria-hidden="true">↓</span>
    </button>
  );
}