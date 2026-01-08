// FB Marketplace Lister - Content Script for Product Pages
// Version 1.4.3 - Fixed Best Buy description extraction with 3-tier fallback
(function() {
  'use strict';

  const EXTENSION_VERSION = '1.4.3';

  // Product data extractors for different sites
  const extractors = {
    amazon: {
      match: /amazon\.com/,
      extract: () => {
        const title = document.querySelector('#productTitle')?.textContent?.trim() || 
                      document.querySelector('h1.a-spacing-micro span')?.textContent?.trim() || '';
        
        const priceElement = document.querySelector('.a-price .a-offscreen') ||
                            document.querySelector('#priceblock_ourprice') ||
                            document.querySelector('#priceblock_dealprice') ||
                            document.querySelector('.a-price-whole');
        let price = priceElement?.textContent?.replace(/[^0-9.]/g, '') || '';
        
        const description = document.querySelector('#productDescription p')?.textContent?.trim() ||
                           document.querySelector('#feature-bullets')?.textContent?.trim() || '';
        
        const images = [];
        const mainImage = document.querySelector('#landingImage')?.src ||
                         document.querySelector('#imgBlkFront')?.src;
        if (mainImage) images.push(mainImage);
        
        document.querySelectorAll('.imageThumbnail img, #altImages img').forEach(img => {
          const src = img.src?.replace(/\._.*_\./, '._AC_SL1500_.') || '';
          if (src && !images.includes(src)) images.push(src);
        });

        return { title, price, description, images };
      }
    },
    ebay: {
      match: /ebay\.com/,
      extract: () => {
        const title = document.querySelector('h1.x-item-title__mainTitle span')?.textContent?.trim() ||
                      document.querySelector('h1[itemprop="name"]')?.textContent?.trim() || '';
        
        const priceElement = document.querySelector('.x-price-primary span') ||
                            document.querySelector('#prcIsum') ||
                            document.querySelector('[itemprop="price"]');
        let price = priceElement?.textContent?.replace(/[^0-9.]/g, '') || '';
        
        const description = document.querySelector('#desc_ifr')?.contentDocument?.body?.textContent?.trim() ||
                           document.querySelector('.d-item-description')?.textContent?.trim() || '';
        
        const images = [];
        document.querySelectorAll('#vi_main_img_fs, .ux-image-carousel img').forEach(img => {
          if (img.src && !images.includes(img.src)) images.push(img.src);
        });

        return { title, price, description, images };
      }
    },
    walmart: {
      match: /walmart\.com/,
      extract: () => {
        const title = document.querySelector('h1[itemprop="name"]')?.textContent?.trim() ||
                      document.querySelector('h1.prod-ProductTitle')?.textContent?.trim() || '';
        
        const priceElement = document.querySelector('[itemprop="price"]') ||
                            document.querySelector('.price-characteristic');
        let price = priceElement?.textContent?.replace(/[^0-9.]/g, '') || '';
        
        const description = document.querySelector('.about-desc')?.textContent?.trim() ||
                           document.querySelector('.prod-description')?.textContent?.trim() || '';
        
        const images = [];
        document.querySelectorAll('.hover-zoom-hero-image img, .prod-hero-image img').forEach(img => {
          if (img.src && !images.includes(img.src)) images.push(img.src);
        });

        return { title, price, description, images };
      }
    },
    bestbuy: {
      match: /bestbuy\.com/,
      extract: async () => {
        console.log(`FB Lister v${EXTENSION_VERSION}: Extracting Best Buy product data (async)...`);

        // Normalize Best Buy image URL for consistent deduplication
        function normalizeImageUrl(url) {
          if (!url) return null;
          
          // Remove query params
          let normalized = url.split('?')[0];
          
          // Normalize size params to high-res
          normalized = normalized.replace(/;maxHeight=\d+;maxWidth=\d+/, ';maxHeight=1200;maxWidth=1200');
          
          // If no size params, add them
          if (!normalized.includes(';maxHeight=')) {
            normalized = normalized.replace(/\.jpg$/, ';maxHeight=1200;maxWidth=1200.jpg');
          }
          
          return normalized;
        }

        // Check if URL is a product image (not video thumbnail)
        function isProductImage(url) {
          if (!url) return false;
          
          // Exclude video thumbnails
          if (url.includes('/images/videos/')) return false;
          if (url.includes('/prescaled/')) return false;
          if (url.includes('videoThumbnail')) return false;
          if (url.includes('/video/')) return false;
          
          // Must be from Best Buy's image CDN
          if (!url.includes('pisces.bbystatic.com') && !url.includes('bestbuy.com/images')) {
            return false;
          }
          
          // Prefer product images
          if (url.includes('/images/products/')) return true;
          
          return true;
        }

        // Extract unique ID from image URL for deduplication
        function getImageKey(url) {
          // Extract the product image UUID/filename
          const match = url.match(/\/([a-f0-9-]{20,}|[\w-]+)\.(jpg|png|webp)/i);
          if (match) return match[1].toLowerCase();
          
          // Fallback: use last path segment
          const parts = url.split('/');
          const filename = parts[parts.length - 1].split('?')[0].split(';')[0];
          return filename.toLowerCase();
        }

        // TIER 1: Try to expand collapsed accordions first
        async function expandAccordions() {
          const buttons = document.querySelectorAll('button, [role="button"], [data-testid*="accordion"]');
          let expanded = 0;
          
          for (const btn of buttons) {
            const text = (btn.textContent || '').toLowerCase();
            const ariaExpanded = btn.getAttribute('aria-expanded');
            
            // Only click if it's a features/specs accordion that's collapsed
            if ((text.includes('features') || text.includes('specifications') || text.includes('specs')) 
                && ariaExpanded === 'false') {
              try {
                btn.click();
                expanded++;
                await new Promise(r => setTimeout(r, 300)); // Wait for content to load
              } catch (e) {
                console.log(`FB Lister v${EXTENSION_VERSION}: Could not click accordion`, e);
              }
            }
          }
          
          console.log(`FB Lister v${EXTENSION_VERSION}: Expanded ${expanded} accordions`);
          return expanded;
        }

        // Extract Specifications from DOM - TIER 2: Enhanced selectors
        function extractSpecifications() {
          const specs = [];
          
          // Best Buy specific: Look for spec rows in accordion content
          const bbSpecSelectors = [
            // Accordion-based specs (new Best Buy layout)
            '[class*="accordion"] [class*="specification"] li',
            '[class*="accordion"] dl dt',
            '[data-testid*="spec"] li',
            // Table-based specs
            'table[class*="spec"] tr',
            '[class*="specifications-table"] tr',
            // List-based specs
            '[class*="specifications"] li',
            '[class*="spec-list"] li',
            'ul[class*="spec"] li'
          ];
          
          for (const selector of bbSpecSelectors) {
            const items = document.querySelectorAll(selector);
            if (items.length > 0) {
              items.forEach(item => {
                // Handle table rows
                if (item.tagName === 'TR') {
                  const cells = item.querySelectorAll('td, th');
                  if (cells.length >= 2) {
                    const label = cells[0].textContent?.trim();
                    const value = cells[1].textContent?.trim();
                    if (label && value && label !== value) {
                      specs.push(`${label}: ${value}`);
                    }
                  }
                }
                // Handle dt/dd pairs
                else if (item.tagName === 'DT') {
                  const dd = item.nextElementSibling;
                  if (dd && dd.tagName === 'DD') {
                    specs.push(`${item.textContent?.trim()}: ${dd.textContent?.trim()}`);
                  }
                }
                // Handle list items with label/value structure
                else {
                  const label = item.querySelector('[class*="name"], [class*="label"], .row-title, span:first-child')?.textContent?.trim();
                  const value = item.querySelector('[class*="value"], .row-value, span:last-child')?.textContent?.trim();
                  if (label && value && label !== value) {
                    specs.push(`${label}: ${value}`);
                  } else {
                    // Fallback: check if text contains colon separator
                    const text = item.textContent?.trim();
                    if (text && text.includes(':') && text.length < 200) {
                      specs.push(text);
                    }
                  }
                }
              });
              if (specs.length > 0) break;
            }
          }

          // Fallback: look for any visible text that looks like specs
          if (specs.length === 0) {
            document.querySelectorAll('[class*="spec"], [data-testid*="spec"]').forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.includes(':') && text.length < 300 && text.length > 5) {
                const lines = text.split('\n').filter(l => l.includes(':'));
                lines.forEach(line => {
                  if (line.trim().length > 5 && line.trim().length < 150) {
                    specs.push(line.trim());
                  }
                });
              }
            });
          }

          console.log(`FB Lister v${EXTENSION_VERSION}: Found ${specs.length} specifications`);
          return specs.slice(0, 15); // Limit to 15 key specs
        }

        // Extract Features from DOM - TIER 2: Enhanced selectors
        function extractFeatures() {
          const features = [];
          
          // Best Buy specific: Look for features in accordion content and various containers
          const bbFeatureSelectors = [
            // Accordion-based features (new Best Buy layout)
            '[class*="accordion"] [class*="feature"] li',
            '[data-testid*="feature"] li',
            // Product highlights/bullets
            '[class*="product-description"] li',
            '[class*="long-description"] li',
            '.product-data-value li',
            // Generic feature lists
            '[class*="features"] li',
            '[class*="feature-list"] li',
            '[class*="highlights"] li',
            // About this item sections
            '[class*="about"] li',
            '.about-this-item li'
          ];
          
          for (const selector of bbFeatureSelectors) {
            const items = document.querySelectorAll(selector);
            if (items.length > 0) {
              items.forEach(item => {
                const text = item.textContent?.trim();
                if (text && text.length > 10 && text.length < 500) {
                  // Avoid duplicates
                  if (!features.some(f => f === text)) {
                    features.push(text);
                  }
                }
              });
              if (features.length > 0) break;
            }
          }

          // Fallback: look for any descriptive paragraphs
          if (features.length === 0) {
            const paraSelectors = [
              '[class*="product-description"] p',
              '[class*="long-description"] p',
              '[class*="features"] p',
              '.shop-product-description p'
            ];
            for (const selector of paraSelectors) {
              document.querySelectorAll(selector).forEach(p => {
                const text = p.textContent?.trim();
                if (text && text.length > 20 && text.length < 600) {
                  features.push(text);
                }
              });
              if (features.length > 0) break;
            }
          }

          console.log(`FB Lister v${EXTENSION_VERSION}: Found ${features.length} features`);
          return features.slice(0, 8); // Limit to 8 key features
        }

        // TIER 3: Get meta description as guaranteed fallback
        function getMetaDescription() {
          const metaDesc = 
            document.querySelector('meta[name="description"]')?.getAttribute('content') ||
            document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
            '';
          console.log(`FB Lister v${EXTENSION_VERSION}: Meta description length: ${metaDesc.length}`);
          return metaDesc.trim();
        }

        // Collect and deduplicate images
        function collectImages(jsonLdImages) {
          const imageMap = new Map(); // key -> normalized URL
          
          // Add JSON-LD images first (higher priority)
          if (Array.isArray(jsonLdImages)) {
            jsonLdImages.forEach(url => {
              if (isProductImage(url)) {
                const normalized = normalizeImageUrl(url);
                const key = getImageKey(url);
                if (normalized && key && !imageMap.has(key)) {
                  imageMap.set(key, normalized);
                }
              }
            });
          }
          
          // Add DOM gallery images
          document.querySelectorAll('img[src*="pisces.bbystatic.com"], img[src*="bestbuy.com/images"]').forEach(img => {
            const src = img.src || '';
            if (isProductImage(src)) {
              const normalized = normalizeImageUrl(src);
              const key = getImageKey(src);
              if (normalized && key && !imageMap.has(key)) {
                imageMap.set(key, normalized);
              }
            }
          });
          
          // Also check data-src for lazy-loaded images
          document.querySelectorAll('img[data-src*="pisces.bbystatic.com"]').forEach(img => {
            const src = img.getAttribute('data-src') || '';
            if (isProductImage(src)) {
              const normalized = normalizeImageUrl(src);
              const key = getImageKey(src);
              if (normalized && key && !imageMap.has(key)) {
                imageMap.set(key, normalized);
              }
            }
          });
          
          const images = Array.from(imageMap.values()).slice(0, 10);
          console.log(`FB Lister v${EXTENSION_VERSION}: Collected ${images.length} unique product images`);
          return images;
        }

        // TIER 1: First try to expand accordions to reveal Features/Specs content
        await expandAccordions();

        // Prefer JSON-LD (much more stable than DOM selectors on BestBuy)
        const jsonLdResult = await (async () => {
          try {
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            const nodes = [];

            const pushNode = (n) => {
              if (!n) return;
              if (Array.isArray(n)) return n.forEach(pushNode);
              if (typeof n !== 'object') return;
              if (n['@graph']) return pushNode(n['@graph']);
              nodes.push(n);
            };

            for (const s of scripts) {
              if (!s.textContent) continue;
              pushNode(JSON.parse(s.textContent));
            }

            const productNode = nodes.find((n) => {
              const t = n['@type'];
              return t === 'Product' || (Array.isArray(t) && t.includes('Product'));
            });

            if (!productNode) return null;

            const title = (productNode.name || '').toString().trim();
            const jsonLdDescription = (productNode.description || '').toString().trim();

            const offers = productNode.offers;
            const offer = Array.isArray(offers) ? offers[0] : offers;
            const rawPrice = offer?.price ?? offer?.lowPrice ?? '';
            const price = rawPrice ? String(rawPrice).replace(/[^0-9.]/g, '') : '';

            // Get JSON-LD images for combining with DOM images
            let jsonLdImages = [];
            if (Array.isArray(productNode.image)) jsonLdImages = productNode.image;
            else if (typeof productNode.image === 'string') jsonLdImages = [productNode.image];

            // Collect and dedupe all images
            const images = collectImages(jsonLdImages);

            if (!title) return null;

            // Now enhance description with DOM-scraped specs and features
            const specs = extractSpecifications();
            const features = extractFeatures();
            
            let description = '';
            let descSource = 'none';
            
            // Start with JSON-LD description if available
            if (jsonLdDescription) {
              description = jsonLdDescription + '\n\n';
              descSource = 'jsonld';
            }
            
            // Add features section
            if (features.length > 0) {
              description += 'FEATURES:\n';
              features.forEach(f => {
                description += `• ${f}\n`;
              });
              description += '\n';
              descSource = descSource === 'jsonld' ? 'jsonld+dom' : 'dom';
            }
            
            // Add specifications section
            if (specs.length > 0) {
              description += 'SPECIFICATIONS:\n';
              specs.forEach(s => {
                description += `• ${s}\n`;
              });
              descSource = descSource.includes('dom') ? descSource : (descSource === 'jsonld' ? 'jsonld+dom' : 'dom');
            }
            
            description = description.trim();
            
            // TIER 3: If description is still empty or very short, use meta fallback
            if (description.length < 50) {
              const metaDesc = getMetaDescription();
              if (metaDesc) {
                description = metaDesc;
                descSource = 'meta';
                console.log(`FB Lister v${EXTENSION_VERSION}: Using meta description fallback`);
              }
            }
            
            // Limit to ~2000 chars for FB Marketplace
            if (description.length > 2000) {
              description = description.substring(0, 1997) + '...';
            }

            console.log(`FB Lister v${EXTENSION_VERSION}: BestBuy extracted`, {
              title,
              price,
              descriptionLen: description.length,
              descSource,
              images: images.length,
              specsCount: specs.length,
              featuresCount: features.length
            });

            return { title, price, description, images };
          } catch (e) {
            console.error(`FB Lister v${EXTENSION_VERSION}: JSON-LD parsing failed`, e);
            return null;
          }
        })();

        if (jsonLdResult) return jsonLdResult;

        // Fallback DOM scraping (older BestBuy layouts)
        console.log(`FB Lister v${EXTENSION_VERSION}: JSON-LD not found, falling back to DOM scraping`);
        
        const title = document.querySelector('h1.heading-5, h1[class*="heading"]')?.textContent?.trim() ||
                      document.querySelector('h1')?.textContent?.trim() || '';

        // Price - look for the main price display (usually contains $ sign)
        let price = '';
        const priceContainers = document.querySelectorAll('[class*="price"], [data-testid*="price"]');
        for (const container of priceContainers) {
          const text = container.textContent || '';
          const match = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
          if (match) {
            price = match[1].replace(',', '');
            break;
          }
        }

        // Description - combine specs and features
        const specs = extractSpecifications();
        const features = extractFeatures();
        
        let description = '';
        if (features.length > 0) {
          description += 'FEATURES:\n';
          features.forEach(f => {
            description += `• ${f}\n`;
          });
          description += '\n';
        }
        if (specs.length > 0) {
          description += 'SPECIFICATIONS:\n';
          specs.forEach(s => {
            description += `• ${s}\n`;
          });
        }
        description = description.trim();
        
        // TIER 3: If description is still empty, use meta fallback
        if (description.length < 50) {
          const metaDesc = getMetaDescription();
          if (metaDesc) {
            description = metaDesc;
            console.log(`FB Lister v${EXTENSION_VERSION}: DOM fallback using meta description`);
          }
        }
        
        if (description.length > 2000) {
          description = description.substring(0, 1997) + '...';
        }

        // Collect images with deduplication
        const images = collectImages([]);

        console.log(`FB Lister v${EXTENSION_VERSION}: BestBuy DOM fallback extracted`, {
          title,
          price,
          descriptionLen: description.length,
          images: images.length,
          specsCount: specs.length,
          featuresCount: features.length
        });

        return { title, price, description, images };
      }
    },
    target: {
      match: /target\.com/,
      extract: () => {
        const title = document.querySelector('[data-test="product-title"]')?.textContent?.trim() ||
                      document.querySelector('h1')?.textContent?.trim() || '';
        
        const priceElement = document.querySelector('[data-test="product-price"]') ||
                            document.querySelector('.styles__CurrentPriceFontSize');
        let price = priceElement?.textContent?.replace(/[^0-9.]/g, '') || '';
        
        const description = document.querySelector('[data-test="item-details-description"]')?.textContent?.trim() || '';
        
        const images = [];
        document.querySelectorAll('[data-test="image-gallery-image-0"] img, .slideDeckPicture img').forEach(img => {
          if (img.src && !images.includes(img.src)) images.push(img.src);
        });

        return { title, price, description, images };
      }
    }
  };

  // Format title for Facebook Marketplace (65-75 chars optimal, max 100)
  function formatTitle(title) {
    if (title.length <= 75) return title;
    
    // Remove common unnecessary words
    let formatted = title
      .replace(/\s*\([^)]*\)\s*/g, ' ')  // Remove parenthetical info
      .replace(/\s*-\s*Amazon.*$/i, '')   // Remove "- Amazon" suffix
      .replace(/\s+/g, ' ')               // Normalize spaces
      .trim();
    
    if (formatted.length <= 75) return formatted;
    
    // Truncate to 72 chars and add ellipsis
    return formatted.substring(0, 72).trim() + '...';
  }

  // Calculate marketplace price (halved)
  function calculateMarketplacePrice(price) {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) return '';
    return Math.round(numPrice / 2).toString();
  }

  // Show diagnostic toast on the page
  function showDiagnosticToast(data, success = true) {
    // Remove any existing toast
    const existing = document.querySelector('#fb-lister-diagnostic-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'fb-lister-diagnostic-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 999999;
      background: ${success ? '#1e7e34' : '#bd2130'};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 320px;
      line-height: 1.5;
    `;

    const titlePreview = data.title ? 
      (data.title.length > 40 ? data.title.substring(0, 40) + '...' : data.title) : 
      '(none)';

    toast.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">
        FB Lister v${EXTENSION_VERSION} - ${success ? 'Captured!' : 'Error'}
      </div>
      <div style="opacity: 0.9;">
        <div>✓ Title: ${data.title ? 'yes' : 'NO'}</div>
        <div>✓ Price: ${data.originalPrice || '(none)'} → ${data.price || '(none)'}</div>
        <div>✓ Description: ${data.description ? data.description.length + ' chars' : '(none)'}</div>
        <div>✓ Images: ${data.images ? data.images.length : 0}</div>
      </div>
      <div style="margin-top: 8px; font-size: 11px; opacity: 0.7;">
        "${titlePreview}"
      </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 6 seconds
    setTimeout(() => toast.remove(), 6000);
  }

  // Create floating action button
  function createFloatingButton() {
    if (document.querySelector('#fb-lister-button')) return;

    const button = document.createElement('button');
    button.id = 'fb-lister-button';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
      </svg>
      Copy to Facebook
    `;
    button.className = 'fb-lister-floating-btn';
    
    button.addEventListener('click', handleCopyClick);
    document.body.appendChild(button);
  }

  // Handle copy button click
  async function handleCopyClick() {
    const button = document.querySelector('#fb-lister-button');
    button.classList.add('loading');
    button.innerHTML = 'Copying...';

    try {
      // Find matching extractor
      let productData = null;
      for (const [site, extractor] of Object.entries(extractors)) {
        if (extractor.match.test(window.location.href)) {
          // Handle both sync and async extractors
          productData = await Promise.resolve(extractor.extract());
          break;
        }
      }

      if (!productData || !productData.title) {
        throw new Error('Could not extract product data');
      }

      // Format data for marketplace
      const marketplaceData = {
        title: formatTitle(productData.title),
        originalTitle: productData.title,
        price: calculateMarketplacePrice(productData.price),
        originalPrice: productData.price,
        description: productData.description,
        images: productData.images,
        sourceUrl: window.location.href,
        copiedAt: new Date().toISOString(),
        extensionVersion: EXTENSION_VERSION
      };

      // Store in Chrome storage
      await chrome.storage.local.set({ pendingListing: marketplaceData });

      // Also store debug info
      await chrome.storage.local.set({ 
        lastScrapeDebug: {
          ...marketplaceData,
          scrapedAt: new Date().toISOString(),
          url: window.location.href
        }
      });

      // Show diagnostic toast
      showDiagnosticToast(marketplaceData, true);

      // Open Facebook Marketplace create page using chrome.tabs API (avoids popup blocker)
      chrome.runtime.sendMessage({ 
        action: 'openMarketplace', 
        url: 'https://www.facebook.com/marketplace/create/item' 
      });

      button.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Copied!
      `;
      button.classList.remove('loading');
      button.classList.add('success');

      setTimeout(() => {
        button.classList.remove('success');
        button.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
          </svg>
          Copy to Facebook
        `;
      }, 3000);

    } catch (error) {
      showDiagnosticToast({ title: '', price: '', description: '', images: [] }, false);
      
      button.innerHTML = 'Error - Try Again';
      button.classList.remove('loading');
      button.classList.add('error');
      console.error('FB Lister Error:', error);

      setTimeout(() => {
        button.classList.remove('error');
        button.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
          </svg>
          Copy to Facebook
        `;
      }, 3000);
    }
  }

  // Initialize on product pages
  function init() {
    // Check if we're on a product page
    const isProductPage = extractors.amazon.match.test(window.location.href) ||
                         extractors.ebay.match.test(window.location.href) ||
                         extractors.walmart.match.test(window.location.href) ||
                         extractors.bestbuy.match.test(window.location.href) ||
                         extractors.target.match.test(window.location.href);

    if (isProductPage) {
      // Wait for page to load
      setTimeout(createFloatingButton, 1500);
    }
  }

  // Run on page load and navigation
  init();
  
  // Handle SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 1000);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
