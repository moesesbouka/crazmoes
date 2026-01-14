// FB Marketplace Importer - Page Context GraphQL Interceptor
// Version 1.2.7 - Enhanced title extraction, skip untitled listings
(function () {
  try {
    if (window.__fbImporterInjected) return;
    window.__fbImporterInjected = true;

    // Diagnostic counters
    let graphqlResponsesSeen = 0;
    let listingsEmitted = 0;
    let listingsSkipped = 0;

    function cleanJsonText(t) {
      if (!t) return '';
      const s = String(t);
      // Facebook often prefixes responses with: for(;;);
      if (s.startsWith('for(;;);')) {
        return s.slice(8);
      }
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
        return String(field.text || field.value || field.name || field.display_text || '').trim();
      }
      return '';
    }

    // ============= ENHANCED TITLE EXTRACTION (15+ fields) =============
    function findTitle(obj) {
      // Direct fields - check all common title locations
      const directFields = [
        obj.title,
        obj.name,
        obj.marketplace_listing_title,
        obj.product_title,
        obj.story_title,
        obj.headline,
        obj.label,
        obj.display_name,
        obj.item_title,
        obj.product_name,
        obj.listing_title
      ];

      // Check direct fields first
      for (const field of directFields) {
        const txt = extractText(field);
        if (txt && txt.length > 2) return txt;
      }

      // Nested paths - Facebook nests data inconsistently
      const nestedPaths = [
        obj.listing?.title,
        obj.node?.title,
        obj.marketplace_listing?.title,
        obj.primary_listing?.title,
        obj.target?.title,
        obj.story?.title,
        obj.attached_story?.title,
        obj.marketplace_product_item?.title,
        obj.commerce_product_item?.title,
        obj.item?.title,
        obj.product?.title,
        obj.edge?.node?.title,
        // Deeper nested
        obj.listing?.node?.title,
        obj.marketplace_listing?.node?.title
      ];

      for (const field of nestedPaths) {
        const txt = extractText(field);
        if (txt && txt.length > 2) return txt;
      }

      // Last resort: First line of description (since FB requires titles)
      const descFields = [obj.description, obj.redacted_description, obj.body, obj.message];
      for (const df of descFields) {
        const descText = extractText(df);
        if (descText && descText.length > 5) {
          // Take first line, up to 80 chars
          const firstLine = descText.split('\n')[0].trim();
          if (firstLine.length > 3) {
            return firstLine.slice(0, 80);
          }
        }
      }

      // Return null - DO NOT return 'Untitled' - we'll skip this listing
      return null;
    }

    // Enhanced status extraction from Facebook's various field names
    function extractStatus(obj) {
      // Check for explicit sold indicators
      if (obj.is_sold === true || obj.sold === true) {
        return 'sold';
      }
      
      // Check sold_status field
      const soldStatus = obj.sold_status || obj.sale_status;
      if (soldStatus) {
        const ss = String(soldStatus).toUpperCase();
        if (ss === 'SOLD' || ss === 'COMPLETED' || ss === 'CLOSED') {
          return 'sold';
        }
      }
      
      // Check for pending indicators
      if (obj.is_pending === true || obj.pending === true || obj.is_pending_sale === true) {
        return 'pending';
      }
      
      // Check listing_state field
      const listingState = obj.listing_state || obj.marketplace_listing_state || obj.state;
      if (listingState) {
        const ls = String(listingState).toUpperCase();
        if (ls === 'SOLD' || ls === 'CLOSED' || ls === 'COMPLETED') {
          return 'sold';
        }
        if (ls === 'PENDING' || ls === 'PENDING_SALE' || ls === 'PENDING_PICKUP') {
          return 'pending';
        }
        if (ls === 'DELETED' || ls === 'HIDDEN' || ls === 'REMOVED' || ls === 'EXPIRED') {
          return 'deleted';
        }
      }
      
      // Check visibility field
      const visibility = obj.visibility || obj.listing_visibility;
      if (visibility) {
        const v = String(visibility).toUpperCase();
        if (v === 'HIDDEN' || v === 'DELETED' || v === 'REMOVED') {
          return 'deleted';
        }
      }
      
      // Check is_deleted / is_hidden flags
      if (obj.is_deleted === true || obj.is_hidden === true || obj.deleted === true) {
        return 'deleted';
      }
      
      // Check availability field
      const availability = obj.availability || obj.availability_status || obj.stock_status;
      if (availability) {
        const a = String(availability).toUpperCase();
        if (a === 'OUT_OF_STOCK' || a === 'SOLD' || a === 'UNAVAILABLE') {
          return 'sold';
        }
        if (a === 'RESERVED' || a === 'PENDING') {
          return 'pending';
        }
      }
      
      // Default to active if no other status found
      return 'active';
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

        // ============= CRITICAL: Use enhanced title extraction =============
        const title = findTitle(obj);

        // SKIP if no title found - Facebook requires titles
        if (!title) {
          listingsSkipped++;
          console.log(`FB Importer GraphQL: Skipped listing ${id} - no title found (skipped: ${listingsSkipped})`);
          return;
        }

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

        // Extract status using enhanced logic
        const status = extractStatus(obj);

        listingsEmitted++;
        const payload = {
          facebook_id: id,
          title: title.slice(0, 255),
          price: Number.isFinite(price) ? price : null,
          description: description.slice(0, 5000) || null,
          condition: condition || null,
          category: category || null,
          location: location || null,
          images: images.slice(0, 20),
          listing_url: 'https://www.facebook.com/marketplace/item/' + id,
          status: status,
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

        console.log(`FB Importer GraphQL: Captured #${listingsEmitted}:`, id, title.slice(0, 40), 
          `(status: ${status})`,
          description ? `(desc: ${description.length} chars)` : '(no desc)', 
          condition ? `(cond: ${condition})` : '(no cond)');
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
        let parsedCount = 0;
        for (const p of parts) {
          const s = cleanJsonText(p).trim();
          if (!s) continue;
          if (!s.startsWith('{') && !s.startsWith('[')) continue;

          try {
            const data = JSON.parse(s);
            parsedCount++;
            walk(data, 0);
          } catch (e) {
            // ignore parse errors
          }
        }
        if (parsedCount > 0) {
          console.log(`FB Importer: Parsed ${parsedCount} JSON block(s) from response`);
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
          graphqlResponsesSeen++;
          console.log(`FB Importer: GraphQL fetch #${graphqlResponsesSeen} from:`, url.slice(0, 80));
          const clone = res.clone();
          const text = await clone.text();
          if (text && text.length > 10) {
            parseAndWalk(text);
          }
        }
      } catch (e) {
        console.log('FB Importer: Fetch intercept error:', e.message);
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
              graphqlResponsesSeen++;
              console.log(`FB Importer: GraphQL XHR #${graphqlResponsesSeen} from:`, url.slice(0, 80));
              if (this.responseText && this.responseText.length > 10) {
                parseAndWalk(this.responseText);
              }
            }
          } catch (e) {
            console.log('FB Importer: XHR intercept error:', e.message);
          }
        });
      } catch (e) {
        // ignore
      }
      return origSend.apply(this, arguments);
    };

    window.postMessage({ source: 'fb-importer', type: 'READY' }, '*');
    console.log('FB Importer: Page-context GraphQL interceptor v1.2.7 READY');
    console.log('FB Importer: Watching for /api/graphql and /graphql requests...');
    console.log('FB Importer: Enhanced title extraction (15+ fields), skips untitled listings');
  } catch (e) {
    console.log('FB Importer: Injection failed', e);
  }
})();
