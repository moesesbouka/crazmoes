// FB Marketplace Importer - Background Service Worker v4.1
// v4.1: Handles image downloading from FB CDN (no CORS restriction in background)
//       + uploads to Supabase Storage for permanent URLs

const SUPABASE_URL = "https://sfheqjnxlkygjfohoybo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmaGVxam54bGt5Z2pmb2hveWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTc3NjUsImV4cCI6MjA4MzkzMzc2NX0.oWEnB48w_k_hOtYM1Ls2AHj8j-THDs_43BBzXrqPyxY";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('FB Marketplace Importer v4.1 installed!');
    chrome.storage.local.set({ lastImport: null, totalImported: 0 });
  }
});

// ── Image download + upload to Supabase Storage ──────────────────────────────
async function downloadAndUploadImage(imageUrl, facebookId, imageIndex) {
  try {
    // Download from Facebook (background service worker has no CORS restriction)
    const res = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://www.facebook.com/marketplace/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    if (!res.ok) {
      console.warn(`Image download failed (${res.status}): ${imageUrl.substring(0, 60)}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      console.warn('Not an image:', contentType);
      return null;
    }

    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const blob = await res.arrayBuffer();

    // Must be at least 5KB (avoid placeholders)
    if (blob.byteLength < 5000) {
      console.warn('Image too small, likely a placeholder');
      return null;
    }

    // Upload to Supabase Storage
    const storagePath = `listings/${facebookId}/img_${imageIndex}.${ext}`;
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/listing-images/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
          'Cache-Control': '31536000', // 1 year cache
        },
        body: blob,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('Upload failed:', err.substring(0, 100));
      return null;
    }

    // Return permanent public URL
    return `${SUPABASE_URL}/storage/v1/object/public/listing-images/${storagePath}`;
  } catch (e) {
    console.error('downloadAndUploadImage error:', e.message);
    return null;
  }
}

// ── Upload all images for a listing ──────────────────────────────────────────
async function uploadListingImages(facebookId, imageUrls) {
  const permanent = [];
  const MAX_IMAGES = 5; // Upload up to 5 images per listing

  for (let i = 0; i < Math.min(imageUrls.length, MAX_IMAGES); i++) {
    const url = imageUrls[i];
    if (!url || !url.startsWith('http')) continue;

    const permUrl = await downloadAndUploadImage(url, facebookId, i);
    if (permUrl) {
      permanent.push(permUrl);
    } else {
      // Keep original as fallback if upload fails
      permanent.push(url);
    }
  }

  return permanent;
}

// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'getStats') {
    chrome.storage.local.get(['lastImport', 'totalImported'], (result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'updateStats') {
    chrome.storage.local.get(['totalImported'], (result) => {
      const newTotal = (result.totalImported || 0) + request.count;
      chrome.storage.local.set({
        totalImported: newTotal,
        lastImport: { count: request.count, date: new Date().toISOString() }
      }, () => {
        sendResponse({ success: true, total: newTotal });
      });
    });
    return true;
  }

  // NEW: Upload images for a listing
  if (request.action === 'uploadImages') {
    const { facebookId, imageUrls } = request;
    uploadListingImages(facebookId, imageUrls || [])
      .then(permanentUrls => {
        sendResponse({ success: true, urls: permanentUrls });
      })
      .catch(err => {
        console.error('uploadImages error:', err);
        sendResponse({ success: false, urls: imageUrls || [] });
      });
    return true; // Keep channel open for async
  }
});
