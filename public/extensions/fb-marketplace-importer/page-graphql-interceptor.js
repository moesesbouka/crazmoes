// FB Marketplace Importer - Page Context GraphQL Interceptor
// Version 1.2.2 - Captures full listing data: description, condition, category, all images
(function () {
  try {
    if (window.__fbImporterInjected) return;
    window.__fbImporterInjected = true;

    function cleanJsonText(t) {
      if (!t) return '';
      const s = String(t);
      // Facebook often prefixes responses with: for(;;);
      if (s.startsWith('for(;;);')) return s.slice(8);
      return s;
    }

    function pushUrl(arr, u) {
      if (!u || typeof u !== 'string') return;
      if (!u.startsWith('http')) return;
      if (arr.indexOf(u) !== -1) return;
      arr.push(u);
    }

    function extractText(field) {
      if (!field) return '';
      if (typeof field === 'string') return field.trim();
      if (typeof field === 'object') {
        return String(field.text || field.value || field.name || '').trim();
      }
      return '';
    }

    function maybeEmitListing(obj) {
      try {
        if (!obj || typeof obj !== 'object') return;

        const idRaw =
          obj.id ||
          obj.listing_id ||
          obj.marketplace_listing_id ||
          obj.primary_listing_id ||
          obj.story_id ||
          '';

        const id = String(idRaw || '').trim();
        if (!id || id.length < 5) return;

        // Title
        var title = extractText(obj.title) || extractText(obj.name) || extractText(obj.marketplace_listing_title);

        // Price
        var price = null;
        const priceField =
          obj.price ||
          obj.listing_price ||
          obj.formatted_price ||
          obj.current_price ||
          obj.sale_price ||
          obj.amount;

        if (priceField) {
          var raw = priceField;
          if (typeof raw === 'object') raw = raw.amount || raw.text || raw.formatted_amount || '';
          const num = String(raw || '').replace(/[^0-9.]/g, '');
          if (num) {
            const parsed = parseFloat(num);
            if (Number.isFinite(parsed)) price = parsed;
          }
        }

        // Description - check multiple possible field names
        var description = '';
        const descFields = [
          obj.description,
          obj.redacted_description,
          obj.marketplace_listing_description,
          obj.listing_description,
          obj.body,
          obj.message,
          obj.story_message
        ];
        for (const df of descFields) {
          const txt = extractText(df);
          if (txt && txt.length > description.length) {
            description = txt;
          }
        }

        // Condition
        var condition = '';
        const condFields = [
          obj.condition,
          obj.item_condition,
          obj.listing_condition,
          obj.condition_type,
          obj.product_condition
        ];
        for (const cf of condFields) {
          const txt = extractText(cf);
          if (txt) {
            condition = txt;
            break;
          }
        }

        // Category
        var category = '';
        const catFields = [
          obj.category,
          obj.marketplace_listing_category,
          obj.listing_category,
          obj.category_type,
          obj.product_type
        ];
        for (const catf of catFields) {
          const txt = extractText(catf);
          if (txt) {
            category = txt;
            break;
          }
        }
        // Also check nested category objects
        if (!category && obj.marketplace_listing_category_id) {
          category = extractText(obj.marketplace_listing_category_id);
        }

        // Location
        var location = '';
        const locFields = [
          obj.location,
          obj.listing_location,
          obj.location_text,
          obj.location_name
        ];
        for (const lf of locFields) {
          if (lf) {
            if (typeof lf === 'object') {
              location = extractText(lf.name) || extractText(lf.city) || extractText(lf.reverse_geocode);
            } else {
              location = extractText(lf);
            }
            if (location) break;
          }
        }

        // Images - collect ALL images from various fields
        const images = [];
        const imageFields = [
          obj.image,
          obj.images,
          obj.primary_photo,
          obj.photo,
          obj.photos,
          obj.listing_photos,
          obj.primary_listing_photo,
          obj.all_photos,
          obj.media,
          obj.attachments
        ];

        for (const imageField of imageFields) {
          if (!imageField) continue;
          
          if (Array.isArray(imageField)) {
            for (const img of imageField) {
              if (typeof img === 'string') {
                pushUrl(images, img);
              } else if (img && typeof img === 'object') {
                pushUrl(images, img.uri || img.url || img.src || img.image_uri);
                // Check for nested image object
                if (img.image) {
                  pushUrl(images, img.image.uri || img.image.url || img.image.src);
                }
              }
            }
          } else if (imageField && typeof imageField === 'object') {
            pushUrl(images, imageField.uri || imageField.url || imageField.src || imageField.image_uri);
            // Check for edges pattern (common in FB GraphQL)
            if (imageField.edges && Array.isArray(imageField.edges)) {
              for (const edge of imageField.edges) {
                if (edge.node) {
                  pushUrl(images, edge.node.uri || edge.node.url || edge.node.src);
                }
              }
            }
          } else if (typeof imageField === 'string') {
            pushUrl(images, imageField);
          }
        }

        // Only emit if we have at least something useful
        if (!title && !price && images.length === 0 && !description) return;

        const payload = {
          facebook_id: id,
          title: (title || 'Untitled').slice(0, 255),
          price: Number.isFinite(price) ? price : null,
          description: description.slice(0, 5000) || null,
          condition: condition || null,
          category: category || null,
          location: location || null,
          images: images.slice(0, 20),
          listing_url: 'https://www.facebook.com/marketplace/item/' + id,
          status: 'active',
          imported_at: new Date().toISOString(),
        };

        window.postMessage(
          {
            source: 'fb-importer',
            type: 'LISTING',
            payload: payload,
          },
          '*'
        );

        console.log('FB Importer GraphQL: Captured listing', id, title?.slice(0, 40));
      } catch (e) {
        // ignore
      }
    }

    function walk(obj, depth) {
      if (!obj || typeof obj !== 'object' || depth > 14) return;
      maybeEmitListing(obj);

      if (Array.isArray(obj)) {
        for (const it of obj) walk(it, depth + 1);
      } else {
        for (const k in obj) walk(obj[k], depth + 1);
      }
    }

    function parseAndWalk(text) {
      try {
        const cleaned = cleanJsonText(text);
        if (!cleaned) return;

        // Sometimes multiple JSON objects separated by newlines
        const parts = cleaned.split('\n');
        for (const p of parts) {
          const s = cleanJsonText(p).trim();
          if (!s) continue;
          if (!s.startsWith('{') && !s.startsWith('[')) continue;

          try {
            const data = JSON.parse(s);
            walk(data, 0);
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // Patch fetch
    const origFetch = window.fetch;
    window.fetch = async function () {
      const res = await origFetch.apply(this, arguments);
      try {
        const firstArg = arguments[0];
        const url = typeof firstArg === 'string' ? firstArg : firstArg && firstArg.url;
        if (url && (url.indexOf('graphql') !== -1 || url.indexOf('/api/graphql') !== -1)) {
          const clone = res.clone();
          const text = await clone.text();
          parseAndWalk(text);
        }
      } catch (e) {
        // ignore
      }
      return res;
    };

    // Patch XHR
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__fbImpUrl = url;
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      try {
        this.addEventListener('load', function () {
          try {
            const url = this.__fbImpUrl || '';
            if (url && (url.indexOf('graphql') !== -1 || url.indexOf('/api/graphql') !== -1)) {
              parseAndWalk(this.responseText);
            }
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }
      return origSend.apply(this, arguments);
    };

    window.postMessage({ source: 'fb-importer', type: 'READY' }, '*');
    console.log('FB Importer: Page-context GraphQL interceptor READY (captures description, condition, category)');
  } catch (e) {
    console.log('FB Importer: Injection failed', e);
  }
})();
