import type { VercelRequest, VercelResponse } from "@vercel/node";
import https from "https";
import http from "http";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).send("Missing url");
  }

  let imageUrl: string;
  try {
    imageUrl = decodeURIComponent(url);
    // Only allow Facebook CDN and known safe domains
    const hostname = new URL(imageUrl).hostname;
    const allowed = ["fbcdn.net", "facebook.com", "cdninstagram.com", "fbsbx.com"];
    if (!allowed.some(d => hostname.endsWith(d))) {
      // Still proxy it but without special headers
    }
  } catch {
    return res.status(400).send("Invalid url");
  }

  const options = {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.facebook.com/marketplace/",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "sec-fetch-dest": "image",
      "sec-fetch-mode": "no-cors",
      "sec-fetch-site": "cross-site",
    },
  };

  const client = imageUrl.startsWith("https") ? https : http;

  const proxyReq = client.get(imageUrl, options, (proxyRes) => {
    if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302) {
      const location = proxyRes.headers.location;
      if (location) {
        // Follow redirect
        const redirectClient = location.startsWith("https") ? https : http;
        const redirectReq = redirectClient.get(location, options, (redirectRes) => {
          res.setHeader("Content-Type", redirectRes.headers["content-type"] || "image/jpeg");
          res.setHeader("Cache-Control", "public, max-age=86400");
          redirectRes.pipe(res);
        });
        redirectReq.on("error", () => res.status(502).send("Redirect failed"));
        return;
      }
    }

    if (!proxyRes.statusCode || proxyRes.statusCode >= 400) {
      return res.status(proxyRes.statusCode || 502).send("Image fetch failed");
    }

    res.setHeader("Content-Type", proxyRes.headers["content-type"] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.status(502).send("Proxy error");
  });

  proxyReq.setTimeout(8000, () => {
    proxyReq.destroy();
    res.status(504).send("Timeout");
  });
}
