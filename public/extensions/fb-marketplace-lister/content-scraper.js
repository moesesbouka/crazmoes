// FB Marketplace Lister - Content Script for Product Pages
// Version 1.4.4 - Best Buy: Tab/accordion interaction + Features/Specs ONLY (no meta fallback)
(function() {
  'use strict';

  const EXTENSION_VERSION = '1.4.4';

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
        console.log(`FB Lister v${EXTENSION_VERSION}: Extracting Best Buy product data...`);

        // ===== BEST BUY TAB INTERACTION =====
        
        // Click a Best Buy tab by name and wait for content to load
        async function openBestBuyTab(tabName) {
          console.log(`FB Lister v${EXTENSION_VERSION}: Looking for "${tabName}" tab...`);
          
          // Find all tab-like elements
          const tabSelectors = [
            '[role="tab"]',
            'button[class*="tab"]',
            'a[class*="tab"]',
            '[data-testid*="tab"]',
            '.shop-product-tabs button',
            '.tab-list button',
            '.tabs button',
            'nav[aria-label*="product"] button',
            'nav[aria-label*="product"] a'
          ];
          
          for (const selector of tabSelectors) {
            const tabs = document.querySelectorAll(selector);
            for (const tab of tabs) {
              const text = (tab.textContent || '').toLowerCase().trim();
              if (text.includes(tabName.toLowerCase())) {
                const isSelected = tab.getAttribute('aria-selected') === 'true' || 
                                   tab.classList.contains('active') ||
                                   tab.classList.contains('selected');
                
                if (!isSelected) {
                  console.log(`FB Lister v${EXTENSION_VERSION}: Clicking "${tabName}" tab`);
                  tab.click();
                  await new Promise(r => setTimeout(r, 800)); // Wait for content
                } else {
                  console.log(`FB Lister v${EXTENSION_VERSION}: "${tabName}" tab already selected`);
                }
                return true;
              }
            }
          }
          
          console.log(`FB Lister v${EXTENSION_VERSION}: "${tabName}" tab not found`);
          return false;
        }

        // Expand accordions within a container
        async function expandAccordionsIn(container, keywords) {
          if (!container) container = document;
          let expanded = 0;
          
          const buttons = container.querySelectorAll('button, [role="button"], [data-testid*="accordion"], [class*="accordion"] > *:first-child');
          
          for (const btn of buttons) {
            const text = (btn.textContent || '').toLowerCase();
            const matchesKeyword = keywords.some(kw => text.includes(kw.toLowerCase()));
            const ariaExpanded = btn.getAttribute('aria-expanded');
            
            if (matchesKeyword && ariaExpanded === 'false') {
              try {
                btn.click();
                expanded++;
                await new Promise(r => setTimeout(r, 400));
              } catch (e) {
                console.log(`FB Lister v${EXTENSION_VERSION}: Could not click accordion`, e);
              }
            }
          }
          
          console.log(`FB Lister v${EXTENSION_VERSION}: Expanded ${expanded} accordions for keywords: ${keywords.join(', ')}`);
          return expanded;
        }

        // Get the active tab panel content
        function getActiveTabPanel() {
          // Look for visible tab panels
          const panelSelectors = [
            '[role="tabpanel"]:not([hidden])',
            '[role="tabpanel"][aria-hidden="false"]',
            '.tab-panel:not(.hidden)',
            '[class*="tabpanel"]:not([hidden])',
            '.shop-product-description'
          ];
          
          for (const selector of panelSelectors) {
            const panel = document.querySelector(selector);
            if (panel && panel.offsetHeight > 0) {
              return panel;
            }
          }
          return document;
        }

        // ===== SPECIFICATIONS EXTRACTION =====
        
        function extractSpecificationsFrom(container) {
          if (!container) container = document;
          const specs = [];
          const seen = new Set();
          
          const addSpec = (label, value) => {
            if (!label || !value) return;
            label = label.trim().replace(/\s+/g, ' ');
            value = value.trim().replace(/\s+/g, ' ');
            if (label === value) return;
            if (label.length > 100 || value.length > 200) return;
            
            const key = `${label}:${value}`.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            
            specs.push(`${label}: ${value}`);
          };
          
          // Method 1: dl/dt/dd pairs
          container.querySelectorAll('dl').forEach(dl => {
            const dts = dl.querySelectorAll('dt');
            const dds = dl.querySelectorAll('dd');
            dts.forEach((dt, i) => {
              if (dds[i]) {
                addSpec(dt.textContent, dds[i].textContent);
              }
            });
          });
          
          // Method 2: Table rows (th/td or td/td)
          container.querySelectorAll('table tr').forEach(tr => {
            const cells = tr.querySelectorAll('td, th');
            if (cells.length >= 2) {
              addSpec(cells[0].textContent, cells[1].textContent);
            }
          });
          
          // Method 3: Two-column div/span layouts (common on Best Buy)
          container.querySelectorAll('[class*="spec"] > div, [class*="specification"] > div, [class*="row"]').forEach(row => {
            const children = row.children;
            if (children.length >= 2) {
              const label = children[0].textContent?.trim();
              const value = children[1].textContent?.trim();
              addSpec(label, value);
            }
          });
          
          // Method 4: List items with label:value structure
          container.querySelectorAll('li').forEach(li => {
            const label = li.querySelector('[class*="name"], [class*="label"], .row-title, span:first-child, strong, b')?.textContent?.trim();
            const value = li.querySelector('[class*="value"], .row-value, span:last-child:not(:first-child)')?.textContent?.trim();
            if (label && value && label !== value) {
              addSpec(label, value);
            }
          });
          
          // Method 5: Parse text containing colons
          container.querySelectorAll('[class*="spec"], [data-testid*="spec"]').forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.includes(':') && text.length < 300) {
              const lines = text.split('\n');
              lines.forEach(line => {
                const colonIdx = line.indexOf(':');
                if (colonIdx > 0 && colonIdx < 80) {
                  const label = line.substring(0, colonIdx).trim();
                  const value = line.substring(colonIdx + 1).trim();
                  addSpec(label, value);
                }
              });
            }
          });
          
          console.log(`FB Lister v${EXTENSION_VERSION}: Extracted ${specs.length} specifications`);
          return specs.slice(0, 25); // Cap at 25
        }

        // ===== FEATURES EXTRACTION =====
        
        function extractFeaturesFrom(container) {
          if (!container) container = document;
          const features = [];
          const seen = new Set();
          
          const addFeature = (text) => {
            if (!text) return;
            text = text.trim().replace(/\s+/g, ' ');
            if (text.length < 15 || text.length > 400) return;
            
            // Skip navigation/boilerplate
            const skipPatterns = [
              /^see all/i, /^learn more/i, /^view/i, /^click/i,
              /^add to/i, /^buy now/i, /^save/i, /^\$/
            ];
            if (skipPatterns.some(p => p.test(text))) return;
            
            const key = text.toLowerCase().substring(0, 50);
            if (seen.has(key)) return;
            seen.add(key);
            
            features.push(text);
          };
          
          // Method 1: Bullet lists (li elements)
          const listSelectors = [
            '[class*="feature"] li',
            '[class*="highlight"] li',
            '[class*="about"] li',
            '.product-description li',
            '[class*="long-description"] li',
            '.product-data-value li'
          ];
          
          for (const selector of listSelectors) {
            container.querySelectorAll(selector).forEach(li => {
              addFeature(li.textContent);
            });
            if (features.length > 0) break;
          }
          
          // Method 2: Paragraphs in feature sections
          if (features.length === 0) {
            const paraSelectors = [
              '[class*="feature"] p',
              '[class*="description"] p',
              '[class*="about"] p'
            ];
            for (const selector of paraSelectors) {
              container.querySelectorAll(selector).forEach(p => {
                addFeature(p.textContent);
              });
              if (features.length > 0) break;
            }
          }
          
          console.log(`FB Lister v${EXTENSION_VERSION}: Extracted ${features.length} features`);
          return features.slice(0, 12); // Cap at 12
        }

        // ===== JSON-LD additionalProperty EXTRACTION =====
        
        function extractSpecsFromJsonLd() {
          const specs = [];
          try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
              const data = JSON.parse(script.textContent);
              const products = [];
              
              // Navigate to product nodes
              if (Array.isArray(data)) {
                products.push(...data.filter(d => d['@type'] === 'Product'));
              } else if (data['@graph']) {
                products.push(...data['@graph'].filter(d => d['@type'] === 'Product'));
              } else if (data['@type'] === 'Product') {
                products.push(data);
              }
              
              for (const product of products) {
                if (Array.isArray(product.additionalProperty)) {
                  product.additionalProperty.forEach(prop => {
                    if (prop.name && prop.value) {
                      specs.push(`${prop.name}: ${prop.value}`);
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.log(`FB Lister v${EXTENSION_VERSION}: JSON-LD additionalProperty parsing failed`, e);
          }
          console.log(`FB Lister v${EXTENSION_VERSION}: JSON-LD specs found: ${specs.length}`);
          return specs.slice(0, 20);
        }

        // ===== IMAGE COLLECTION =====
        
        function normalizeImageUrl(url) {
          if (!url) return null;
          let normalized = url.split('?')[0];
          normalized = normalized.replace(/;maxHeight=\d+;maxWidth=\d+/, ';maxHeight=1200;maxWidth=1200');
          if (!normalized.includes(';maxHeight=')) {
            normalized = normalized.replace(/\.jpg$/, ';maxHeight=1200;maxWidth=1200.jpg');
          }
          return normalized;
        }

        function isProductImage(url) {
          if (!url) return false;
          if (url.includes('/images/videos/') || url.includes('/prescaled/') || 
              url.includes('videoThumbnail') || url.includes('/video/')) return false;
          if (!url.includes('pisces.bbystatic.com') && !url.includes('bestbuy.com/images')) return false;
          return true;
        }

        function getImageKey(url) {
          const match = url.match(/\/([a-f0-9-]{20,}|[\w-]+)\.(jpg|png|webp)/i);
          if (match) return match[1].toLowerCase();
          const parts = url.split('/');
          return parts[parts.length - 1].split('?')[0].split(';')[0].toLowerCase();
        }

        function collectImages(jsonLdImages) {
          const imageMap = new Map();
          
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

        // ===== MAIN EXTRACTION LOGIC =====

        // Step 1: Get title and price from JSON-LD first
        let title = '';
        let price = '';
        let jsonLdImages = [];
        
        try {
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of scripts) {
            const data = JSON.parse(script.textContent);
            const findProduct = (node) => {
              if (!node) return null;
              if (Array.isArray(node)) {
                for (const n of node) {
                  const result = findProduct(n);
                  if (result) return result;
                }
                return null;
              }
              if (node['@graph']) return findProduct(node['@graph']);
              if (node['@type'] === 'Product' || (Array.isArray(node['@type']) && node['@type'].includes('Product'))) {
                return node;
              }
              return null;
            };
            
            const product = findProduct(data);
            if (product) {
              title = (product.name || '').trim();
              const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
              const rawPrice = offers?.price ?? offers?.lowPrice ?? '';
              price = rawPrice ? String(rawPrice).replace(/[^0-9.]/g, '') : '';
              
              if (Array.isArray(product.image)) jsonLdImages = product.image;
              else if (typeof product.image === 'string') jsonLdImages = [product.image];
              break;
            }
          }
        } catch (e) {
          console.log(`FB Lister v${EXTENSION_VERSION}: JSON-LD title/price extraction failed`, e);
        }

        // DOM fallback for title/price
        if (!title) {
          title = document.querySelector('h1.heading-5, h1[class*="heading"], h1')?.textContent?.trim() || '';
        }
        if (!price) {
          const priceContainers = document.querySelectorAll('[class*="price"], [data-testid*="price"]');
          for (const container of priceContainers) {
            const text = container.textContent || '';
            const match = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            if (match) {
              price = match[1].replace(',', '');
              break;
            }
          }
        }

        // Step 2: Click Specifications tab and extract specs
        console.log(`FB Lister v${EXTENSION_VERSION}: === PHASE 1: Specifications ===`);
        await openBestBuyTab('specifications');
        await expandAccordionsIn(document, ['specifications', 'specs', 'spec']);
        
        let specs = extractSpecificationsFrom(getActiveTabPanel());
        
        // Fallback: try JSON-LD additionalProperty
        if (specs.length === 0) {
          console.log(`FB Lister v${EXTENSION_VERSION}: DOM specs empty, trying JSON-LD additionalProperty`);
          specs = extractSpecsFromJsonLd();
        }

        // Step 3: Click Overview tab and extract features
        console.log(`FB Lister v${EXTENSION_VERSION}: === PHASE 2: Features ===`);
        await openBestBuyTab('overview');
        await expandAccordionsIn(document, ['features', 'feature', 'highlights']);
        
        const features = extractFeaturesFrom(getActiveTabPanel());

        // Step 4: Build description - FEATURES + SPECS ONLY (NO MARKETING FALLBACK)
        let description = '';
        let descSource = 'none';
        
        if (features.length > 0) {
          description += 'FEATURES:\n';
          features.forEach(f => {
            description += `• ${f}\n`;
          });
          description += '\n';
          descSource = 'features';
        }
        
        if (specs.length > 0) {
          description += 'SPECIFICATIONS:\n';
          specs.forEach(s => {
            description += `• ${s}\n`;
          });
          descSource = descSource === 'features' ? 'features+specs' : 'specs';
        }
        
        description = description.trim();
        
        // NO META FALLBACK - fail loudly if we have nothing
        if (description.length === 0) {
          console.error(`FB Lister v${EXTENSION_VERSION}: FAILED - No features or specifications found!`);
          descSource = 'FAILED';
        }
        
        // Limit to ~2000 chars
        if (description.length > 2000) {
          description = description.substring(0, 1997) + '...';
        }

        // Step 5: Collect images
        const images = collectImages(jsonLdImages);

        // Log final result
        console.log(`FB Lister v${EXTENSION_VERSION}: === EXTRACTION COMPLETE ===`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Title: ${title ? 'YES' : 'NO'} (${title.length} chars)`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Price: ${price || 'none'}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Description source: ${descSource}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Features count: ${features.length}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Specs count: ${specs.length}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Description length: ${description.length}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Images: ${images.length}`);

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
    
    let formatted = title
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\s*-\s*Amazon.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (formatted.length <= 75) return formatted;
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
    const existing = document.querySelector('#fb-lister-diagnostic-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'fb-lister-diagnostic-toast';
    
    // Special styling for extraction failure
    const isFailed = data.descSource === 'FAILED';
    const bgColor = isFailed ? '#bd2130' : (success ? '#1e7e34' : '#bd2130');
    
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 999999;
      background: ${bgColor};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 360px;
      line-height: 1.5;
    `;

    const titlePreview = data.title ? 
      (data.title.length > 35 ? data.title.substring(0, 35) + '...' : data.title) : 
      '(none)';

    const statusIcon = isFailed ? '✗' : '✓';
    const statusText = isFailed ? 'EXTRACTION FAILED' : (success ? 'Captured!' : 'Error');

    toast.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">
        FB Lister v${EXTENSION_VERSION} - ${statusText}
      </div>
      <div style="opacity: 0.9;">
        <div>${statusIcon} Title: ${data.title ? 'yes' : 'NO'}</div>
        <div>${statusIcon} Price: ${data.originalPrice || '(none)'} → ${data.price || '(none)'}</div>
        <div>${statusIcon} Features: ${data.featuresCount || 0}</div>
        <div>${statusIcon} Specs: ${data.specsCount || 0}</div>
        <div>${statusIcon} Description: ${data.description ? data.description.length + ' chars' : '(none)'}</div>
        <div>${statusIcon} Source: ${data.descSource || 'unknown'}</div>
        <div>${statusIcon} Images: ${data.images ? data.images.length : 0}</div>
      </div>
      ${isFailed ? `
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3); font-size: 11px;">
        ⚠️ Try: Scroll to Specifications tab, click it, then retry
      </div>
      ` : ''}
      <div style="margin-top: 8px; font-size: 11px; opacity: 0.7;">
        "${titlePreview}"
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), isFailed ? 10000 : 6000);
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
    button.innerHTML = 'Extracting...';

    try {
      let productData = null;
      for (const [site, extractor] of Object.entries(extractors)) {
        if (extractor.match.test(window.location.href)) {
          productData = await Promise.resolve(extractor.extract());
          break;
        }
      }

      if (!productData || !productData.title) {
        throw new Error('Could not extract product data');
      }

      // Count features/specs for diagnostic
      const featuresMatch = productData.description.match(/FEATURES:\n((?:• [^\n]+\n?)+)/);
      const specsMatch = productData.description.match(/SPECIFICATIONS:\n((?:• [^\n]+\n?)+)/);
      const featuresCount = featuresMatch ? (featuresMatch[1].match(/•/g) || []).length : 0;
      const specsCount = specsMatch ? (specsMatch[1].match(/•/g) || []).length : 0;
      
      let descSource = 'none';
      if (featuresCount > 0 && specsCount > 0) descSource = 'features+specs';
      else if (featuresCount > 0) descSource = 'features';
      else if (specsCount > 0) descSource = 'specs';
      else if (productData.description.length === 0) descSource = 'FAILED';

      const marketplaceData = {
        title: formatTitle(productData.title),
        originalTitle: productData.title,
        price: calculateMarketplacePrice(productData.price),
        originalPrice: productData.price,
        description: productData.description,
        images: productData.images,
        sourceUrl: window.location.href,
        copiedAt: new Date().toISOString(),
        extensionVersion: EXTENSION_VERSION,
        featuresCount,
        specsCount,
        descSource
      };

      await chrome.storage.local.set({ pendingListing: marketplaceData });
      await chrome.storage.local.set({ 
        lastScrapeDebug: {
          ...marketplaceData,
          scrapedAt: new Date().toISOString(),
          url: window.location.href
        }
      });

      showDiagnosticToast(marketplaceData, descSource !== 'FAILED');

      // Only open Facebook if we have description content
      if (descSource !== 'FAILED') {
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
      } else {
        button.innerHTML = 'No Description Found';
        button.classList.remove('loading');
        button.classList.add('error');
      }

      setTimeout(() => {
        button.classList.remove('success', 'error');
        button.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
          </svg>
          Copy to Facebook
        `;
      }, 3000);

    } catch (error) {
      showDiagnosticToast({ title: '', price: '', description: '', images: [], descSource: 'FAILED' }, false);
      
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
    const isProductPage = extractors.amazon.match.test(window.location.href) ||
                         extractors.ebay.match.test(window.location.href) ||
                         extractors.walmart.match.test(window.location.href) ||
                         extractors.bestbuy.match.test(window.location.href) ||
                         extractors.target.match.test(window.location.href);

    if (isProductPage) {
      setTimeout(createFloatingButton, 1500);
    }
  }

  init();
  
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 1000);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();
