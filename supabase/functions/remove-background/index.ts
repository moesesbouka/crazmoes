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
    console.error("Error in remove-background function:", error)

    const errorMessage = error instanceof Error ? error.message : String(error)

    // Replicate errors often include JSON with status/retry_after.
    const statusMatch = errorMessage.match(/status\s+(\d{3})|"status"\s*:\s*(\d{3})/)
    const status = statusMatch ? Number(statusMatch[1] ?? statusMatch[2]) : null

    const retryAfterMatch = errorMessage.match(/"retry_after"\s*:\s*(\d+)/)
    const retryAfter = retryAfterMatch ? Number(retryAfterMatch[1]) : null

    // Treat billing/rate-limit as a graceful "no-op" so the UI doesn't crash.
    if (status === 402 || status === 429) {
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

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    )
  }
})
