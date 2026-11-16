import { useRef, useState } from 'react';
import { Upload, X, Star, Crop } from 'lucide-react';
import { uploadApi } from '../api/endpoints.js';
import { compressImage } from '../utils/imageCompressor.js';
import ImageCropperModal from './ImageCropperModal.jsx';
import toast from 'react-hot-toast';

/**
 * Multi-image uploader with crop/adjust support.
 * value: Array<{ url, thumbUrl, alt }>
 * onChange: (images) => void
 */
export default function ImageUploader({ value = [], onChange, maxImages = 6 }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Cropper state
  // cropperState: { isOpen: boolean, source: File|Blob|string|null, fileName: string, queue: File[], targetIndex?: number }
  const [cropperState, setCropperState] = useState({
    isOpen: false,
    source: null,
    fileName: 'photo.jpg',
    queue: [],
    targetIndex: null,
  });

  async function uploadSingleFile(file, onProgress) {
    const compressed = await compressImage(file);
    return await uploadApi.upload(compressed, onProgress);
  }

  function handleFiles(files) {
    const rawFiles = Array.from(files);
    const hasHeic = rawFiles.some((f) => {
      const ext = f.name ? f.name.slice(f.name.lastIndexOf('.')).toLowerCase() : '';
      return ext === '.heic' || ext === '.heif' || f.type.includes('heic') || f.type.includes('heif');
    });
    if (hasHeic) {
      toast.error('JPG ya PNG use karein (HEIC admin upload mein supported nahi hai).');
      return;
    }
    const fileArr = rawFiles.filter((f) => f.type.startsWith('image/'));
    if (!fileArr.length) return;
    if (value.length + fileArr.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed.`);
      return;
    }

    // Open cropper for the first file, queue the remaining
    const [first, ...rest] = fileArr;
    setCropperState({
      isOpen: true,
      source: first,
      fileName: first.name || 'photo.jpg',
      queue: rest,
      targetIndex: null,
    });
  }

  async function handleCroppedResult(fileToUpload) {
    const { queue, targetIndex } = cropperState;

    if (targetIndex !== null && targetIndex !== undefined) {
      // Adjusting an existing image at targetIndex
      setCropperState({ isOpen: false, source: null, fileName: '', queue: [], targetIndex: null });
      setUploading(true);
      setProgress(0);
      try {
        const result = await uploadSingleFile(fileToUpload, setProgress);
        const oldImg = value[targetIndex];
        if (oldImg?.url) {
          uploadApi.delete(oldImg.url).catch(() => {});
        }
        const updated = [...value];
        updated[targetIndex] = {
          url: result.url,
          thumbUrl: result.thumbUrl,
          alt: oldImg?.alt || '',
        };
        onChange(updated);
        toast.success('Photo updated successfully');
      } catch (err) {
        toast.error(err.message || 'Upload failed');
      } finally {
        setUploading(false);
        setProgress(0);
      }
      return;
    }

    // New file upload
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadSingleFile(fileToUpload, setProgress);
      const newEntry = { url: result.url, thumbUrl: result.thumbUrl, alt: '' };
      onChange([...value, newEntry]);

      // If more files queued, open next in cropper
      if (queue && queue.length > 0) {
        const [next, ...remaining] = queue;
        setCropperState({
          isOpen: true,
          source: next,
          fileName: next.name || 'photo.jpg',
          queue: remaining,
          targetIndex: null,
        });
      } else {
        setCropperState({ isOpen: false, source: null, fileName: '', queue: [], targetIndex: null });
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed');
      setCropperState({ isOpen: false, source: null, fileName: '', queue: [], targetIndex: null });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleUseOriginal() {
    const { source } = cropperState;
    if (source instanceof File || source instanceof Blob) {
      handleCroppedResult(source);
    } else {
      setCropperState({ isOpen: false, source: null, fileName: '', queue: [], targetIndex: null });
    }
  }

  function handleCloseCropper() {
    setCropperState({ isOpen: false, source: null, fileName: '', queue: [], targetIndex: null });
  }

  async function handleAdjustExisting(index) {
    const item = value[index];
    if (!item?.url) return;

    try {
      // Fetch existing image as blob
      const res = await fetch(item.url);
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      setCropperState({
        isOpen: true,
        source: blob,
        fileName: 'adjusted-photo.jpg',
        queue: [],
        targetIndex: index,
      });
    } catch (err) {
      // CORS or network error: prompt user to pick file again
      toast.error('Please choose the photo again to adjust it');
      inputRef.current?.click();
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
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files);
          // reset input so the same file can be selected again
          e.target.value = '';
        }}
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
                <button
                  type="button"
                  className="image-preview-btn adjust"
                  onClick={() => handleAdjustExisting(i)}
                  title="Adjust photo"
                  aria-label="Adjust photo"
                >
                  <Crop size={12} />
                </button>
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

      <ImageCropperModal
        isOpen={cropperState.isOpen}
        imageSource={cropperState.source}
        fileName={cropperState.fileName}
        aspect={4 / 3}
        onClose={handleCloseCropper}
        onConfirmCrop={handleCroppedResult}
        onConfirmOriginal={handleUseOriginal}
      />
    </div>
  );
}
