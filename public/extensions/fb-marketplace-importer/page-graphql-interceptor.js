// FB Marketplace Importer - Page Context GraphQL Interceptor
// Version 3.1.0 - FIXED EXTRACTION EDITION
// Key fixes:
// - Support for webp/png image formats
// - Fixed pushUrl to accept all image formats
// - Better image URL validation
(function () {
  try {
    if (window.__fbImporterInjected) return;
    window.__fbImporterInjected = true;

    const VERSION = '3.1.0';

    // Diagnostic counters
    let graphqlResponsesSeen = 0;
    let listingsEmitted = 0;
    let listingsSkipped = 0;
    let responsesAccepted = 0;
    let responsesRejected = 0;

    // Track listing IDs for enrichment
    const seenListingIds = new Set();
    let enrichmentMode = false;
    let enrichmentTargetId = null;

    // ============= OPERATION NAME WHITELIST =============
    const ALLOWED_OPERATIONS = [
      'CometMarketplaceSellingInventoryPaginationQuery',
      'CometMarketplaceSellingInventoryQuery',
      'MarketplaceSellingInventoryQuery',
      'MarketplaceSellingInventoryPaginationQuery',
      'MarketplaceSellingInventoryStatsQuery',
      'CometMarketplaceBuyerListingQuery',
      'MarketplaceListingQuery',
      'CometMarketplaceListingQuery',
      'MarketplaceSellerHomeQuery',
      'CometMarketplaceSellerHomeQuery',
      'MarketplaceCategoryFeedQuery',
      // Detail page queries
      'CometMarketplaceItemDetailRootQuery',
      'MarketplaceItemDetailQuery',
      'CometMarketplacePDPRootQuery',
      'MarketplacePDPQuery',
    ];

    const OPERATION_KEYWORDS = [
      'MarketplaceSelling',
      'MarketplaceListing',
      'marketplace_listing',
      'seller_listing',
      'your_listings',
      'SellerHome',
      'MarketplaceItem',
      'ItemDetail',
      'PDP',
    ];

    function cleanJsonText(t) {
      if (!t) return '';
      const s = String(t);
      if (s.startsWith('for(;;);')) {
        return s.slice(8);
      }
      return s;
    }

    function pushUrl(arr, u) {
      if (!u || typeof u !== 'string') return;
      if (!u.startsWith('http')) return;
      if (!u.includes('fbcdn') && !u.includes('facebook') && !u.includes('fbsbx') && !u.includes('scontent')) return;
      // v3.1.0: Accept all common image formats
      if (!u.match(/\.(jpg|jpeg|png|webp|gif)(\?|$|\\)/i)) return;
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
        const dataStr = JSON.stringify(data).substring(0, 10000);
        
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
          'marketplace_product',
          'listing_id',
          'product_item',
          // Detail page signals
          'listing_photos',
          'all_photos',
          'photo_gallery',
          'marketplace_listing_photos',
        ];

        for (const signal of marketplaceSignals) {
          if (dataStr.includes(signal)) {
            return true;
          }
        }

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

        return true;
      } catch (e) {
        return true;
      }
    }

    // ============= ENHANCED TITLE EXTRACTION =============
    function findTitle(obj) {
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
        obj.formatted_title,
        obj.text_title,
        obj.item_name,
        obj.display_title,
      ];

      for (const field of directFields) {
        const txt = extractText(field);
        if (txt && txt.length > 2 && txt.length < 300) return txt;
      }

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
        obj.data?.node?.title,
        obj.data?.marketplace_listing?.title,
        obj.data?.listing?.title,
        obj.story_node?.title,
        obj.feed_unit?.title,
      ];

      for (const field of nestedPaths) {
        const txt = extractText(field);
        if (txt && txt.length > 2 && txt.length < 300) return txt;
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
      
      return 'active';
    }

    // ============= DEEP IMAGE EXTRACTION (v3.0.0) =============
    // Recursively finds ALL image URLs in any object structure
    function extractAllImagesDeep(obj, images = [], depth = 0) {
      if (!obj || typeof obj !== 'object' || depth > 15) return images;
      
      // Check for direct image URL fields
      const urlFields = ['uri', 'url', 'src', 'image_uri', 'source', 'original_uri', 
                         'full_size_uri', 'large_uri', 'medium_uri', 'scaled_uri', 
                         'preview_uri', 'image', 'photo', 'picture', 'full_image',
                         'large_image', 'listing_image', 'product_image'];
      
      for (const field of urlFields) {
        if (obj[field] && typeof obj[field] === 'string') {
          pushUrl(images, obj[field]);
        }
      }
      
      // Recurse into arrays
      if (Array.isArray(obj)) {
        for (const item of obj) {
          extractAllImagesDeep(item, images, depth + 1);
        }
        return images;
      }
      
      // Recurse into objects
      for (const key in obj) {
        const val = obj[key];
        if (!val) continue;
        
        // Special handling for edges/nodes pattern
        if (key === 'edges' && Array.isArray(val)) {
          for (const edge of val) {
            extractAllImagesDeep(edge, images, depth + 1);
            if (edge?.node) extractAllImagesDeep(edge.node, images, depth + 1);
          }
        } else if (typeof val === 'object') {
          extractAllImagesDeep(val, images, depth + 1);
        }
      }
      
      return images;
    }

    // Targeted extraction for common FB structures
    function extractAllImages(obj) {
      const images = [];
      
      // Top-level photo arrays
      const photoArrayFields = [
        'photos', 'images', 'listing_photos', 'all_photos', 'photo_set', 
        'media', 'attachments', 'gallery', 'media_set', 'listing_images',
        'product_images', 'marketplace_listing_photos', 'thumbnails', 'pictures',
      ];
      
      for (const field of photoArrayFields) {
        const arr = obj[field] || obj.listing?.[field] || obj.node?.[field] || 
                    obj.marketplace_listing?.[field] || obj.target?.[field];
        if (arr) {
          extractAllImagesDeep(arr, images);
        }
      }
      
      // Single photo fields
      const singlePhotoFields = [
        'image', 'photo', 'primary_photo', 'cover_photo', 'thumbnail',
        'primary_listing_photo', 'scaled_image', 'preview_image', 'hero_image',
        'picture', 'visual_media',
      ];
      
      for (const field of singlePhotoFields) {
        const photo = obj[field] || obj.listing?.[field] || obj.node?.[field] ||
                      obj.marketplace_listing?.[field] || obj.target?.[field];
        if (photo) {
          extractAllImagesDeep(photo, images);
        }
      }
      
      // If still no images, do a deep search of the entire object
      if (images.length === 0) {
        extractAllImagesDeep(obj, images);
      }
      
      return images;
    }

    // ============= VALIDATION =============
    function isValidListingObject(obj) {
      if (!obj || typeof obj !== 'object') return false;

      const id = obj.id || obj.listing_id || obj.marketplace_listing_id || 
                 obj.primary_listing_id || obj.story_id || obj.product_id ||
                 obj.item_id || obj.entity_id;
      
      const nestedId = obj.node?.id || obj.listing?.id || obj.target?.id || 
                       obj.data?.id || obj.marketplace_listing?.id ||
                       obj.edge?.node?.id || obj.story_node?.id ||
                       obj.item?.id || obj.product?.id;
      
      const finalId = id || nestedId;
      
      if (!finalId || String(finalId).length < 5) return false;

      const idStr = String(finalId);
      if (idStr.startsWith('m_') || idStr.startsWith('thread_') || 
          idStr.startsWith('msg_') || idStr.startsWith('notif_')) {
        return false;
      }

      const typename = obj.__typename || '';
      const typenameLC = typename.toLowerCase();
      if (typenameLC.includes('listing') || typenameLC.includes('marketplace') || 
          typenameLC.includes('product') || typenameLC.includes('item') ||
          typenameLC.includes('feedunit') || typenameLC.includes('seller')) {
        return true;
      }

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
        obj.formatted_price,
        obj.current_price,
        obj.sale_price,
        obj.cover_photo,
        obj.primary_photo,
        obj.selling_state,
        obj.is_live,
      ];

      if (marketplaceIndicators.some(Boolean)) return true;
      
      const hasTitle = !!(obj.title || obj.marketplace_listing_title || obj.name || 
                         obj.product_title || obj.item_title || obj.label ||
                         obj.listing?.title || obj.node?.title);
      
      const hasPrice = !!(obj.price || obj.listing_price || obj.amount || 
                         obj.formatted_price || obj.current_price || obj.sale_price ||
                         obj.listing?.price || obj.node?.price);
      
      const hasImage = !!(obj.image || obj.images || obj.photo || obj.photos || 
                         obj.cover_photo || obj.primary_photo || obj.primary_listing_photo ||
                         obj.listing?.photos || obj.node?.photos);

      const signalCount = (hasTitle ? 1 : 0) + (hasPrice ? 1 : 0) + (hasImage ? 1 : 0);
      return signalCount >= 2;
    }

    // ============= MAIN EMIT FUNCTION =============
    function maybeEmitListing(obj, isDetailPage = false) {
      try {
        if (!isValidListingObject(obj)) return;

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

        if (id.startsWith('m_') || id.startsWith('thread_') || id.startsWith('msg_')) {
          listingsSkipped++;
          return;
        }

        // For feed scanning, just capture basic info
        if (!isDetailPage && seenListingIds.has(id)) {
          return;
        }

        const title = findTitle(obj);

        if (!title) {
          listingsSkipped++;
          return;
        }

        const titleLower = title.toLowerCase();
        if (titleLower.includes('sent you a message') || 
            titleLower.includes('new message') ||
            titleLower.includes('replied to') ||
            titleLower.includes('notification')) {
          listingsSkipped++;
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

        // Images - DEEP extraction for ALL photos
        const images = extractAllImages(obj);

        const status = extractStatus(obj);

        seenListingIds.add(id);
        listingsEmitted++;
        
        const payload = {
          facebook_id: id,
          title: title.slice(0, 255),
          price: Number.isFinite(price) ? price : null,
          description: description.slice(0, 5000) || null,
          condition: condition || null,
          category: category || null,
          location: location || null,
          images: images.slice(0, 30), // Allow more images
          listing_url: 'https://www.facebook.com/marketplace/item/' + id,
          status: status,
          imported_at: new Date().toISOString(),
          is_enriched: isDetailPage,
          image_count: images.length,
        };

        window.postMessage(
          {
            source: 'fb-importer',
            type: isDetailPage ? 'ENRICHED_LISTING' : 'LISTING',
            payload: payload,
          },
          '*'
        );

        const logStyle = isDetailPage ? 'color: #10b981; font-weight: bold' : 'color: #60a5fa';
        console.log(
          `%cFB Importer: ${isDetailPage ? '✓ ENRICHED' : '📋 Found'} #${listingsEmitted}:`,
          logStyle,
          id.slice(0, 12),
          `"${title.slice(0, 30)}..."`,
          `($${price || '?'})`,
          `[${images.length} imgs]`
        );
      } catch (e) {
        // ignore
      }
    }

    // ============= RECURSIVE WALKER =============
    function walk(obj, depth, isDetailPage = false) {
      if (!obj || typeof obj !== 'object' || depth > 15) return;
      
      maybeEmitListing(obj, isDetailPage);

      if (Array.isArray(obj)) {
        for (const it of obj) walk(it, depth + 1, isDetailPage);
      } else {
        for (const k in obj) {
          if (k === 'extensions' || k === 'errors' || k === '__typename') continue;
          walk(obj[k], depth + 1, isDetailPage);
        }
      }
    }

    // ============= PARSE AND VALIDATE RESPONSE =============
    function parseAndWalk(text, requestInfo) {
      try {
        const cleaned = cleanJsonText(text);
        if (!cleaned) return;

        // Check if this is a detail page request
        const isDetailPage = requestInfo?.url?.includes('/item/') || 
                            requestInfo?.operationName?.includes('ItemDetail') ||
                            requestInfo?.operationName?.includes('PDP');

        const parts = cleaned.split('\n');
        let parsedCount = 0;
        
        for (const p of parts) {
          const s = cleanJsonText(p).trim();
          if (!s) continue;
          if (!s.startsWith('{') && !s.startsWith('[')) continue;

          try {
            const data = JSON.parse(s);
            
            if (!isMarketplaceOperation(data)) {
              continue;
            }

            responsesAccepted++;
            parsedCount++;
            
            walk(data, 0, isDetailPage);
          } catch (e) {
            // ignore parse errors
          }
        }
        
        if (parsedCount > 0) {
          console.log(`%cFB Importer: Processed ${parsedCount} response(s). Total: ${listingsEmitted} listings`, 'color: #60a5fa');
        }
      } catch (e) {
        // ignore
      }
    }

    // ============= FETCH INTERCEPTOR =============
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const url = (args[0] instanceof Request) ? args[0].url : String(args[0]);
        if (url.includes('graphql')) {
          graphqlResponsesSeen++;
          const clone = response.clone();
          clone.text().then((t) => parseAndWalk(t, { url })).catch(() => {});
        }
      } catch (e) {}
      return response;
    };

    // ============= XHR INTERCEPTOR =============
    const XHR = XMLHttpRequest.prototype;
    const origOpen = XHR.open;
    const origSend = XHR.send;

    XHR.open = function (method, url) {
      this._fbImporterUrl = url;
      return origOpen.apply(this, arguments);
    };

    XHR.send = function (body) {
      this.addEventListener('load', function () {
        try {
          const url = this._fbImporterUrl || '';
          if (url.includes('graphql')) {
            graphqlResponsesSeen++;
            parseAndWalk(this.responseText, { url });
          }
        } catch (e) {}
      });
      return origSend.apply(this, arguments);
    };

    // ============= LISTEN FOR COMMANDS FROM CONTENT SCRIPT =============
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      const msg = event.data;
      if (!msg || msg.source !== 'fb-importer-command') return;
      
      if (msg.type === 'GET_STATS') {
        window.postMessage({
          source: 'fb-importer',
          type: 'STATS',
          payload: {
            seen: graphqlResponsesSeen,
            emitted: listingsEmitted,
            skipped: listingsSkipped,
            accepted: responsesAccepted,
            rejected: responsesRejected,
          }
        }, '*');
      }
      
      if (msg.type === 'CLEAR_SEEN') {
        seenListingIds.clear();
        listingsEmitted = 0;
        listingsSkipped = 0;
        console.log('FB Importer: Cleared seen listings');
      }
    });

    // Ready signal
    window.postMessage({ source: 'fb-importer', type: 'READY', version: VERSION }, '*');
    console.log(`%c📦 FB Importer Interceptor v${VERSION} initialized`, 'color: #10b981; font-weight: bold; font-size: 14px');
    console.log('%c🔍 FULL ENRICHMENT MODE: Will capture ALL photos from each listing', 'color: #f59e0b; font-weight: bold');

  } catch (e) {
    console.error('FB Importer: Interceptor initialization error:', e);
  }
})();
