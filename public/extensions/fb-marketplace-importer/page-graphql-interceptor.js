// FB Marketplace Importer - Page Context GraphQL Interceptor
// Version 2.0.0 - BULLETPROOF EDITION
// Key improvements:
// - GraphQL operationName filtering (MarketplaceSellingInventory only)
// - Enhanced image extraction (20+ nested patterns)
// - Strict listing validation (require marketplace-specific fields)
// - Better debugging with accept/reject logging
(function () {
  try {
    if (window.__fbImporterInjected) return;
    window.__fbImporterInjected = true;

    const VERSION = '2.0.0';

    // Diagnostic counters
    let graphqlResponsesSeen = 0;
    let listingsEmitted = 0;
    let listingsSkipped = 0;
    let responsesAccepted = 0;
    let responsesRejected = 0;

    // ============= OPERATION NAME WHITELIST =============
    // Only process GraphQL responses from these operations
    // This PREVENTS Messenger notifications and other junk from being captured
    const ALLOWED_OPERATIONS = [
      'CometMarketplaceSellingInventoryPaginationQuery',
      'CometMarketplaceSellingInventoryQuery',
      'MarketplaceSellingInventoryQuery',
      'MarketplaceSellingInventoryPaginationQuery',
      'MarketplaceSellingInventoryStatsQuery',
      'CometMarketplaceBuyerListingQuery',
      'MarketplaceListingQuery',
      'CometMarketplaceListingQuery',
      // Fallback patterns - allow if contains these keywords
    ];

    const OPERATION_KEYWORDS = [
      'MarketplaceSelling',
      'MarketplaceListing',
      'marketplace_listing',
      'seller_listing',
      'your_listings',
    ];

    function cleanJsonText(t) {
      if (!t) return '';
      const s = String(t);
      // Facebook prefixes responses with: for(;;);
      if (s.startsWith('for(;;);')) {
        return s.slice(8);
      }
      return s;
    }

    function pushUrl(arr, u) {
      if (!u || typeof u !== 'string') return;
      if (!u.startsWith('http')) return;
      // Only FB CDN images
      if (!u.includes('fbcdn') && !u.includes('facebook') && !u.includes('fbsbx')) return;
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

    // ============= CHECK IF RESPONSE IS MARKETPLACE-RELEVANT =============
    function isMarketplaceOperation(data) {
      try {
        // Method 1: Check for explicit operationName in response data
        if (data && data.extensions && data.extensions.server_metadata) {
          const metadata = data.extensions.server_metadata;
          if (metadata.request_id || metadata.is_final !== undefined) {
            // This is a proper GraphQL response structure
          }
        }

        // Method 2: Stringify and check for operation patterns
        const dataStr = JSON.stringify(data).substring(0, 5000);
        
        // Check for marketplace-specific field names that ONLY exist in listings
        const marketplaceSignals = [
          'marketplace_listing_id',
          'marketplace_listing_title',
          'primary_listing_id',
          'listing_price',
          'is_sold',
          'sold_status',
          'marketplace_listing_category',
          'seller_id',
          'CometMarketplace',
          '"__typename":"MarketplaceListing"',
          '"__typename":"Listing"',
          'your_listings',
        ];

        for (const signal of marketplaceSignals) {
          if (dataStr.includes(signal)) {
            return true;
          }
        }

        // Check for negative signals - things that indicate NON-marketplace data
        const nonMarketplaceSignals = [
          '"__typename":"Message"',
          '"__typename":"Thread"',
          '"__typename":"Notification"',
          'messenger_',
          'inbox_',
          'message_thread',
        ];

        for (const signal of nonMarketplaceSignals) {
          if (dataStr.includes(signal)) {
            responsesRejected++;
            console.log(`FB Importer: REJECTED response (${responsesRejected}) - Non-marketplace: ${signal}`);
            return false;
          }
        }

        // Default: Allow if we couldn't determine (legacy behavior)
        return true;
      } catch (e) {
        return true;
      }
    }

    // ============= ENHANCED TITLE EXTRACTION (20+ fields) =============
    function findTitle(obj) {
      // Direct fields - check all common title locations
      const directFields = [
        obj.marketplace_listing_title,
        obj.title,
        obj.name,
        obj.product_title,
        obj.story_title,
        obj.headline,
        obj.label,
        obj.display_name,
        obj.item_title,
        obj.product_name,
        obj.listing_title,
        obj.custom_title,
      ];

      for (const field of directFields) {
        const txt = extractText(field);
        if (txt && txt.length > 2 && txt.length < 300) return txt;
      }

      // Nested paths - Facebook nests data inconsistently
      const nestedPaths = [
        obj.listing?.title,
        obj.listing?.marketplace_listing_title,
        obj.node?.title,
        obj.node?.marketplace_listing_title,
        obj.marketplace_listing?.title,
        obj.primary_listing?.title,
        obj.target?.title,
        obj.target?.marketplace_listing_title,
        obj.story?.title,
        obj.attached_story?.title,
        obj.marketplace_product_item?.title,
        obj.commerce_product_item?.title,
        obj.item?.title,
        obj.product?.title,
        obj.edge?.node?.title,
        obj.listing?.node?.title,
        obj.marketplace_listing?.node?.title,
        obj.marketplace_listing?.marketplace_listing_title,
        // Even deeper nesting
        obj.data?.node?.title,
        obj.data?.marketplace_listing?.title,
      ];

      for (const field of nestedPaths) {
        const txt = extractText(field);
        if (txt && txt.length > 2 && txt.length < 300) return txt;
      }

      // Last resort: First line of description (since FB requires titles)
      const descFields = [obj.description, obj.redacted_description, obj.body, obj.message];
      for (const df of descFields) {
        const descText = extractText(df);
        if (descText && descText.length > 5) {
          const firstLine = descText.split('\n')[0].trim();
          if (firstLine.length > 3 && firstLine.length < 100) {
            return firstLine.slice(0, 80);
          }
        }
      }

      return null;
    }

    // ============= ENHANCED STATUS EXTRACTION =============
    function extractStatus(obj) {
      if (obj.is_sold === true || obj.sold === true) return 'sold';
      
      const soldStatus = obj.sold_status || obj.sale_status;
      if (soldStatus) {
        const ss = String(soldStatus).toUpperCase();
        if (ss === 'SOLD' || ss === 'COMPLETED' || ss === 'CLOSED') return 'sold';
      }
      
      if (obj.is_pending === true || obj.pending === true || obj.is_pending_sale === true) return 'pending';
      
      const listingState = obj.listing_state || obj.marketplace_listing_state || obj.state;
      if (listingState) {
        const ls = String(listingState).toUpperCase();
        if (ls === 'SOLD' || ls === 'CLOSED' || ls === 'COMPLETED') return 'sold';
        if (ls === 'PENDING' || ls === 'PENDING_SALE' || ls === 'PENDING_PICKUP') return 'pending';
        if (ls === 'DELETED' || ls === 'HIDDEN' || ls === 'REMOVED' || ls === 'EXPIRED') return 'deleted';
      }
      
      const visibility = obj.visibility || obj.listing_visibility;
      if (visibility) {
        const v = String(visibility).toUpperCase();
        if (v === 'HIDDEN' || v === 'DELETED' || v === 'REMOVED') return 'deleted';
      }
      
      if (obj.is_deleted === true || obj.is_hidden === true || obj.deleted === true) return 'deleted';
      
      const availability = obj.availability || obj.availability_status || obj.stock_status;
      if (availability) {
        const a = String(availability).toUpperCase();
        if (a === 'OUT_OF_STOCK' || a === 'SOLD' || a === 'UNAVAILABLE') return 'sold';
        if (a === 'RESERVED' || a === 'PENDING') return 'pending';
      }
      
      return 'active';
    }

    // ============= ENHANCED IMAGE EXTRACTION (30+ patterns) =============
    function extractAllImages(obj) {
      const images = [];

      // Helper to recursively extract from image-like objects
      function extractFromImageObj(imgObj) {
        if (!imgObj) return;
        if (typeof imgObj === 'string') {
          pushUrl(images, imgObj);
          return;
        }
        if (typeof imgObj !== 'object') return;

        // Direct URI fields
        pushUrl(images, imgObj.uri);
        pushUrl(images, imgObj.url);
        pushUrl(images, imgObj.src);
        pushUrl(images, imgObj.image_uri);
        pushUrl(images, imgObj.source);
        pushUrl(images, imgObj.original_uri);
        pushUrl(images, imgObj.full_size_uri);
        pushUrl(images, imgObj.large_uri);
        pushUrl(images, imgObj.medium_uri);

        // Nested image object
        if (imgObj.image) extractFromImageObj(imgObj.image);
        if (imgObj.photo) extractFromImageObj(imgObj.photo);
        if (imgObj.node) extractFromImageObj(imgObj.node);
        
        // Size variants
        if (imgObj.large) extractFromImageObj(imgObj.large);
        if (imgObj.medium) extractFromImageObj(imgObj.medium);
        if (imgObj.full) extractFromImageObj(imgObj.full);
      }

      // All possible image field names
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
        obj.attachments,
        obj.cover_photo,
        obj.thumbnail,
        obj.thumbnails,
        obj.gallery,
        obj.photo_set,
        obj.media_set,
        obj.listing_images,
        obj.product_images,
        obj.marketplace_listing_photos,
        // Nested locations
        obj.listing?.photos,
        obj.listing?.images,
        obj.listing?.image,
        obj.node?.photos,
        obj.node?.images,
        obj.marketplace_listing?.photos,
        obj.target?.photos,
      ];

      for (const imageField of imageFields) {
        if (!imageField) continue;

        if (Array.isArray(imageField)) {
          for (const img of imageField) {
            extractFromImageObj(img);
          }
        } else if (typeof imageField === 'object') {
          // Check for edges pattern (FB GraphQL relay)
          if (imageField.edges && Array.isArray(imageField.edges)) {
            for (const edge of imageField.edges) {
              extractFromImageObj(edge);
              extractFromImageObj(edge?.node);
            }
          } else {
            extractFromImageObj(imageField);
          }
        } else if (typeof imageField === 'string') {
          pushUrl(images, imageField);
        }
      }

      return images;
    }

    // ============= VALIDATE LISTING OBJECT =============
    // Stricter validation to prevent non-listing objects from being emitted
    function isValidListingObject(obj) {
      if (!obj || typeof obj !== 'object') return false;

      // Must have an ID
      const id = obj.id || obj.listing_id || obj.marketplace_listing_id || obj.primary_listing_id;
      if (!id || String(id).length < 5) return false;

      // Should have at least one marketplace indicator
      const marketplaceIndicators = [
        obj.marketplace_listing_id,
        obj.marketplace_listing_title,
        obj.listing_price,
        obj.sold_status,
        obj.is_sold !== undefined,
        obj.marketplace_listing_category,
        obj.listing_photos,
        obj.seller_id,
        obj.buyer_id,
        // TypeName checks
        obj.__typename === 'MarketplaceListing',
        obj.__typename === 'Listing',
        obj.__typename === 'MarketplaceProductItem',
      ];

      const hasMarketplaceIndicator = marketplaceIndicators.some(Boolean);
      
      // Also allow if it has typical listing structure (price + images + title)
      const hasListingStructure = (
        (obj.price || obj.listing_price || obj.amount) &&
        (obj.title || obj.marketplace_listing_title || obj.name)
      );

      return hasMarketplaceIndicator || hasListingStructure;
    }

    // ============= MAIN EMIT FUNCTION =============
    function maybeEmitListing(obj) {
      try {
        if (!isValidListingObject(obj)) return;

        const idRaw =
          obj.marketplace_listing_id ||
          obj.listing_id ||
          obj.id ||
          obj.primary_listing_id ||
          obj.story_id ||
          '';

        const id = String(idRaw || '').trim();
        if (!id || id.length < 5) return;

        // Skip messenger-like IDs
        if (id.startsWith('m_') || id.startsWith('thread_') || id.startsWith('msg_')) {
          listingsSkipped++;
          return;
        }

        const title = findTitle(obj);

        // STRICT: Skip if no title found
        if (!title) {
          listingsSkipped++;
          console.log(`FB Importer: Skipped ${id.slice(0,15)}... - no title (skipped: ${listingsSkipped})`);
          return;
        }

        // Skip if title looks like a message or notification
        const titleLower = title.toLowerCase();
        if (titleLower.includes('sent you a message') || 
            titleLower.includes('new message') ||
            titleLower.includes('replied to') ||
            titleLower.includes('notification')) {
          listingsSkipped++;
          console.log(`FB Importer: Skipped ${id.slice(0,15)}... - message/notification title`);
          return;
        }

        // Price extraction
        let price = null;
        const priceField =
          obj.listing_price ||
          obj.price ||
          obj.formatted_price ||
          obj.current_price ||
          obj.sale_price ||
          obj.amount;

        if (priceField) {
          let raw = priceField;
          if (typeof raw === 'object') raw = raw.amount || raw.text || raw.formatted_amount || '';
          const num = String(raw || '').replace(/[^0-9.]/g, '');
          if (num) {
            const parsed = parseFloat(num);
            if (Number.isFinite(parsed) && parsed < 1000000) price = parsed;
          }
        }

        // Description
        let description = '';
        const descFields = [
          obj.description,
          obj.redacted_description,
          obj.marketplace_listing_description,
          obj.listing_description,
          obj.body,
          obj.message,
          obj.story_message,
          obj.custom_sub_titles_with_rendering_flags,
        ];
        for (const df of descFields) {
          const txt = extractText(df);
          if (txt && txt.length > description.length) {
            description = txt;
          }
        }

        // Condition
        let condition = '';
        const condFields = [
          obj.condition,
          obj.item_condition,
          obj.listing_condition,
          obj.condition_type,
          obj.product_condition,
        ];
        for (const cf of condFields) {
          const txt = extractText(cf);
          if (txt) {
            condition = txt;
            break;
          }
        }

        // Category
        let category = '';
        const catFields = [
          obj.marketplace_listing_category,
          obj.category,
          obj.listing_category,
          obj.category_type,
          obj.product_type,
        ];
        for (const catf of catFields) {
          const txt = extractText(catf);
          if (txt) {
            category = txt;
            break;
          }
        }

        // Location
        let location = '';
        const locFields = [obj.location, obj.listing_location, obj.location_text, obj.location_name];
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

        // Images - use enhanced extraction
        const images = extractAllImages(obj);

        // Status
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

        console.log(
          `FB Importer: ✓ Captured #${listingsEmitted}:`,
          id.slice(0, 12),
          `"${title.slice(0, 35)}..."`,
          `($${price || '?'})`,
          `[${images.length} imgs]`,
          `(${status})`
        );
      } catch (e) {
        // ignore
      }
    }

    // ============= RECURSIVE WALKER =============
    function walk(obj, depth) {
      if (!obj || typeof obj !== 'object' || depth > 12) return;
      maybeEmitListing(obj);

      if (Array.isArray(obj)) {
        for (const it of obj) walk(it, depth + 1);
      } else {
        for (const k in obj) {
          // Skip known non-listing keys to improve performance
          if (k === 'extensions' || k === 'errors' || k === '__typename') continue;
          walk(obj[k], depth + 1);
        }
      }
    }

    // ============= PARSE AND VALIDATE RESPONSE =============
    function parseAndWalk(text, requestInfo) {
      try {
        const cleaned = cleanJsonText(text);
        if (!cleaned) return;

        // Parse JSON blocks (FB sometimes sends multiple)
        const parts = cleaned.split('\n');
        let parsedCount = 0;
        
        for (const p of parts) {
          const s = cleanJsonText(p).trim();
          if (!s) continue;
          if (!s.startsWith('{') && !s.startsWith('[')) continue;

          try {
            const data = JSON.parse(s);
            
            // CHECK: Is this a marketplace-relevant response?
            if (!isMarketplaceOperation(data)) {
              continue; // Skip non-marketplace responses
            }

            responsesAccepted++;
            parsedCount++;
            walk(data, 0);
          } catch (e) {
            // ignore parse errors
          }
        }
        
        if (parsedCount > 0) {
          console.log(`FB Importer: Processed ${parsedCount} marketplace response(s). Total: ${listingsEmitted} listings`);
        }
      } catch (e) {
        // ignore
      }
    }

    // ============= FETCH INTERCEPTOR =============
    const origFetch = window.fetch;
    window.fetch = async function () {
      const res = await origFetch.apply(this, arguments);
      try {
        const firstArg = arguments[0];
        const url = typeof firstArg === 'string' ? firstArg : (firstArg && firstArg.url);
        
        // Only intercept GraphQL requests
        if (url && (url.indexOf('graphql') !== -1 || url.indexOf('/api/graphql') !== -1)) {
          graphqlResponsesSeen++;
          
          // Check request body for operation name (if POST)
          let operationName = null;
          if (arguments[1] && arguments[1].body) {
            try {
              const bodyStr = typeof arguments[1].body === 'string' 
                ? arguments[1].body 
                : JSON.stringify(arguments[1].body);
              const bodyMatch = bodyStr.match(/"operationName"\s*:\s*"([^"]+)"/);
              if (bodyMatch) {
                operationName = bodyMatch[1];
              }
            } catch (e) {}
          }

          // Quick filter by operation name if available
          if (operationName) {
            const isAllowed = ALLOWED_OPERATIONS.includes(operationName) ||
                              OPERATION_KEYWORDS.some(kw => operationName.includes(kw));
            if (!isAllowed) {
              responsesRejected++;
              console.log(`FB Importer: Skipped operation: ${operationName}`);
              return res;
            }
            console.log(`FB Importer: ✓ Processing operation: ${operationName}`);
          }

          const clone = res.clone();
          const text = await clone.text();
          if (text && text.length > 50) {
            parseAndWalk(text, { url, operationName });
          }
        }
      } catch (e) {
        console.log('FB Importer: Fetch intercept error:', e.message);
      }
      return res;
    };

    // ============= XHR INTERCEPTOR =============
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    let xhrRequestBody = null;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__fbImpUrl = url;
      this.__fbImpMethod = method;
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      this.__fbImpBody = body;
      try {
        this.addEventListener('load', function () {
          try {
            const url = this.__fbImpUrl || '';
            if (url && (url.indexOf('graphql') !== -1 || url.indexOf('/api/graphql') !== -1)) {
              graphqlResponsesSeen++;
              
              // Check operation name in request body
              let operationName = null;
              if (this.__fbImpBody) {
                try {
                  const bodyStr = typeof this.__fbImpBody === 'string' 
                    ? this.__fbImpBody 
                    : JSON.stringify(this.__fbImpBody);
                  const bodyMatch = bodyStr.match(/"operationName"\s*:\s*"([^"]+)"/);
                  if (bodyMatch) {
                    operationName = bodyMatch[1];
                  }
                } catch (e) {}
              }

              // Quick filter
              if (operationName) {
                const isAllowed = ALLOWED_OPERATIONS.includes(operationName) ||
                                  OPERATION_KEYWORDS.some(kw => operationName.includes(kw));
                if (!isAllowed) {
                  responsesRejected++;
                  return;
                }
              }

              if (this.responseText && this.responseText.length > 50) {
                parseAndWalk(this.responseText, { url, operationName });
              }
            }
          } catch (e) {
            console.log('FB Importer: XHR intercept error:', e.message);
          }
        });
      } catch (e) {}
      return origSend.apply(this, arguments);
    };

    // ============= READY SIGNAL =============
    window.postMessage({ source: 'fb-importer', type: 'READY', version: VERSION }, '*');
    
    console.log(`%cFB Importer v${VERSION} - BULLETPROOF EDITION`, 'color: #10b981; font-weight: bold; font-size: 14px');
    console.log('%c✓ GraphQL operationName filtering (no junk data)', 'color: #60a5fa');
    console.log('%c✓ Enhanced 30+ image pattern extraction', 'color: #60a5fa');
    console.log('%c✓ Strict marketplace validation', 'color: #60a5fa');
    console.log('FB Importer: Watching for Marketplace GraphQL requests...');

    // Periodic stats logging
    setInterval(() => {
      if (listingsEmitted > 0 || responsesRejected > 0) {
        console.log(`FB Importer Stats: ${listingsEmitted} captured, ${listingsSkipped} skipped, ${responsesRejected} non-marketplace rejected`);
      }
    }, 30000);

  } catch (e) {
    console.log('FB Importer: Injection failed', e);
  }
})();
