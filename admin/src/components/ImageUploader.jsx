import { useRef, useState } from 'react';
import { Upload, X, Star } from 'lucide-react';
import { uploadApi } from '../api/endpoints.js';
import toast from 'react-hot-toast';

/**
 * Multi-image uploader.
 * value: Array<{ url, thumbUrl, alt }>
 * onChange: (images) => void
 */
export default function ImageUploader({ value = [], onChange, maxImages = 6 }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFiles(files) {
    const fileArr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!fileArr.length) return;
    if (value.length + fileArr.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed.`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const results = [];
      for (let i = 0; i < fileArr.length; i++) {
        const result = await uploadApi.upload(fileArr[i], (p) => {
          setProgress(Math.round(((i + p / 100) / fileArr.length) * 100));
        });
        results.push({ url: result.url, thumbUrl: result.thumbUrl, alt: '' });
      }
      onChange([...value, ...results]);
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
    handleFiles(e.dataTransfer.files);
  }

  function removeImage(index) {
    const img = value[index];
    // Fire-and-forget delete from server
    uploadApi.delete(img.url).catch(() => {});
    onChange(value.filter((_, i) => i !== index));
  }

  function setCover(index) {
    const reordered = [...value];
    const [cover] = reordered.splice(index, 1);
    onChange([cover, ...reordered]);
  }

  return (
    <div>
      <div
        className={`image-uploader-zone${isDragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload images"
      >
        <Upload size={28} className="upload-icon" />
        <p className="upload-label">
          <strong>Click to upload</strong> or drag and drop
        </p>
        <p className="upload-hint">JPEG, PNG, WebP, AVIF · max 8 MB each</p>
      </div>

      {uploading && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Uploading... {progress}%
          </div>
          <div className="upload-progress">
            <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
        aria-hidden="true"
      />

      {value.length > 0 && (
        <div className="image-preview-grid" role="list">
          {value.map((img, i) => (
            <div
              key={img.url}
              className={`image-preview-item${i === 0 ? ' cover-image' : ''}`}
              role="listitem"
            >
              <img src={img.thumbUrl || img.url} alt={img.alt || `Image ${i + 1}`} />
              {i === 0 && <span className="cover-badge">Cover</span>}
              <div className="image-preview-actions">
                {i !== 0 && (
                  <button
                    type="button"
                    className="image-preview-btn cover"
                    onClick={() => setCover(i)}
                    title="Set as cover"
                    aria-label="Set as cover image"
                  >
                    <Star size={12} />
                  </button>
                )}
                <button
                  type="button"
                  className="image-preview-btn remove"
                  onClick={() => removeImage(i)}
                  title="Remove image"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
