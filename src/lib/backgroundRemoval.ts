import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js to always download models
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 1024;

let segmenterPromise: Promise<any> | null = null;

// Lazy load the segmenter - only initialize once
function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = pipeline(
      'image-segmentation',
      'Xenova/segformer-b0-finetuned-ade-512-512',
      { device: 'webgpu' }
    ).catch((err) => {
      // Fallback to CPU if WebGPU fails
      console.warn('WebGPU not available, falling back to CPU:', err);
      return pipeline(
        'image-segmentation',
        'Xenova/segformer-b0-finetuned-ade-512-512'
      );
    });
  }
  return segmenterPromise;
}

function resizeImageIfNeeded(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement
): boolean {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);
  return false;
}

export async function removeBackground(imageUrl: string): Promise<string> {
  try {
    // Load the image
    const image = await loadImage(imageUrl);
    
    // Get the segmenter
    const segmenter = await getSegmenter();

    // Create canvas and resize if needed
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    resizeImageIfNeeded(canvas, ctx, image);

    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Process the image with the segmentation model
    const result = await segmenter(imageData);

    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
      throw new Error('Invalid segmentation result');
    }

    // Create output canvas with white background
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) throw new Error('Could not get output canvas context');

    // Fill with white background
    outputCtx.fillStyle = '#FFFFFF';
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    // Draw original image
    outputCtx.drawImage(canvas, 0, 0);

    // Apply the mask
    const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = outputImageData.data;

    // Apply inverted mask to alpha channel, then composite with white
    for (let i = 0; i < result[0].mask.data.length; i++) {
      const alpha = 1 - result[0].mask.data[i]; // Invert to keep subject
      const idx = i * 4;
      
      // Blend with white background based on alpha
      data[idx] = Math.round(data[idx] * alpha + 255 * (1 - alpha));     // R
      data[idx + 1] = Math.round(data[idx + 1] * alpha + 255 * (1 - alpha)); // G
      data[idx + 2] = Math.round(data[idx + 2] * alpha + 255 * (1 - alpha)); // B
      data[idx + 3] = 255; // Full opacity (white background)
    }

    outputCtx.putImageData(outputImageData, 0, 0);

    // Return as data URL
    return outputCanvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}
