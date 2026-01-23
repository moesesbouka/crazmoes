import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_DOMAIN = "rsg4h0-q3.myshopify.com";
const API_VERSION = "2024-01";

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  handle: string;
  status: string;
  tags: string;
  images: Array<{
    id: number;
    src: string;
    alt: string | null;
    position: number;
    width: number;
    height: number;
  }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    compare_at_price: string | null;
    sku: string;
    inventory_quantity: number;
    weight: number;
    weight_unit: string;
  }>;
  options: Array<{
    id: number;
    name: string;
    values: string[];
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for format preference
    let format = 'csv'; // default to CSV
    try {
      const body = await req.json();
      if (body?.format === 'json') format = 'json';
    } catch {
      // No body or invalid JSON, use default
    }

    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    if (!shopifyToken) {
      console.error("Missing SHOPIFY_ACCESS_TOKEN");
      return new Response(
        JSON.stringify({ error: "Shopify not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting Shopify inventory export (format: ${format})...`);
    
    const allProducts: ShopifyProduct[] = [];
    let pageInfo: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;
    
    // Fetch all products with pagination
    while (hasNextPage) {
      pageCount++;
      let url = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/products.json?limit=250`;
      
      if (pageInfo) {
        url += `&page_info=${pageInfo}`;
      }
      
      console.log(`Fetching page ${pageCount}...`);
      
      const response = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": shopifyToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Shopify API error: ${response.status}`, errorText);
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      allProducts.push(...data.products);
      
      // Check for pagination via Link header
      const linkHeader = response.headers.get("Link");
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
        if (nextMatch) {
          pageInfo = nextMatch[1];
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
    }

    console.log(`Export complete: ${allProducts.length} products fetched across ${pageCount} pages`);

    // Return JSON format if requested
    if (format === 'json') {
      const exportData = {
        exportInfo: {
          exportedAt: new Date().toISOString(),
          shopDomain: SHOPIFY_DOMAIN,
          totalProducts: allProducts.length,
          totalImages: allProducts.reduce((sum, p) => sum + p.images.length, 0),
          totalVariants: allProducts.reduce((sum, p) => sum + p.variants.length, 0),
        },
        products: allProducts.map(product => ({
          id: product.id,
          handle: product.handle,
          title: product.title,
          description: product.body_html,
          vendor: product.vendor,
          productType: product.product_type,
          tags: product.tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
          status: product.status,
          createdAt: product.created_at,
          updatedAt: product.updated_at,
          publishedAt: product.published_at,
          price: product.variants[0]?.price || '0.00',
          compareAtPrice: product.variants[0]?.compare_at_price || null,
          images: product.images.map(img => ({
            id: img.id,
            url: img.src,
            alt: img.alt,
            position: img.position,
            width: img.width,
            height: img.height,
          })),
          variants: product.variants.map(v => ({
            id: v.id,
            title: v.title,
            price: v.price,
            compareAtPrice: v.compare_at_price,
            sku: v.sku,
            inventoryQuantity: v.inventory_quantity,
            weight: v.weight,
            weightUnit: v.weight_unit,
          })),
          options: product.options.map(opt => ({
            id: opt.id,
            name: opt.name,
            values: opt.values,
          })),
          shopifyAdminUrl: `https://${SHOPIFY_DOMAIN}/admin/products/${product.id}`,
          storefrontUrl: product.published_at ? `https://${SHOPIFY_DOMAIN}/products/${product.handle}` : null,
        })),
      };

      return new Response(
        JSON.stringify(exportData, null, 2),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="shopify-inventory-${new Date().toISOString().split('T')[0]}.json"`,
          } 
        }
      );
    }

    // Build CSV rows
    const csvHeaders = [
      "Product ID",
      "Handle",
      "Title",
      "Description",
      "Vendor",
      "Product Type",
      "Tags",
      "Status",
      "Price",
      "Compare At Price",
      "SKU",
      "Inventory Quantity",
      "Weight",
      "Weight Unit",
      "Image 1 URL",
      "Image 2 URL",
      "Image 3 URL",
      "Image 4 URL",
      "Image 5 URL",
      "Created At",
      "Updated At",
      "Published At",
      "Shopify Admin URL",
      "Storefront URL"
    ];

    const escapeCSV = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = allProducts.map(product => {
      const firstVariant = product.variants[0];
      const images = product.images || [];
      const plainDescription = product.body_html?.replace(/<[^>]*>/g, '').trim() || '';
      
      return [
        product.id,
        product.handle,
        product.title,
        plainDescription,
        product.vendor,
        product.product_type,
        product.tags,
        product.status,
        firstVariant?.price || "0.00",
        firstVariant?.compare_at_price || "",
        firstVariant?.sku || "",
        firstVariant?.inventory_quantity || 0,
        firstVariant?.weight || "",
        firstVariant?.weight_unit || "",
        images[0]?.src || "",
        images[1]?.src || "",
        images[2]?.src || "",
        images[3]?.src || "",
        images[4]?.src || "",
        product.created_at,
        product.updated_at,
        product.published_at || "",
        `https://${SHOPIFY_DOMAIN}/admin/products/${product.id}`,
        product.published_at ? `https://${SHOPIFY_DOMAIN}/products/${product.handle}` : ""
      ].map(escapeCSV).join(",");
    });

    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");

    return new Response(
      csvContent,
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="shopify-inventory-${new Date().toISOString().split('T')[0]}.csv"`,
        } 
      }
    );
  } catch (error: any) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Export failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
