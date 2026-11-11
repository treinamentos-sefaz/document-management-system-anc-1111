import { useId, useRef, useState } from 'react';
import { MAX_UPLOAD_SIZE_BYTES } from '../services/documentApi.js';
import { formatFileSize } from '../utils/fileFormatting.js';

export default function UploadComponent({ onUpload, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState('');
  const inputId = useId();
  const inputRef = useRef(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    setValidationError('');

    if (file && file.size > MAX_UPLOAD_SIZE_BYTES) {
      setSelectedFile(null);
      setValidationError('O arquivo excede o limite de 10 MiB.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || isUploading) {
      return;
    }

    const uploaded = await onUpload(selectedFile);
    if (uploaded) {
      setSelectedFile(null);
      inputRef.current.value = '';
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-heading">
      <div className="panel-heading">
        <span className="panel-index">01</span>
        <h2 id="upload-heading">Adicionar arquivo</h2>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-picker" htmlFor={inputId}>
          <span className="file-picker-mark" aria-hidden="true">＋</span>
          <span>Selecionar arquivo</span>
        </label>
        <input
          ref={inputRef}
          className="visually-hidden"
          id={inputId}
          type="file"
          onChange={handleFileChange}
          aria-describedby={`${inputId}-limit ${inputId}-error`}
        />

        <p className="upload-limit" id={`${inputId}-limit`}>Limite por arquivo: 10 MiB</p>

        {selectedFile && (
          <div className="selected-file" title={selectedFile.name}>
            <span className="selected-file-name">{selectedFile.name}</span>
            <span className="selected-file-size">{formatFileSize(selectedFile.size)}</span>
          </div>
        )}

        <p className="inline-error" id={`${inputId}-error`} role={validationError ? 'alert' : undefined}>
          {validationError}
        </p>

        <button className="primary-button upload-submit" type="submit" disabled={!selectedFile || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar arquivo'}
          <span aria-hidden="true">↗</span>
        </button>
      </form>
      <p className="storage-note"><span className="storage-dot" />Armazenamento local</p>
    </section>
  );
}