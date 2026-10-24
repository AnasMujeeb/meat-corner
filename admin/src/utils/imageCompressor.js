/**
 * Resize and compress an image in the browser before upload.
 *
 * Constrains width to ~1600px and ensures file size is strictly under 1.5 MB.
 * Throws a clear error if the image cannot be compressed below 1.5 MB.
 *
 * @param {File} file
 * @param {object} [options]
 * @param {number} [options.maxWidth=1600]
 * @param {number} [options.maxSizeBytes=1572864] // 1.5 MB
 * @returns {Promise<File>}
 */
export async function compressImage(
  file,
  { maxWidth = 1600, maxSizeBytes = 1.5 * 1024 * 1024 } = {}
) {
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  // SVG images shouldn't be rasterized on canvas
  if (file.type === 'image/svg+xml') {
    if (file.size > maxSizeBytes) {
      throw new Error(
        `SVG image "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 1.5 MB limit.`
      );
    }
    return file;
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Resize down to maxWidth preserving aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        ctx.drawImage(img, 0, 0, width, height);

        const getBlob = (type, quality) =>
          new Promise((res) => canvas.toBlob(res, type, quality));

        // Prefer WebP, fallback to JPEG
        let mimeType = 'image/webp';
        let quality = 0.85;
        let blob = await getBlob(mimeType, quality);

        if (!blob || blob.type !== 'image/webp') {
          mimeType = 'image/jpeg';
          blob = await getBlob(mimeType, quality);
        }

        // Iterative compression if size exceeds 1.5 MB
        const qualities = [0.75, 0.65, 0.5];
        for (const q of qualities) {
          if (!blob || blob.size <= maxSizeBytes) break;
          blob = await getBlob(mimeType, q);
        }

        // Additional dimension downscaling if still over 1.5 MB
        if (blob && blob.size > maxSizeBytes) {
          const scaleCanvas = document.createElement('canvas');
          scaleCanvas.width = Math.round(width * 0.75);
          scaleCanvas.height = Math.round(height * 0.75);
          const sCtx = scaleCanvas.getContext('2d');
          if (sCtx) {
            sCtx.drawImage(canvas, 0, 0, scaleCanvas.width, scaleCanvas.height);
            blob = await new Promise((res) => scaleCanvas.toBlob(res, mimeType, 0.6));
          }
        }

        if (!blob || blob.size > maxSizeBytes) {
          const actualMb = ((blob?.size || file.size) / (1024 * 1024)).toFixed(2);
          throw new Error(
            `Image "${file.name}" is too large (${actualMb} MB) and exceeds 1.5 MB even after compression. Please choose a smaller image.`
          );
        }

        const extension = mimeType === 'image/webp' ? '.webp' : '.jpg';
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const newFileName = `${baseName}${extension}`;

        const compressedFile = new File([blob], newFileName, {
          type: mimeType,
          lastModified: Date.now(),
        });

        resolve(compressedFile);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image "${file.name}". The file may be corrupt.`));
    };

    img.src = objectUrl;
  });
}
