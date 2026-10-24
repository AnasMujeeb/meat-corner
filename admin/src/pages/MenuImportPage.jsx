import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { importApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';

const COLUMNS = [
  { name: 'name', required: true, desc: 'Menu item name (used to match existing items for update).' },
  { name: 'category', required: true, desc: 'Category name. Will be created if it does not exist.' },
  { name: 'description', required: false, desc: 'Short description of the item.' },
  { name: 'price', required: true, desc: 'Price in QAR (number, e.g. 45 or 45.50).' },
  { name: 'calories', required: false, desc: 'Calorie count (number).' },
  { name: 'fat', required: false, desc: 'Fat in grams.' },
  { name: 'protein', required: false, desc: 'Protein in grams.' },
  { name: 'carbs', required: false, desc: 'Carbohydrates in grams.' },
  { name: 'fiber', required: false, desc: 'Fiber in grams.' },
  { name: 'allergens', required: false, desc: 'Comma-separated list, e.g. "gluten,dairy,nuts".' },
  { name: 'tags', required: false, desc: 'Comma-separated list, e.g. "featured,new".' },
  { name: 'available', required: false, desc: 'true or false (defaults to true).' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function MenuImportPage() {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  async function downloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const res = await importApi.downloadTemplate();
      if (!res.ok) throw new Error('Failed to download template.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meat-corner-menu-import-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || 'Download failed.');
    } finally {
      setDownloadingTemplate(false);
    }
  }

  function validateFile(file) {
    if (!file) return 'No file selected.';
    if (file.size > MAX_FILE_SIZE) return `File is too large (max 5 MB). Your file: ${(file.size / 1024 / 1024).toFixed(1)} MB.`;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) return 'Only .csv and .xlsx files are supported.';
    return null;
  }

  function selectFile(file) {
    const err = validateFile(file);
    if (err) { toast.error(err); return; }
    setSelectedFile(file);
    setResult(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) selectFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    const err = validateFile(selectedFile);
    if (err) { toast.error(err); return; }

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const res = await importApi.uploadFile(selectedFile, (p) => setProgress(p));
      if (res?.success) {
        setResult(res.data);
        toast.success('Import complete!');
      } else {
        throw new Error(res?.message || 'Import failed.');
      }
    } catch (err) {
      toast.error(err.message || 'Import failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Bulk Import Menu</h1>
          <p className="page-subtitle">Upload a .csv or .xlsx file to create or update menu items in bulk</p>
        </div>
        <div className="page-actions">
          <Button
            variant="secondary"
            onClick={downloadTemplate}
            isLoading={downloadingTemplate}
            id="download-template-btn"
          >
            <Download size={14} />
            Download Template
          </Button>
        </div>
      </div>

      {/* Column reference */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ gap: 8 }}>
          <Info size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="section-title">Column Reference</h2>
        </div>
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div className="table-wrap">
            <table aria-label="Column reference">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {COLUMNS.map((col) => (
                  <tr key={col.name}>
                    <td data-label="Column">
                      <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{col.name}</code>
                    </td>
                    <td data-label="Required">
                      {col.required ? (
                        <span className="badge badge-amber">required</span>
                      ) : (
                        <span className="badge badge-gray">optional</span>
                      )}
                    </td>
                    <td data-label="Description" style={{ fontSize: 13 }}>{col.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2 className="section-title">Upload File</h2>
        </div>
        <div className="card-body">
          <div
            className={`image-uploader-zone${isDragOver ? ' drag-over' : ''}`}
            style={{ padding: '40px 20px', cursor: uploading ? 'default' : 'pointer' }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && !uploading && fileInputRef.current?.click()}
            aria-label="Upload CSV or XLSX file"
          >
            {selectedFile ? (
              <>
                <FileText size={32} className="upload-icon" style={{ color: 'var(--accent)' }} />
                <p className="upload-label" style={{ fontWeight: 600 }}>{selectedFile.name}</p>
                <p className="upload-hint">{(selectedFile.size / 1024).toFixed(0)} KB · Click to change</p>
              </>
            ) : (
              <>
                <Upload size={32} className="upload-icon" />
                <p className="upload-label"><strong>Click to upload</strong> or drag and drop</p>
                <p className="upload-hint">.csv or .xlsx · max 5 MB</p>
              </>
            )}
          </div>

          {uploading && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Uploading… {progress}%
              </div>
              <div className="upload-progress">
                <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); e.target.value = ''; }}
            aria-hidden="true"
          />

          {selectedFile && !uploading && (
            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => { setSelectedFile(null); setResult(null); }}>
                Clear
              </Button>
              <Button variant="primary" onClick={handleUpload} id="import-upload-btn">
                <Upload size={14} />
                Import File
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Result summary */}
      {result && (
        <div className="card">
          <div className="card-header">
            <CheckCircle size={16} style={{ color: '#059669' }} />
            <h2 className="section-title">Import Results</h2>
          </div>
          <div className="card-body">
            <div className="stat-grid" style={{ marginBottom: 20 }}>
              <div className="stat-card">
                <div className="stat-icon green"><CheckCircle size={20} /></div>
                <div>
                  <div className="stat-value">{result.created ?? 0}</div>
                  <div className="stat-label">Created</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><CheckCircle size={20} /></div>
                <div>
                  <div className="stat-value">{result.updated ?? 0}</div>
                  <div className="stat-label">Updated</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber"><AlertTriangle size={20} /></div>
                <div>
                  <div className="stat-value">{result.skipped ?? 0}</div>
                  <div className="stat-label">Skipped</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><XCircle size={20} /></div>
                <div>
                  <div className="stat-value">{result.errors?.length ?? 0}</div>
                  <div className="stat-label">Errors</div>
                </div>
              </div>
            </div>

            {result.newCategories?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>New categories created:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.newCategories.map((cat) => (
                    <span key={cat} className="badge badge-green">{cat}</span>
                  ))}
                </div>
              </div>
            )}

            {result.errors?.length > 0 && (
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#dc2626' }}>
                  Row errors ({result.errors.length}):
                </p>
                <div className="table-wrap">
                  <table aria-label="Import errors">
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>Row</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e, i) => (
                        <tr key={i}>
                          <td data-label="Row" style={{ fontWeight: 600 }}>{e.row ?? i + 1}</td>
                          <td data-label="Error" style={{ color: '#dc2626', fontSize: 13 }}>{e.message || String(e)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
