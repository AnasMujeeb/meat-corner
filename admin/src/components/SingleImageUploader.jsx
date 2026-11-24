import { useRef, useState } from 'react';
import { Upload, X, Crop } from 'lucide-react';
import { uploadApi } from '../api/endpoints.js';
import { compressImage } from '../utils/imageCompressor.js';
import ImageCropperModal from './ImageCropperModal.jsx';
import toast from 'react-hot-toast';

/**
 * Single-image uploader that stores a URL or { url, thumbUrl } object,
 * with optional crop/adjust support using ImageCropperModal.
 *
 * @param {string|{ url: string, thumbUrl?: string }} value - Current image URL or object
 * @param {(value: string|{ url: string, thumbUrl: string }) => void} onChange
 * @param {string} [label='Image']
 * @param {number} [aspect=1] - Crop aspect ratio (default 1:1 for options library tiles/cards)
 * @param {boolean} [enableCrop=true]
 */
export default function SingleImageUploader({
  value = '',
  onChange,
  label = 'Image',
  aspect = 1,
  enableCrop = true,
}) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Cropper state
  const [cropperState, setCropperState] = useState({
    isOpen: false,
    source: null,
    fileName: 'photo.jpg',
  });

  const currentUrl = typeof value === 'object' && value !== null ? (value.url || '') : (value || '');

  async function uploadFileDirectly(file) {
    setUploading(true);
    setProgress(0);
    try {
      const compressed = await compressImage(file);
      const result = await uploadApi.upload(compressed, (p) => setProgress(p));
      const newUrl = result.url || '';
      const newThumbUrl = result.thumbUrl || newUrl;

      if (typeof value === 'object' && value !== null) {
        onChange({ url: newUrl, thumbUrl: newThumbUrl });
      } else {
        onChange(newUrl);
      }
      toast.success('Photo uploaded successfully');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleFileSelection(file) {
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

    if (enableCrop) {
      setCropperState({
        isOpen: true,
        source: file,
        fileName: file.name || 'photo.jpg',
      });
    } else {
      uploadFileDirectly(file);
    }
  }

  async function handleAdjustExisting() {
    if (!currentUrl) return;
    try {
      const res = await fetch(currentUrl);
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      setCropperState({
        isOpen: true,
        source: blob,
        fileName: 'adjusted-photo.jpg',
      });
    } catch (err) {
      toast.error('Please choose the photo again to adjust it');
      inputRef.current?.click();
    }
  }

  function handleCroppedResult(croppedFile) {
    setCropperState({ isOpen: false, source: null, fileName: '' });
    uploadFileDirectly(croppedFile);
  }

  function handleUseOriginal() {
    const { source } = cropperState;
    setCropperState({ isOpen: false, source: null, fileName: '' });
    if (source instanceof File || source instanceof Blob) {
      uploadFileDirectly(source);
    }
  }

  function handleCloseCropper() {
    setCropperState({ isOpen: false, source: null, fileName: '' });
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelection(file);
  }

  function remove() {
    if (currentUrl) uploadApi.delete(currentUrl).catch(() => {});
    if (typeof value === 'object' && value !== null) {
      onChange({ url: '', thumbUrl: '' });
    } else {
      onChange('');
    }
  }

  return (
    <div>
      <p className="label">{label}</p>
      {currentUrl ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={currentUrl}
              alt="Preview"
              style={{
                width: 120,
                height: 120,
                objectFit: 'cover',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                display: 'block',
              }}
            />
            <button
              type="button"
              onClick={remove}
              aria-label="Remove image"
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Remove photo"
            >
              <X size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAdjustExisting}
              disabled={uploading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <Crop size={13} /> Adjust Photo
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ fontSize: 12, color: 'var(--text-secondary)' }}
            >
              Change Photo
            </button>
          </div>
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
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelection(f);
          e.target.value = '';
        }}
        aria-hidden="true"
      />

      {enableCrop && (
        <ImageCropperModal
          isOpen={cropperState.isOpen}
          imageSource={cropperState.source}
          fileName={cropperState.fileName}
          aspect={aspect}
          onClose={handleCloseCropper}
          onConfirmCrop={handleCroppedResult}
          onConfirmOriginal={handleUseOriginal}
        />
      )}
    </div>
  );
}
