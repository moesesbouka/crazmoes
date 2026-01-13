import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LaunchRequest {
  listing_ids: string[];
}

interface MarketplaceListing {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  images: string[];
  category: string | null;
  condition: string | null;
  shopify_product_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Shopify credentials from environment
    const shopifyDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN");
    const shopifyToken = Deno.env.get("SHOPIFY_ADMIN_ACCESS_TOKEN");

    if (!shopifyDomain || !shopifyToken) {
      console.error("Missing Shopify credentials");
      return new Response(
        JSON.stringify({ 
          error: "Shopify not configured",
          message: "Shopify credentials are not set up. Please configure Shopify integration."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { listing_ids }: LaunchRequest = await req.json();

    if (!listing_ids || !Array.isArray(listing_ids) || listing_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "No listing IDs provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Launch to Shopify: Processing ${listing_ids.length} listings`);

    // Fetch listings from database
    const { data: listings, error: fetchError } = await supabase
      .from("marketplace_listings")
      .select("id, title, description, price, images, category, condition, shopify_product_id")
      .in("id", listing_ids);

    if (fetchError) {
      console.error("Error fetching listings:", fetchError);
      throw fetchError;
    }

    if (!listings || listings.length === 0) {
      return new Response(
        JSON.stringify({ error: "No listings found with provided IDs" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { id: string; success: boolean; shopify_product_id?: string; error?: string }[] = [];

    // Process each listing
    for (const listing of listings as MarketplaceListing[]) {
      try {
        // Skip if already launched
        if (listing.shopify_product_id) {
          console.log(`Listing ${listing.id} already launched as Shopify product ${listing.shopify_product_id}`);
          results.push({
            id: listing.id,
            success: true,
            shopify_product_id: listing.shopify_product_id,
          });
          continue;
        }

        console.log(`Creating Shopify product for: ${listing.title}`);

        // Prepare product data for Shopify
        const productData = {
          product: {
            title: listing.title,
            body_html: listing.description || "",
            vendor: "Crazy Moe's",
            product_type: listing.category || "General",
            status: "active",
            published: true,
            variants: [
              {
                price: listing.price?.toString() || "0.00",
                inventory_management: null,
                inventory_policy: "deny",
                requires_shipping: true,
              },
            ],
            images: listing.images?.slice(0, 10).map((url) => ({ src: url })) || [],
            tags: [
              listing.condition || "",
              listing.category || "",
              "Facebook Marketplace Import",
            ].filter(Boolean).join(", "),
          },
        };

        // Create product in Shopify
        const shopifyResponse = await fetch(
          `https://${shopifyDomain}/admin/api/2024-01/products.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": shopifyToken,
            },
            body: JSON.stringify(productData),
          }
        );

        if (!shopifyResponse.ok) {
          const errorText = await shopifyResponse.text();
          console.error(`Shopify API error for ${listing.id}:`, errorText);
          results.push({
            id: listing.id,
            success: false,
            error: `Shopify API error: ${shopifyResponse.status}`,
          });
          continue;
        }

        const shopifyProduct = await shopifyResponse.json();
        const shopifyProductId = shopifyProduct.product.id.toString();

        console.log(`Created Shopify product ${shopifyProductId} for listing ${listing.id}`);

        // Update listing in database with Shopify product ID
        const { error: updateError } = await supabase
          .from("marketplace_listings")
          .update({
            shopify_product_id: shopifyProductId,
            launched_at: new Date().toISOString(),
          })
          .eq("id", listing.id);

        if (updateError) {
          console.error(`Error updating listing ${listing.id}:`, updateError);
        }

        results.push({
          id: listing.id,
          success: true,
          shopify_product_id: shopifyProductId,
        });
      } catch (listingError: any) {
        console.error(`Error processing listing ${listing.id}:`, listingError);
        results.push({
          id: listing.id,
          success: false,
          error: listingError.message || "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`Launch complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Launched ${successCount} of ${results.length} products`,
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Launch to Shopify error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
