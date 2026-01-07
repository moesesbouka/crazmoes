import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductData {
  title: string;
  price: string;
  description: string;
  images: string[];
  source: string;
}

function extractJsonLd(html: string): Partial<ProductData> {
  const result: Partial<ProductData> = {};
  
  // Find JSON-LD scripts
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonData = JSON.parse(match[1]);
      const product = jsonData['@type'] === 'Product' ? jsonData : 
                      jsonData['@graph']?.find((item: any) => item['@type'] === 'Product');
      
      if (product) {
        result.title = product.name;
        result.description = product.description;
        
        if (product.offers) {
          const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
          result.price = offer.price?.toString() || '';
        }
        
        if (product.image) {
          const images = Array.isArray(product.image) ? product.image : [product.image];
          result.images = images.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean);
        }
        
        break;
      }
    } catch (e) {
      console.log('JSON-LD parse error:', e);
    }
  }
  
  return result;
}

function extractMetaTags(html: string): Partial<ProductData> {
  const result: Partial<ProductData> = {};
  
  // og:title
  const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                     html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (titleMatch) result.title = titleMatch[1];
  
  // og:description
  const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  if (descMatch) result.description = descMatch[1];
  
  // og:image
  const imageMatches = html.matchAll(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi);
  const images: string[] = [];
  for (const m of imageMatches) {
    images.push(m[1]);
  }
  if (images.length) result.images = images;
  
  // product:price:amount
  const priceMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i);
  if (priceMatch) result.price = priceMatch[1];
  
  return result;
}

function extractFromDOM(html: string, url: string): Partial<ProductData> {
  const result: Partial<ProductData> = {};
  
  // Title from h1 or title tag
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) result.title = h1Match[1].trim();
  
  if (!result.title) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) result.title = titleMatch[1].trim();
  }
  
  // Price patterns
  const pricePatterns = [
    /\$[\d,]+\.?\d*/g,
    /USD\s*[\d,]+\.?\d*/gi,
    /price['":\s]+[\$]?([\d,]+\.?\d*)/gi
  ];
  
  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match) {
      result.price = match[0].replace(/[^\d.]/g, '');
      break;
    }
  }
  
  // Images - look for product images
  const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*/gi);
  const images: string[] = [];
  
  for (const m of imgMatches) {
    const src = m[1];
    // Filter for likely product images (larger sizes, product paths)
    if (src.includes('product') || src.includes('item') || 
        src.match(/\d{3,}x\d{3,}/) || src.match(/large|big|main|hero/i)) {
      // Make absolute URL if relative
      let absoluteUrl = src;
      if (src.startsWith('//')) {
        absoluteUrl = 'https:' + src;
      } else if (src.startsWith('/')) {
        const urlObj = new URL(url);
        absoluteUrl = urlObj.origin + src;
      }
      images.push(absoluteUrl);
    }
  }
  
  if (images.length) result.images = [...new Set(images)].slice(0, 10);
  
  return result;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping URL:', url);

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    console.log('Fetched HTML length:', html.length);

    // Extract data using multiple methods
    const jsonLdData = extractJsonLd(html);
    const metaData = extractMetaTags(html);
    const domData = extractFromDOM(html, url);

    // Merge data with priority: JSON-LD > Meta Tags > DOM
    const productData: ProductData = {
      title: decodeHtmlEntities(jsonLdData.title || metaData.title || domData.title || ''),
      price: jsonLdData.price || metaData.price || domData.price || '',
      description: decodeHtmlEntities(jsonLdData.description || metaData.description || ''),
      images: jsonLdData.images || metaData.images || domData.images || [],
      source: new URL(url).hostname,
    };

    console.log('Extracted product:', {
      title: productData.title,
      price: productData.price,
      imageCount: productData.images.length,
      source: productData.source,
    });

    return new Response(
      JSON.stringify({ success: true, product: productData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scrape error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
