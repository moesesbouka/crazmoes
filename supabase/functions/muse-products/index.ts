import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const ALLOWED_FIELDS = new Set([
  "facebook_id",
  "listing_url",
  "title",
  "price",
  "description",
  "condition",
  "location",
  "status",
]);

const FORBIDDEN_FIELDS = new Set(["images", "image", "photos", "photo", "category"]);
const MAX_BATCH = 250;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is unavailable");

  let key = "";
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeysRaw) {
    try {
      key = JSON.parse(secretKeysRaw)?.default ?? "";
    } catch {
      // Legacy fallback below.
    }
  }
  key ||= Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!key) throw new Error("Supabase admin key is unavailable");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function validateListing(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Each listing must be an object");
  }

  const listing = value as Record<string, unknown>;
  for (const key of Object.keys(listing)) {
    if (FORBIDDEN_FIELDS.has(key)) {
      throw new Error(`${key} is forbidden; Muse must never send photo or category fields`);
    }
    if (!ALLOWED_FIELDS.has(key)) {
      throw new Error(`Unsupported listing field: ${key}`);
    }
  }

  const facebookId = String(listing.facebook_id ?? "").trim();
  if (!/^[0-9]{6,25}$/.test(facebookId)) {
    throw new Error("facebook_id is required and must be numeric");
  }

  return { ...listing, facebook_id: facebookId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization, content-type",
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
      },
    });
  }

  try {
    const supabase = getAdminClient();

    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) return json({ error: "Unauthorized" }, 401);

    const tokenHash = await sha256Hex(token);
    const { data: authRow, error: authError } = await supabase
      .from("muse_api_auth")
      .select("id")
      .eq("token_sha256", tokenHash)
      .eq("active", true)
      .maybeSingle();

    if (authError || !authRow) return json({ error: "Unauthorized" }, 401);

    await supabase
      .from("muse_api_auth")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", authRow.id);

    if (req.method === "GET") {
      return json({
        ok: true,
        service: "CrazyMoe Muse metadata sync",
        version: 1,
        unique_key: "facebook_id",
        account_tag: "crazymoe",
        allowed_listing_fields: Array.from(ALLOWED_FIELDS),
        forbidden_fields: Array.from(FORBIDDEN_FIELDS),
        max_batch: MAX_BATCH,
        photos: "managed separately by CrazyMoe gallery sync",
        removals: {
          method: "POST",
          body: { operation: "archive", facebook_ids: ["123456789"] },
        },
      });
    }

    if (req.method !== "POST" && req.method !== "DELETE") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return json({ error: "Invalid JSON body" }, 400);

    let listings: Record<string, unknown>[] = [];
    const archiveRequested =
      req.method === "DELETE" ||
      String(body.operation ?? "").toLowerCase() === "archive";

    if (archiveRequested) {
      const ids = Array.isArray(body.facebook_ids)
        ? body.facebook_ids
        : body.facebook_id != null
          ? [body.facebook_id]
          : [];

      if (ids.length === 0) {
        return json({ error: "archive requires facebook_id or facebook_ids" }, 400);
      }

      listings = ids.map((id) => ({
        facebook_id: String(id),
        status: "inactive",
      }));
    } else if (Array.isArray(body.listings)) {
      listings = body.listings.map(validateListing);
    } else if (body.listing && typeof body.listing === "object") {
      listings = [validateListing(body.listing)];
    } else {
      listings = [validateListing(body)];
    }

    if (listings.length > MAX_BATCH) {
      return json({ error: `Batch too large; maximum is ${MAX_BATCH}` }, 413);
    }

    if (archiveRequested) listings = listings.map(validateListing);

    const { data, error } = await supabase.rpc("muse_apply_metadata", {
      p_listings: listings,
    });

    if (error) {
      console.error("Muse metadata RPC failed", error);
      return json({ error: "Database update failed" }, 500);
    }

    return json({
      ok: true,
      operation: archiveRequested ? "archive" : "upsert",
      processed: Number((data as { processed?: number } | null)?.processed ?? listings.length),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bad request";
    return json({ error: message }, 400);
  }
});
