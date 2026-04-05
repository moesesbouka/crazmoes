import { getStoredImageUrl } from "@/lib/storedImages";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dluabbbrdhvspbjmckuf.supabase.co";

/**
 * Returns the best available URL for a product image.
 * 1. Checks if we have a permanently stored copy
 * 2. Falls back to the original URL (which may be an expired Facebook CDN link)
 */
export function proxyImageUrl(url: string, facebookId?: string, imageIndex?: number): string {
  if (!url) return "/placeholder.svg";

  // Check for stored image first
  if (facebookId) {
    const stored = getStoredImageUrl(facebookId, imageIndex ?? 0);
    if (stored) return stored;
  }

  // Return original URL as fallback
  return url;
}
