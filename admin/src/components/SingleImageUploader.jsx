import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadApi } from '../api/endpoints.js';
import { compressImage } from '../utils/imageCompressor.js';
import toast from 'react-hot-toast';

/**
 * Single-image uploader that stores just a URL string.
 * value: string (URL)
 * onChange: (url: string) => void
 */
export default function SingleImageUploader({ value = '', onChange, label = 'Image' }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(file) {
    if (!file) return;
    const ext = file.name ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
    if (ext === '.heic' || ext === '.heif' || file.type.includes('heic') || file.type.includes('heif')) {
      toast.error('JPG ya PNG use karein (HEIC admin upload mein supported nahi hai).');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const compressed = await compressImage(file);
      const result = await uploadApi.upload(compressed, (p) => setProgress(p));
      onChange(result.url || '');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function remove() {
    if (value) uploadApi.delete(value).catch(() => {});
    onChange('');
  }

  return (
    <div>
      <p className="label">{label}</p>
      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={value}
            alt="Preview"
            style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'block' }}
          />
          <button
            type="button"
            onClick={remove}
            aria-label="Remove image"
            style={{
              position: 'absolute', top: 4, right: 4,
              background: '#dc2626', color: '#fff', border: 'none',
              borderRadius: '50%', width: 22, height: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div
          className={`image-uploader-zone${isDragOver ? ' drag-over' : ''}`}
          style={{ padding: '20px', cursor: uploading ? 'default' : 'pointer' }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          aria-label="Upload image"
        >
          <Upload size={24} className="upload-icon" />
          <p className="upload-label"><strong>Click to upload</strong> or drag and drop</p>
          <p className="upload-hint">JPEG, PNG, WebP · max 8 MB</p>
        </div>
      )}

      {uploading && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Uploading… {progress}%
          </div>
          <div className="upload-progress">
            <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        aria-hidden="true"
      />
    </div>
  );
}
