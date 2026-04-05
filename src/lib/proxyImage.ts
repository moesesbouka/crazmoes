const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dluabbbrdhvspbjmckuf.supabase.co";

/**
 * Wraps a Facebook CDN image URL through our edge-function proxy
 * so it can be loaded in the browser without 403 errors.
 * Non-fbcdn URLs are returned as-is.
 */
export function proxyImageUrl(url: string): string {
  if (!url) return "/placeholder.svg";
  // Only proxy fbcdn / Facebook image URLs
  if (
    url.includes("fbcdn.net") ||
    url.includes("facebook.com") ||
    url.includes("fbsbx.com") ||
    url.includes("cdninstagram.com")
  ) {
    return `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
