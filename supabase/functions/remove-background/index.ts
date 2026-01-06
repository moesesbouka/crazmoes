import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not set')
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    })

    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required field: imageUrl" }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log("Removing background from image:", imageUrl)

    // Use Replicate's background removal model
    const output = await replicate.run(
      "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      {
        input: {
          image: imageUrl,
        },
      },
    )

    const processedImageUrl = Array.isArray(output)
      ? String(output[0] ?? "")
      : String(output ?? "")

    if (!processedImageUrl) {
      throw new Error("Background removal produced empty output")
    }

    console.log("Background removal complete")

    return new Response(
      JSON.stringify({ processedImageUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    )
  } catch (error) {
    // IMPORTANT: do not log the full error object here.
    // Some SDK errors include request/response objects with sensitive headers.
    const errorMessage = error instanceof Error ? error.message : String(error)

    const statusFromResponse = (error as any)?.response?.status
    const statusMatch = errorMessage.match(/\b(402|429)\b/)
    const statusFromMessage = statusMatch ? Number(statusMatch[1]) : null
    const status = (typeof statusFromResponse === "number" ? statusFromResponse : statusFromMessage) ?? 500

    const retryAfterFromResponseRaw = (error as any)?.response?.headers?.get?.("ratelimit-reset")
    const retryAfterFromResponse = retryAfterFromResponseRaw ? Number(retryAfterFromResponseRaw) : null
    const retryAfterMatch = errorMessage.match(/"retry_after"\s*:\s*(\d+)/)
    const retryAfterFromMessage = retryAfterMatch ? Number(retryAfterMatch[1]) : null
    const retryAfter = retryAfterFromResponse ?? retryAfterFromMessage

    console.warn("remove-background skipped", { status, retryAfter })

    // Always return 200 so the frontend can safely fall back to the original image.
    return new Response(
      JSON.stringify({
        processedImageUrl: null,
        skipped: true,
        status,
        retry_after: retryAfter,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    )
  }
})

