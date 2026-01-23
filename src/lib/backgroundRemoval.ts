import { supabase } from "@/integrations/supabase/client";

let disabledUntil = 0;

export async function removeBackground(imageUrl: string): Promise<string> {
  // If we're currently rate-limited / out of credit, don't keep spamming the backend.
  if (Date.now() < disabledUntil) return imageUrl;

  try {
    const { data, error } = await supabase.functions.invoke('remove-background', {
      body: { imageUrl },
    });

    // If the function failed, fall back to the original image (no hard crash).
    if (error) {
      console.warn('Background removal unavailable, falling back:', error.message);
      return imageUrl;
    }

    // Graceful no-op response for billing/rate-limit scenarios.
    if (data?.skipped) {
      const status = Number(data.status ?? 0);
      const retryAfter = Number(data.retry_after ?? 0);

      if (status === 429 && retryAfter > 0) {
        disabledUntil = Date.now() + retryAfter * 1000;
      } else if (status === 402) {
        // Stop retrying for a while; user can add credits/payment method and refresh.
        disabledUntil = Date.now() + 15 * 60 * 1000;
      }

      return imageUrl;
    }

    if (!data?.processedImageUrl) return imageUrl;

    return String(data.processedImageUrl);
  } catch (e) {
    console.warn('Background removal failed, falling back:', e);
    return imageUrl;
  }
}

