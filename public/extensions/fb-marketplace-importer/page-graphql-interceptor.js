// FB Marketplace Importer - Page Context GraphQL Interceptor
// Loaded as a web_accessible_resource and injected by content-importer.js
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

        var title = obj.title || obj.name || obj.marketplace_listing_title || '';
        if (title && typeof title === 'object') title = title.text || '';
        title = String(title || '').trim();

        var price = null;
        const priceField =
          obj.price ||
          obj.listing_price ||
          obj.formatted_price ||
          obj.current_price ||
          obj.sale_price;

        if (priceField) {
          var raw = priceField;
          if (typeof raw === 'object') raw = raw.amount || raw.text || '';
          const num = String(raw || '').replace(/[^0-9.]/g, '');
          if (num) {
            const parsed = parseFloat(num);
            if (Number.isFinite(parsed)) price = parsed;
          }
        }

        const images = [];
        const imageField =
          obj.image ||
          obj.images ||
          obj.primary_photo ||
          obj.photo ||
          obj.listing_photos ||
          obj.primary_listing_photo;

        if (Array.isArray(imageField)) {
          for (const img of imageField) {
            if (typeof img === 'string') pushUrl(images, img);
            else if (img && typeof img === 'object') pushUrl(images, img.uri || img.url || img.src);
          }
        } else if (imageField && typeof imageField === 'object') {
          pushUrl(images, imageField.uri || imageField.url || imageField.src);
        } else if (typeof imageField === 'string') {
          pushUrl(images, imageField);
        }

        // Only emit if we have at least something useful
        if (!title && !price && images.length === 0) return;

        window.postMessage(
          {
            source: 'fb-importer',
            type: 'LISTING',
            payload: {
              facebook_id: id,
              title: (title || 'Untitled').slice(0, 255),
              price: Number.isFinite(price) ? price : null,
              images: images.slice(0, 10),
              listing_url: 'https://www.facebook.com/marketplace/item/' + id,
              status: 'active',
              imported_at: new Date().toISOString(),
            },
          },
          '*'
        );
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
        if (url && url.indexOf('graphql') !== -1) {
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
            if (url && url.indexOf('graphql') !== -1) {
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
    console.log('FB Importer: Page-context GraphQL interceptor injected.');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('FB Importer: Injection failed', e);
  }
})();
