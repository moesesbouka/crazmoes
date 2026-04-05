import { supabase } from "@/integrations/supabase/client";

// In-memory cache of stored image URLs
const storedImageCache = new Map<string, Map<number, string>>();
let cacheLoaded = false;

/**
 * Load all stored image mappings into memory.
 * Called once on app init.
 */
export async function loadStoredImages(): Promise<void> {
  if (cacheLoaded) return;
  
  try {
    const { data, error } = await supabase
      .from("stored_images")
      .select("facebook_id, stored_url, image_index");

    if (error || !data) {
      console.error("Failed to load stored images:", error?.message);
      return;
    }

    for (const row of data) {
      if (!storedImageCache.has(row.facebook_id)) {
        storedImageCache.set(row.facebook_id, new Map());
      }
      storedImageCache.get(row.facebook_id)!.set(row.image_index, row.stored_url);
    }

    cacheLoaded = true;
    console.log(`[StoredImages] Loaded ${data.length} stored image mappings`);
  } catch (err) {
    console.error("Failed to load stored images:", err);
  }
}

/**
 * Get a stored image URL for a given facebook_id and image index.
 * Returns null if no stored image exists.
 */
export function getStoredImageUrl(facebookId: string, imageIndex: number = 0): string | null {
  const productImages = storedImageCache.get(facebookId);
  if (!productImages) return null;
  return productImages.get(imageIndex) || null;
}

/**
 * Check if we have any stored images at all.
 */
export function hasStoredImages(): boolean {
  return storedImageCache.size > 0;
}

/**
 * Upload images for a listing from the browser (client-side).
 * The browser can access Facebook CDN, so we fetch → convert to base64 → send to edge function.
 */
export async function migrateListingImages(
  facebookId: string,
  imageUrls: string[],
  onProgress?: (done: number, total: number) => void
): Promise<{ success: boolean; storedUrls: string[] }> {
  const images: { index: number; base64: string; contentType: string; originalUrl: string }[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      // Fetch image in the browser (browser has Facebook cookies/access)
      const response = await fetch(url, { mode: "no-cors" });
      
      // no-cors gives opaque response, we need to use a canvas approach instead
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      const loaded = await new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });

      if (!loaded) {
        console.warn(`Failed to load image ${i} for ${facebookId}`);
        continue;
      }

      // Draw to canvas and extract as base64
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const base64 = dataUrl.split(",")[1];

      images.push({
        index: i,
        base64,
        contentType: "image/jpeg",
        originalUrl: url,
      });

      onProgress?.(i + 1, imageUrls.length);
    } catch (err) {
      console.warn(`Failed to process image ${i} for ${facebookId}:`, err);
    }
  }

  if (images.length === 0) {
    return { success: false, storedUrls: [] };
  }

  // Send to edge function
  const { data, error } = await supabase.functions.invoke("store-image", {
    body: { facebook_id: facebookId, images },
  });

  if (error) {
    console.error("store-image error:", error);
    return { success: false, storedUrls: [] };
  }

  // Update local cache
  const storedUrls: string[] = [];
  for (const result of data.results || []) {
    if (result.storedUrl) {
      if (!storedImageCache.has(facebookId)) {
        storedImageCache.set(facebookId, new Map());
      }
      storedImageCache.get(facebookId)!.set(result.index, result.storedUrl);
      storedUrls.push(result.storedUrl);
    }
  }

  return { success: true, storedUrls };
}
