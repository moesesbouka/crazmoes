// FB Marketplace Importer - Page Context GraphQL Interceptor
// Version 2.1.0 - DIAGNOSTIC EDITION
// Key improvements:
// - DIAGNOSTIC LOGGING: Logs response structures and candidate objects
// - RELAXED VALIDATION: Accepts 15+ ID patterns and any listing signals
// - BETTER FIELD DETECTION: Expanded title, price, and image patterns
(function () {
  try {
    if (window.__fbImporterInjected) return;
    window.__fbImporterInjected = true;

    const VERSION = '2.1.0';

    // Diagnostic counters
    let graphqlResponsesSeen = 0;
    let listingsEmitted = 0;
    let listingsSkipped = 0;
    let responsesAccepted = 0;
    let responsesRejected = 0;

    // DIAGNOSTIC: Track candidate objects for debugging
    let diagnosticCandidates = 0;
    const MAX_DIAGNOSTIC = 5;
    let responseStructuresLogged = 0;
    const MAX_STRUCTURE_LOGS = 3;

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
      // Additional patterns
      'MarketplaceSellerHomeQuery',
      'CometMarketplaceSellerHomeQuery',
      'MarketplaceCategoryFeedQuery',
    ];

    const OPERATION_KEYWORDS = [
      'MarketplaceSelling',
      'MarketplaceListing',
      'marketplace_listing',
      'seller_listing',
      'your_listings',
      'SellerHome',
      'MarketplaceItem',
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
        return String(field.text || field.value || field.name || field.display_text || field.content || '').trim();
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
        const dataStr = JSON.stringify(data).substring(0, 8000);
        
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
          '"__typename":"MarketplaceProductItem"',
          '"__typename":"MarketplaceFeedUnit"',
          '"__typename":"MarketplaceSellerListingItem"',
          'your_listings',
          'selling_inventory',
          'seller_home',
          // Additional patterns for detection
          'marketplace_product',
          'listing_id',
          'product_item',
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
            return false;
          }
        }

        // Default: Allow if we couldn't determine (legacy behavior)
        return true;
      } catch (e) {
        return true;
      }
    }

    // ============= ENHANCED TITLE EXTRACTION (30+ fields) =============
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
        // NEW patterns
        obj.formatted_title,
        obj.text_title,
        obj.item_name,
        obj.display_title,
      ];

      for (const field of directFields) {
        const txt = extractText(field);
        if (txt && txt.length > 2 && txt.length < 300) return txt;
      }

      // Nested paths - Facebook nests data inconsistently
      const nestedPaths = [
        obj.listing?.title,
        obj.listing?.marketplace_listing_title,
        obj.listing?.name,
        obj.node?.title,
        obj.node?.marketplace_listing_title,
        obj.node?.name,
        obj.marketplace_listing?.title,
        obj.marketplace_listing?.name,
        obj.primary_listing?.title,
        obj.target?.title,
        obj.target?.marketplace_listing_title,
        obj.target?.name,
        obj.story?.title,
        obj.attached_story?.title,
        obj.marketplace_product_item?.title,
        obj.commerce_product_item?.title,
        obj.item?.title,
        obj.item?.name,
        obj.product?.title,
        obj.product?.name,
        obj.edge?.node?.title,
        obj.listing?.node?.title,
        obj.marketplace_listing?.node?.title,
        obj.marketplace_listing?.marketplace_listing_title,
        // Even deeper nesting
        obj.data?.node?.title,
        obj.data?.marketplace_listing?.title,
        obj.data?.listing?.title,
        // New Facebook patterns
        obj.story_node?.title,
        obj.feed_unit?.title,
        obj.primary_photo?.accessibility_caption,
      ];

      for (const field of nestedPaths) {
        const txt = extractText(field);
        if (txt && txt.length > 2 && txt.length < 300) return txt;
      }

      // Last resort: First line of description (since FB requires titles)
      const descFields = [obj.description, obj.redacted_description, obj.body, obj.message, obj.custom_sub_titles_with_rendering_flags];
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
      
      const listingState = obj.listing_state || obj.marketplace_listing_state || obj.state || obj.status;
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

    // ============= ENHANCED IMAGE EXTRACTION (40+ patterns) =============
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
        pushUrl(images, imgObj.scaled_uri);
        pushUrl(images, imgObj.preview_uri);

        // Nested image object
        if (imgObj.image) extractFromImageObj(imgObj.image);
        if (imgObj.photo) extractFromImageObj(imgObj.photo);
        if (imgObj.node) extractFromImageObj(imgObj.node);
        
        // Size variants
        if (imgObj.large) extractFromImageObj(imgObj.large);
        if (imgObj.medium) extractFromImageObj(imgObj.medium);
        if (imgObj.full) extractFromImageObj(imgObj.full);
        if (imgObj.scaled) extractFromImageObj(imgObj.scaled);
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
        // NEW patterns
        obj.scaled_image,
        obj.preview_image,
        obj.hero_image,
        obj.photo_image,
        obj.picture,
        obj.pictures,
        obj.visual_media,
        // Nested locations
        obj.listing?.photos,
        obj.listing?.images,
        obj.listing?.image,
        obj.listing?.primary_photo,
        obj.node?.photos,
        obj.node?.images,
        obj.node?.image,
        obj.node?.primary_photo,
        obj.marketplace_listing?.photos,
        obj.marketplace_listing?.images,
        obj.target?.photos,
        obj.target?.images,
        obj.target?.primary_photo,
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

    // ============= RELAXED VALIDATION (v2.1.0) =============
    // More permissive to catch listings with new field names
    function isValidListingObject(obj) {
      if (!obj || typeof obj !== 'object') return false;

      // EXPANDED ID detection - 15+ patterns
      const id = obj.id || obj.listing_id || obj.marketplace_listing_id || 
                 obj.primary_listing_id || obj.story_id || obj.product_id ||
                 obj.item_id || obj.entity_id;
      
      // Also check nested ID patterns Facebook might use now
      const nestedId = obj.node?.id || obj.listing?.id || obj.target?.id || 
                       obj.data?.id || obj.marketplace_listing?.id ||
                       obj.edge?.node?.id || obj.story_node?.id ||
                       obj.item?.id || obj.product?.id;
      
      const finalId = id || nestedId;
      
      if (!finalId || String(finalId).length < 5) return false;

      // Skip obvious non-listing IDs
      const idStr = String(finalId);
      if (idStr.startsWith('m_') || idStr.startsWith('thread_') || 
          idStr.startsWith('msg_') || idStr.startsWith('notif_')) {
        return false;
      }

      // RELAXED: Accept if __typename contains listing-related words
      const typename = obj.__typename || '';
      const typenameLC = typename.toLowerCase();
      if (typenameLC.includes('listing') || typenameLC.includes('marketplace') || 
          typenameLC.includes('product') || typenameLC.includes('item') ||
          typenameLC.includes('feedunit') || typenameLC.includes('seller')) {
        return true;
      }

      // Check for marketplace-specific fields
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
        obj.primary_listing_photo,
        obj.listing_state,
        obj.marketplace_listing_state,
        // NEW indicators
        obj.formatted_price,
        obj.current_price,
        obj.sale_price,
        obj.cover_photo,
        obj.primary_photo,
        obj.selling_state,
        obj.is_live,
      ];

      const hasMarketplaceIndicator = marketplaceIndicators.some(Boolean);
      if (hasMarketplaceIndicator) return true;
      
      // RELAXED: Accept if has typical listing structure (ANY of: title, price, images)
      const hasTitle = !!(obj.title || obj.marketplace_listing_title || obj.name || 
                         obj.product_title || obj.item_title || obj.label ||
                         obj.listing?.title || obj.node?.title);
      
      const hasPrice = !!(obj.price || obj.listing_price || obj.amount || 
                         obj.formatted_price || obj.current_price || obj.sale_price ||
                         obj.listing?.price || obj.node?.price);
      
      const hasImage = !!(obj.image || obj.images || obj.photo || obj.photos || 
                         obj.cover_photo || obj.primary_photo || obj.primary_listing_photo ||
                         obj.listing?.photos || obj.node?.photos);

      // Accept if has at least 2 of the 3 signals
      const signalCount = (hasTitle ? 1 : 0) + (hasPrice ? 1 : 0) + (hasImage ? 1 : 0);
      return signalCount >= 2;
    }

    // ============= MAIN EMIT FUNCTION =============
    function maybeEmitListing(obj) {
      try {
        if (!isValidListingObject(obj)) return;

        // EXPANDED ID extraction
        const idRaw =
          obj.marketplace_listing_id ||
          obj.listing_id ||
          obj.id ||
          obj.primary_listing_id ||
          obj.story_id ||
          obj.product_id ||
          obj.item_id ||
          obj.node?.id ||
          obj.listing?.id ||
          obj.target?.id ||
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
          if (listingsSkipped <= 5) {
            console.log(`FB Importer: Skipped ${id.slice(0,15)}... - no title found`);
          }
          return;
        }

        // Skip if title looks like a message or notification
        const titleLower = title.toLowerCase();
        if (titleLower.includes('sent you a message') || 
            titleLower.includes('new message') ||
            titleLower.includes('replied to') ||
            titleLower.includes('notification')) {
          listingsSkipped++;
          return;
        }

        // Price extraction - EXPANDED
        let price = null;
        const priceField =
          obj.listing_price ||
          obj.price ||
          obj.formatted_price ||
          obj.current_price ||
          obj.sale_price ||
          obj.amount ||
          obj.listing?.price ||
          obj.node?.price ||
          obj.node?.listing_price;

        if (priceField) {
          let raw = priceField;
          if (typeof raw === 'object') raw = raw.amount || raw.text || raw.formatted_amount || raw.value || '';
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
          obj.listing?.description,
          obj.node?.description,
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
          obj.listing?.condition,
          obj.node?.condition,
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
          obj.listing?.category,
          obj.node?.category,
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
        const locFields = [obj.location, obj.listing_location, obj.location_text, obj.location_name, obj.listing?.location, obj.node?.location];
        for (const lf of locFields) {
          if (lf) {
            if (typeof lf === 'object') {
              location = extractText(lf.name) || extractText(lf.city) || extractText(lf.reverse_geocode) || extractText(lf.text);
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
          `%cFB Importer: ✓ Captured #${listingsEmitted}:`,
          'color: #10b981; font-weight: bold',
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

    // ============= RECURSIVE WALKER WITH DIAGNOSTICS =============
    function walk(obj, depth) {
      if (!obj || typeof obj !== 'object' || depth > 12) return;
      
      // DIAGNOSTIC: Log first few objects with ID-like fields
      if (diagnosticCandidates < MAX_DIAGNOSTIC && depth < 5) {
        const possibleId = obj.id || obj.listing_id || obj.marketplace_listing_id || 
                           obj.node?.id || obj.primary_listing_id || obj.story_id ||
                           obj.product_id || obj.item_id || obj.entity_id;
        
        if (possibleId && String(possibleId).length > 5) {
          const idStr = String(possibleId);
          // Skip known non-listing patterns
          if (!idStr.startsWith('m_') && !idStr.startsWith('thread_') && !idStr.startsWith('msg_')) {
            diagnosticCandidates++;
            console.log(`%c🔍 FB Importer: DIAGNOSTIC CANDIDATE #${diagnosticCandidates}`, 'color: #f59e0b; font-weight: bold');
            console.log('  Object keys:', Object.keys(obj).slice(0, 25).join(', '));
            console.log('  __typename:', obj.__typename || 'undefined');
            console.log('  ID found:', idStr.slice(0, 20) + '...');
            console.log('  Has title?:', !!(obj.title || obj.marketplace_listing_title || obj.name || obj.node?.title || obj.listing?.title));
            console.log('  Has price?:', !!(obj.price || obj.listing_price || obj.amount || obj.formatted_price));
            console.log('  Has photos?:', !!(obj.photos || obj.images || obj.primary_photo || obj.cover_photo || obj.listing_photos));
            
            // Try to emit this candidate
            maybeEmitListing(obj);
            return; // Don't double-process
          }
        }
      }
      
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
            
            // DIAGNOSTIC: Log response structure for first few responses
            if (responseStructuresLogged < MAX_STRUCTURE_LOGS) {
              responseStructuresLogged++;
              console.log(`%c📦 FB Importer: RESPONSE STRUCTURE #${responseStructuresLogged}`, 'color: #a855f7; font-weight: bold');
              console.log('  Operation:', requestInfo?.operationName || 'unknown');
              console.log('  Top-level keys:', Object.keys(data).slice(0, 15).join(', '));
              
              if (data.data) {
                console.log('  data keys:', Object.keys(data.data).slice(0, 15).join(', '));
                // Look for edges/nodes pattern
                for (const key of Object.keys(data.data)) {
                  const val = data.data[key];
                  if (val && typeof val === 'object') {
                    if (val.edges) {
                      console.log(`  data.${key}.edges:`, Array.isArray(val.edges) ? `[${val.edges.length} items]` : typeof val.edges);
                      if (val.edges[0]?.node) {
                        console.log(`  First node keys:`, Object.keys(val.edges[0].node).slice(0, 15).join(', '));
                        console.log(`  First node __typename:`, val.edges[0].node.__typename);
                      }
                    }
                    if (val.__typename) {
                      console.log(`  data.${key}.__typename:`, val.__typename);
                    }
                  }
                }
              }
            }
            
            walk(data, 0);
          } catch (e) {
            // ignore parse errors
          }
        }
        
        if (parsedCount > 0) {
          console.log(`%cFB Importer: Processed ${parsedCount} response(s). Total captured: ${listingsEmitted}, skipped: ${listingsSkipped}`, 'color: #60a5fa');
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
              return res;
            }
            console.log(`%cFB Importer: ✓ Processing operation: ${operationName}`, 'color: #10b981');
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
    
    console.log(`%c🔧 FB Importer v${VERSION} - DIAGNOSTIC EDITION`, 'color: #10b981; font-weight: bold; font-size: 16px');
    console.log('%c✓ DIAGNOSTIC MODE: Will log response structures', 'color: #f59e0b');
    console.log('%c✓ RELAXED VALIDATION: Accepts 15+ ID patterns', 'color: #60a5fa');
    console.log('%c✓ EXPANDED FIELDS: 40+ image patterns, 30+ title patterns', 'color: #60a5fa');
    console.log('FB Importer: Watching for Marketplace GraphQL requests...');

    // Periodic stats logging
    setInterval(() => {
      if (graphqlResponsesSeen > 0 || listingsEmitted > 0) {
        console.log(`%cFB Importer Stats: ${listingsEmitted} captured, ${listingsSkipped} skipped, ${responsesRejected} rejected, ${graphqlResponsesSeen} total responses seen`, 'color: #888');
      }
    }, 15000);

  } catch (e) {
    console.log('FB Importer: Injection failed', e);
  }
})();
