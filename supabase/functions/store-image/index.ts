import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { facebook_id, images } = await req.json();
    // images is an array of { index, base64, contentType }

    if (!facebook_id || !images?.length) {
      return new Response(JSON.stringify({ error: "Missing facebook_id or images" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results = [];

    for (const img of images) {
      const { index, base64, contentType, originalUrl } = img;
      const ext = contentType?.includes("png") ? "png" : contentType?.includes("webp") ? "webp" : "jpg";
      const path = `${facebook_id}/${index}.${ext}`;

      // Decode base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, bytes, {
          contentType: contentType || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload failed for ${path}:`, uploadError.message);
        results.push({ index, error: uploadError.message });
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      const storedUrl = urlData.publicUrl;

      // Record in stored_images table
      await supabase.from("stored_images").upsert({
        facebook_id,
        original_url: originalUrl || "",
        stored_url: storedUrl,
        image_index: index,
      }, { onConflict: "facebook_id,image_index" });

      results.push({ index, storedUrl });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("store-image error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
