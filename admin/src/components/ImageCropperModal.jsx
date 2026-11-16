import { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { ZoomIn, ZoomOut } from 'lucide-react';

/**
 * Creates an image element safely.
 */
function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    // Set crossOrigin if remote, but for blob/object URLs it's safe without or with anonymous
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      image.crossOrigin = 'anonymous';
    }
    image.src = url;
  });
}

/**
 * Downscale large source files (> 2000px on long side or large byte size)
 * into a smaller object URL for fluid, memory-safe cropping in the browser.
 */
async function getDownscaledSourceUrl(fileOrBlob) {
  const objectUrl = URL.createObjectURL(fileOrBlob);
  try {
    const img = await createImage(objectUrl);
    const maxDim = 2000;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // If small enough, just return the direct objectUrl
    if (w <= maxDim && h <= maxDim) {
      return { url: objectUrl, isDownscaled: false, revoke: () => URL.revokeObjectURL(objectUrl) };
    }

    const scale = Math.min(maxDim / w, maxDim / h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    URL.revokeObjectURL(objectUrl);

    const downscaledBlob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
    const downscaledUrl = URL.createObjectURL(downscaledBlob);
    return {
      url: downscaledUrl,
      isDownscaled: true,
      revoke: () => URL.revokeObjectURL(downscaledUrl),
    };
  } catch (err) {
    // Fallback to original objectUrl if canvas fails
    return { url: objectUrl, isDownscaled: false, revoke: () => URL.revokeObjectURL(objectUrl) };
  }
}

/**
 * Renders the cropped portion of the image to a canvas and outputs a File.
 * Locked to max 1600px on the long side, JPEG quality 0.90.
 */
async function getCroppedFile(imageSrc, pixelCrop, fileName = 'image.jpg') {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Calculate target canvas size, clamped to max 1600px on the longest side
  const maxDim = 1600;
  let targetWidth = Math.round(pixelCrop.width);
  let targetHeight = Math.round(pixelCrop.height);

  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
    }
  }

  canvas.width = Math.max(1, targetWidth);
  canvas.height = Math.max(1, targetHeight);

  // Draw cropped image region to the output canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty or failed to generate blob'));
          return;
        }
        const baseName = fileName.replace(/\.[^.]+$/, '') || 'photo';
        const file = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      0.9
    );
  });
}

/**
 * ImageCropperModal
 *
 * @param {boolean} isOpen
 * @param {File|Blob|string|null} imageSource - File/Blob or URL of photo to crop
 * @param {string} [fileName] - Default filename for the output
 * @param {number} [aspect=4/3] - Aspect ratio locked (4/3 for FoodCard)
 * @param {() => void} onClose - Cancel handler
 * @param {(croppedFile: File) => void} onConfirmCrop - Called with cropped File
 * @param {() => void} onConfirmOriginal - Called if user chooses "Use original (no crop)"
 */
export default function ImageCropperModal({
  isOpen,
  imageSource,
  fileName = 'photo.jpg',
  aspect = 4 / 3,
  onClose,
  onConfirmCrop,
  onConfirmOriginal,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [activeUrl, setActiveUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const revokeRef = useRef(null);

  // Prepare source URL safely with downscaling for large phone photos
  useEffect(() => {
    if (!isOpen || !imageSource) {
      if (revokeRef.current) {
        revokeRef.current();
        revokeRef.current = null;
      }
      setActiveUrl('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setLoadError(null);
      return;
    }

    let isMounted = true;

    async function loadSrc() {
      try {
        setLoadError(null);
        if (typeof imageSource === 'string') {
          // Direct URL string
          setActiveUrl(imageSource);
        } else {
          // File or Blob
          const res = await getDownscaledSourceUrl(imageSource);
          if (!isMounted) {
            res.revoke();
            return;
          }
          revokeRef.current = res.revoke;
          setActiveUrl(res.url);
        }
      } catch (err) {
        if (isMounted) {
          setLoadError('Failed to prepare image for cropping.');
        }
      }
    }

    loadSrc();

    return () => {
      isMounted = false;
      if (revokeRef.current) {
        revokeRef.current();
        revokeRef.current = null;
      }
    };
  }, [isOpen, imageSource]);

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  async function handleUsePhoto() {
    if (!activeUrl || !croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedFile = await getCroppedFile(activeUrl, croppedAreaPixels, fileName);
      onConfirmCrop(croppedFile);
    } catch (err) {
      setLoadError(err.message || 'Failed to crop image.');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleUseOriginal() {
    if (onConfirmOriginal) {
      onConfirmOriginal();
    } else {
      onClose();
    }
  }

  const footer = (
    <div className="cropper-modal-footer">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isProcessing}
      >
        Cancel
      </Button>
      <div className="cropper-modal-footer-actions">
        {onConfirmOriginal && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleUseOriginal}
            disabled={isProcessing}
            title="Upload without cropping"
          >
            Use original (no crop)
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          onClick={handleUsePhoto}
          loading={isProcessing}
          disabled={!croppedAreaPixels || isProcessing}
        >
          Use photo
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : onClose}
      title="Adjust Photo"
      size="lg"
      footer={footer}
    >
      <div className="cropper-modal-container">
        <p className="cropper-hint">
          Drag to reposition and use the slider to zoom. The box matches the website&apos;s 4:3 card ratio.
        </p>

        {loadError && (
          <div className="cropper-error-banner" role="alert">
            {loadError}
          </div>
        )}

        <div className="cropper-area-wrap">
          {activeUrl && !loadError && (
            <Cropper
              image={activeUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              classes={{
                containerClassName: 'cropper-container',
                mediaClassName: 'cropper-media',
              }}
            />
          )}
        </div>

        <div className="cropper-controls">
          <button
            type="button"
            className="cropper-zoom-btn"
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
            disabled={zoom <= 1 || isProcessing}
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            aria-label="Zoom"
            className="cropper-zoom-slider"
            disabled={isProcessing}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <button
            type="button"
            className="cropper-zoom-btn"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
            disabled={zoom >= 3 || isProcessing}
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
