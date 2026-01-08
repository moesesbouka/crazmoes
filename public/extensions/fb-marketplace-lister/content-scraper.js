// FB Marketplace Lister - Content Script for Product Pages
// Version 1.4.10 - Best Buy container scoring + looser overview fallback
(function() {
  'use strict';

  const EXTENSION_VERSION = '1.4.10';

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
        console.log(`FB Lister v${EXTENSION_VERSION}: === BEST BUY 3-LAYER EXTRACTION ===`);

        // ===== LAYER A: EMBEDDED PRODUCT JSON/STATE EXTRACTION =====
        
        function extractFromEmbeddedJson() {
          console.log(`FB Lister v${EXTENSION_VERSION}: [Layer A] Scanning for embedded JSON/state...`);
          const result = { features: [], specs: [], title: '', price: '', images: [] };
          
          // Scan ALL script tags for JSON containing product data
          const scripts = document.querySelectorAll('script');
          
          for (const script of scripts) {
            const text = script.textContent || '';
            if (text.length < 100) continue;
            
            // Pattern 1: window.__INITIAL_STATE__, __APP_INITIAL_DATA__, __PRELOADED_STATE__
            const statePatterns = [
              /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>|$)/,
              /window\.__APP_INITIAL_DATA__\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>|$)/,
              /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>|$)/,
              /__NEXT_DATA__[^{]*(\{[\s\S]*?\})\s*<\/script>/
            ];
            
            for (const pattern of statePatterns) {
              const match = text.match(pattern);
              if (match) {
                try {
                  const data = JSON.parse(match[1]);
                  parseProductFromState(data, result);
                  if (result.features.length > 0 || result.specs.length > 0) {
                    console.log(`FB Lister v${EXTENSION_VERSION}: [Layer A] Found data via state pattern`);
                    return result;
                  }
                } catch (e) {
                  // Not valid JSON, continue
                }
              }
            }
            
            // Pattern 2: Look for large JSON objects with product keys
            if (text.includes('"specifications"') || text.includes('"features"') || 
                text.includes('"longDescription"') || text.includes('"featureBullets"')) {
              
              // Try to find JSON object boundaries
              const jsonMatches = text.matchAll(/\{[^{}]*"(?:specifications|features|longDescription|featureBullets)"[^{}]*\}/g);
              for (const jsonMatch of jsonMatches) {
                try {
                  const data = JSON.parse(jsonMatch[0]);
                  parseProductFromState(data, result);
                } catch (e) {
                  // Continue searching
                }
              }
              
              // Also try parsing the whole script if it's JSON
              if (script.type === 'application/json' || text.trim().startsWith('{')) {
                try {
                  const data = JSON.parse(text.trim());
                  parseProductFromState(data, result);
                } catch (e) {
                  // Not valid JSON
                }
              }
            }
          }
          
          console.log(`FB Lister v${EXTENSION_VERSION}: [Layer A] Features: ${result.features.length}, Specs: ${result.specs.length}`);
          return result;
        }
        
        // Recursively parse product data from state object
        function parseProductFromState(obj, result, depth = 0) {
          if (!obj || typeof obj !== 'object' || depth > 10) return;
          
          // Check for features arrays
          if (Array.isArray(obj.features)) {
            obj.features.forEach(f => {
              const text = typeof f === 'string' ? f : f?.text || f?.value || f?.description || '';
              if (text && text.length > 10 && text.length < 500) {
                result.features.push(text.trim());
              }
            });
          }
          if (Array.isArray(obj.featureBullets)) {
            obj.featureBullets.forEach(f => {
              const text = typeof f === 'string' ? f : f?.text || '';
              if (text && text.length > 10) result.features.push(text.trim());
            });
          }
          
          // Check for specifications
          if (Array.isArray(obj.specifications)) {
            obj.specifications.forEach(spec => {
              if (spec.name && spec.value) {
                result.specs.push(`${spec.name}: ${spec.value}`);
              } else if (spec.displayName && spec.value) {
                result.specs.push(`${spec.displayName}: ${spec.value}`);
              } else if (spec.label && spec.value) {
                result.specs.push(`${spec.label}: ${spec.value}`);
              }
            });
          }
          if (Array.isArray(obj.specs)) {
            obj.specs.forEach(spec => {
              if (spec.name && spec.value) {
                result.specs.push(`${spec.name}: ${spec.value}`);
              }
            });
          }
          
          // EXPANDED: Check for various description fields that may contain features
          const featureTextKeys = [
            'longDescription', 'shortDescription', 'overview', 'productOverview',
            'marketingDescription', 'highlights', 'productDescription', 'description',
            'aboutThisItem', 'productInfo'
          ];
          
          for (const key of featureTextKeys) {
            if (typeof obj[key] === 'string' && obj[key].length > 50 && result.features.length === 0) {
              const text = obj[key].trim();
              // Skip if it looks like spec-table content
              if (text.includes('Key Specs') || text.includes('General:') || 
                  text.includes('Ports:') || text.includes('Dimensions:')) {
                continue;
              }
              // Skip boilerplate
              if (/shop.*at best buy/i.test(text) || /price match/i.test(text) || 
                  /free shipping/i.test(text)) {
                continue;
              }
              
              // If it contains HTML, parse for bullets or text
              if (text.includes('<')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = text;
                tempDiv.querySelectorAll('li').forEach(li => {
                  const liText = li.textContent?.trim();
                  if (liText && liText.length > 10 && liText.length < 400) {
                    result.features.push(liText);
                  }
                });
                // If no bullets, get paragraph text
                if (result.features.length === 0) {
                  const plainText = tempDiv.textContent?.trim();
                  if (plainText && plainText.length > 50) {
                    result.features.push(plainText);
                  }
                }
              } else if (text.length > 50) {
                result.features.push(text);
              }
            }
          }
          
          // Check for title/price while we're here
          if (!result.title && typeof obj.name === 'string' && obj.name.length > 5) {
            result.title = obj.name;
          }
          if (!result.price && (obj.price || obj.regularPrice || obj.currentPrice)) {
            const p = obj.price || obj.regularPrice || obj.currentPrice;
            result.price = typeof p === 'number' ? String(p) : String(p).replace(/[^0-9.]/g, '');
          }
          
          // Check for images
          if (Array.isArray(obj.images)) {
            obj.images.forEach(img => {
              const url = typeof img === 'string' ? img : img?.url || img?.src || img?.href || '';
              if (url && url.includes('http')) result.images.push(url);
            });
          }
          
          // Recurse into nested objects
          for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'object') {
              parseProductFromState(obj[key], result, depth + 1);
            }
          }
        }

        // ===== LAYER B: HEADING-DRIVEN DOM EXTRACTION (SCOPED TO PRODUCT CONTAINER) =====
        
        // Find the main product-details container first (prevents false positives)
        function findProductDetailsContainer() {
          // IMPORTANT: Best Buy pages often contain "pdp-*" classes inside carousels/recommendations.
          // We score candidates and explicitly penalize/skip "related/carousel" wrappers.

          const titleText = (document.querySelector('h1')?.textContent || '').trim();
          const badContainerPattern = /(related|carousel|recommend|recommended|similar|sponsored|flex-carousel|wrapper)/i;

          const productSelectors = [
            // Prefer main content anchors first
            'main',
            '[role="main"]',
            '[data-testid="pdp-content"]',
            '[data-testid*="pdp" i]',
            '[data-testid*="product" i]',

            // Then product modules
            '[data-testid="product-details"]',
            '[class*="product-details"]',
            '[class*="productDetails"]',
            '[class*="shop-product"]',
            '[class*="pdp-content"]',
            '.shop-pdp-container',
            '#shop-product-content',
            '[class*="product-page"]',
            '#main-content'
          ];

          const candidates = new Set();
          for (const selector of productSelectors) {
            try {
              document.querySelectorAll(selector).forEach((el) => candidates.add(el));
            } catch {
              // Invalid selector, skip
            }
          }

          const scoreContainer = (el) => {
            const text = el?.textContent || '';
            const classId = `${el?.id || ''} ${el?.className || ''}`;
            const classIdLower = classId.toLowerCase();

            let score = 0;

            // Penalize obvious non-product wrappers
            if (badContainerPattern.test(classIdLower)) score -= 10;

            // Reward presence of expected signals
            const textLower = text.toLowerCase();
            if (titleText && text.includes(titleText)) score += 5;
            if (textLower.includes('specifications') || textLower.includes('key specs')) score += 5;
            if (/\$\s*\d/.test(text)) score += 3;

            // Prefer substantial containers
            if (text.length > 800) score += 2;
            if (text.length > 3000) score += 2;

            return score;
          };

          let best = null;
          let bestScore = -Infinity;

          for (const el of candidates) {
            if (!el || !el.textContent || el.textContent.length < 500) continue;

            const classIdLower = `${el.id || ''} ${el.className || ''}`.toLowerCase();

            // Hard reject: small related/recommendation carousels are common false positives
            if (badContainerPattern.test(classIdLower) && el.textContent.length < 8000) continue;

            const score = scoreContainer(el);
            if (score > bestScore) {
              bestScore = score;
              best = el;
            }
          }

          if (best) {
            console.log(
              `FB Lister v${EXTENSION_VERSION}: [Layer B] Product container chosen (score=${bestScore}): ${best.tagName} ${(best.id ? '#' + best.id : '')} ${(best.className ? '.' + String(best.className).trim().split(/\s+/).slice(0, 3).join('.') : '')}`
            );
            return best;
          }

          // Fallback: find the largest content div that contains product info
          const fallbackCandidates = document.querySelectorAll('div[class*="content"], div[class*="product"], section');
          let fallbackBest = null;
          let fallbackBestScore = 0;

          for (const c of fallbackCandidates) {
            const classIdLower = `${c.id || ''} ${c.className || ''}`.toLowerCase();
            if (badContainerPattern.test(classIdLower) && c.textContent.length < 8000) continue;

            const hasProductInfo = c.textContent.includes('Add to Cart') ||
              c.textContent.includes('Price') ||
              c.querySelector('[class*="price"], [data-testid*="price"]');

            const score = hasProductInfo ? c.textContent.length : 0;
            if (score > fallbackBestScore) {
              fallbackBestScore = score;
              fallbackBest = c;
            }
          }

          if (fallbackBest) {
            console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Product container found via fallback heuristic`);
          }
          return fallbackBest;
        }
        
        function extractByHeadings() {
          console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Heading-driven DOM extraction...`);
          const result = { features: [], specs: [] };
          
          // CRITICAL: First, locate the main product-details container
          const productContainer = findProductDetailsContainer();
          if (!productContainer) {
            console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Could not find product-details container, searching whole document`);
          } else {
            console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Searching within product container (${productContainer.className?.substring(0, 50) || 'no-class'})`);
          }
          
          // Search ONLY within the product container (or whole document as fallback)
          const searchRoot = productContainer || document;
          const headings = searchRoot.querySelectorAll('h1, h2, h3, h4, h5, h6, button, [role="heading"], [role="button"]');
          
          console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Found ${headings.length} headings to scan`);
          
          for (const heading of headings) {
            const text = (heading.textContent || '').toLowerCase().trim();
            
            // ===== FEATURES =====
            if (text === 'features' || text === 'key features' || text === 'highlights' || 
                (text.includes('features') && text.length < 30)) {
              
              // CRITICAL: Skip if this "Features" heading is inside the Specs/Specifications module
              // (On some Best Buy pages, "Features" is only a spec-category heading.)
              let isInSpecsModule = false;
              {
                let el = heading;
                for (let i = 0; i < 7 && el && el.parentElement; i++) {
                  el = el.parentElement;
                  const textLen = el.textContent?.length || 0;
                  if (textLen > 200 && textLen < 12000) {
                    const t = (el.textContent || '').toLowerCase();
                    if (t.includes('key specs') || t.includes('specifications')) {
                      isInSpecsModule = true;
                      break;
                    }
                  }
                }
              }
              if (isInSpecsModule) {
                console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] SKIPPED "Features" heading (inside Specs module)`);
                continue;
              }
              
              // DIAGNOSTIC: Enhanced logging per ChatGPT recommendations
              const headingPath = `${heading.tagName} > ${heading.parentElement?.className?.substring(0, 50) || 'no-class'}`;
              console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] === FEATURES HEADING DETECTED ===`);
              console.log(`  featuresHeadingText: "${text}"`);
              console.log(`  featuresHeadingHTML: ${heading.outerHTML?.slice(0, 150)}`);
              console.log(`  featuresHeadingPath: ${headingPath}`);
              console.log(`  featuresSource: HEADING`);
              
              // Get the container holding the features content (using aria-first approach)
              const container = findContentContainer(heading);
              if (container) {
                const containerSample = container.textContent?.trim().substring(0, 150) || '';
                console.log(`  featuresContainerSample: "${containerSample}..."`);
                console.log(`  featuresContainerClass: ${container.className}`);
                console.log(`  featuresContainerTag: ${container.tagName}`);
                console.log(`  featuresContainerLength: ${container.textContent.length} chars`);
                
                // CRITICAL CHECK: Are we accidentally in specs territory?
                const lowerSample = containerSample.toLowerCase();
                if (lowerSample.includes('key specs') || lowerSample.includes('general') || 
                    lowerSample.includes('ports') || lowerSample.includes('dimensions')) {
                  console.log(`  ⚠️ WARNING: Container looks like SPECS, not Features. Trying text-walking approach...`);
                  
                  // Use text-walking approach instead
                  const walkedText = extractTextUntilNextHeading(heading);
                  if (walkedText && walkedText.length > 50) {
                    console.log(`  ✅ Text-walking found ${walkedText.length} chars of features`);
                    result.features.push(walkedText);
                  }
                } else {
                  // Method 1: Prefer bullet lists (li elements)
                  const bullets = [];
                  container.querySelectorAll('li').forEach(li => {
                    const liText = li.textContent?.trim();
                    if (liText && liText.length > 15 && liText.length < 500 && !isBoilerplate(liText)) {
                      bullets.push(liText);
                    }
                  });
                  
                  if (bullets.length > 0) {
                    console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Found ${bullets.length} bullet features`);
                    result.features.push(...bullets);
                  } else {
                    // Method 2: Use text-walking approach (extractTextUntilNextHeading)
                    console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] No bullets, using text-walking extraction...`);
                    
                    const walkedText = extractTextUntilNextHeading(heading);
                    if (walkedText && walkedText.length > 50) {
                      console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Text-walking found ${walkedText.length} chars`);
                      result.features.push(walkedText);
                    } else {
                      // Method 3: Fallback to container text blocks
                      console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Text-walking insufficient, trying container blocks...`);
                      
                      const textBlocks = [];
                      const children = container.querySelectorAll('p, div, span');
                      for (const child of children) {
                        const childText = child.textContent?.toLowerCase() || '';
                        if (childText.includes('specifications') || childText.includes('reviews')) break;
                        
                        const blockText = child.textContent?.trim();
                        if (blockText && blockText.length > 30 && blockText.length < 1000 && 
                            !isBoilerplate(blockText) && child.children.length <= 2) {
                          textBlocks.push(blockText);
                        }
                      }
                      
                      const uniqueBlocks = [...new Set(textBlocks)];
                      if (uniqueBlocks.length > 0) {
                        console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Found ${uniqueBlocks.length} text blocks`);
                        result.features.push(...uniqueBlocks.slice(0, 5));
                      }
                    }
                  }
                }
              } else {
                console.log(`  featuresContainer: NOT FOUND - trying text-walking from heading`);
                
                // No container found, try text-walking approach directly
                const walkedText = extractTextUntilNextHeading(heading);
                if (walkedText && walkedText.length > 50) {
                  console.log(`  ✅ Text-walking (no container) found ${walkedText.length} chars`);
                  result.features.push(walkedText);
                }
              }
            }
            
            // ===== SPECIFICATIONS =====
            if (text === 'specifications' || text === 'specs' || text === 'product specifications' ||
                (text.includes('specifications') && text.length < 35) ||
                (text.includes('specs') && text.length < 20)) {
              console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Found Specifications heading: "${text}"`);
              
              const container = findContentContainer(heading);
              if (container) {
                // Method 1: dl/dt/dd pairs
                container.querySelectorAll('dl').forEach(dl => {
                  const dts = dl.querySelectorAll('dt');
                  const dds = dl.querySelectorAll('dd');
                  dts.forEach((dt, i) => {
                    if (dds[i]) {
                      const label = dt.textContent?.trim();
                      const value = dds[i].textContent?.trim();
                      if (label && value && label !== value) {
                        result.specs.push(`${label}: ${value}`);
                      }
                    }
                  });
                });
                
                // Method 2: Tables
                container.querySelectorAll('table tr, [class*="spec-row"], [class*="specification-row"]').forEach(row => {
                  const cells = row.querySelectorAll('td, th, [class*="name"], [class*="value"]');
                  if (cells.length >= 2) {
                    const label = cells[0].textContent?.trim();
                    const value = cells[1].textContent?.trim();
                    if (label && value && label !== value && label.length < 100 && value.length < 200) {
                      result.specs.push(`${label}: ${value}`);
                    }
                  }
                });
                
                // Method 3: Two-column div layouts (common on Best Buy)
                container.querySelectorAll('[class*="spec"] > div, [class*="row"]').forEach(row => {
                  const children = row.children;
                  if (children.length === 2) {
                    const label = children[0].textContent?.trim();
                    const value = children[1].textContent?.trim();
                    if (label && value && label !== value && label.length < 100) {
                      result.specs.push(`${label}: ${value}`);
                    }
                  }
                });
                
                // Method 4: List items with clear label/value structure
                container.querySelectorAll('li').forEach(li => {
                  const labelEl = li.querySelector('[class*="name"], [class*="label"], strong, b');
                  const valueEl = li.querySelector('[class*="value"], [class*="detail"]');
                  if (labelEl && valueEl) {
                    const label = labelEl.textContent?.trim();
                    const value = valueEl.textContent?.trim();
                    if (label && value && label !== value) {
                      result.specs.push(`${label}: ${value}`);
                    }
                  }
                });
              }
            }
          }
          
          // Deduplicate
          result.features = [...new Set(result.features)].slice(0, 15);
          result.specs = [...new Set(result.specs)].slice(0, 25);
          
          console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Final - Features: ${result.features.length}, Specs: ${result.specs.length}`);
          return result;
        }
        
        // Find the content container below a heading (aria-first approach)
        function findContentContainer(heading) {
          // 0) If heading is inside a button, treat the button as the controller
          const btn = heading.closest('button[aria-controls], button[aria-expanded]');
          if (btn) {
            const id = btn.getAttribute('aria-controls');
            if (id) {
              const panel = document.getElementById(id);
              if (panel && panel.textContent.trim().length > 50) return panel;
            }
            // sometimes panel is next sibling of button wrapper
            const maybePanel = btn.parentElement?.nextElementSibling || btn.nextElementSibling;
            if (maybePanel && maybePanel.textContent.trim().length > 50) return maybePanel;
          }

          // 1) aria-labelledby relationship (super common in React UIs)
          const hid = heading.getAttribute('id');
          if (hid) {
            const labelled = document.querySelector(`[aria-labelledby="${CSS.escape(hid)}"]`);
            if (labelled && labelled.textContent.trim().length > 50) return labelled;
          }

          // 2) tabpanel containment (if features is inside a tab/accordion)
          const tabPanel = heading.closest('[role="tabpanel"], [data-testid*="tabpanel"], [class*="tabpanel"]');
          if (tabPanel && tabPanel.textContent.trim().length > 100) return tabPanel;

          // 3) fallback: nearest reasonable section wrapper
          const section = heading.closest('section, [data-testid*="section"], [class*="section"], [class*="content"]');
          if (section && section.textContent.trim().length > 150) return section;

          // 4) last resort: sibling heuristics
          let container = heading.nextElementSibling;
          if (container && container.textContent.trim().length > 50) return container;

          const parent = heading.parentElement;
          if (parent) {
            container = parent.nextElementSibling;
            if (container && container.textContent.trim().length > 50) return container;
          }

          return null;
        }
        
        // Extract text by walking forward until the next section heading
        function extractTextUntilNextHeading(heading) {
          const parts = [];
          const stopTags = new Set(['H1','H2','H3','H4','H5','H6']);
          const stopPatterns = /specifications|reviews|warranty|support|related|compare|q&a|questions/i;

          let node = heading.nextSibling;

          // If heading has no siblings, start from parent's next nodes
          if (!node) node = heading.parentElement?.nextSibling;

          while (node) {
            if (node.nodeType === 1) { // element
              const tag = node.tagName;
              // Stop when we hit the next heading-ish block
              if (stopTags.has(tag)) break;
              
              // Stop if this node contains a stop-pattern heading
              const innerHeading = node.querySelector?.('h1,h2,h3,h4,h5,h6');
              if (innerHeading && stopPatterns.test(innerHeading.textContent)) break;

              // Collect meaningful text
              const text = node.textContent?.trim();
              if (text && text.length > 60 && !isBoilerplate(text)) parts.push(text);
            }
            node = node.nextSibling;
          }

          // Dedupe
          return [...new Set(parts)].join('\n\n').trim();
        }
        
        // Check if text is boilerplate
        function isBoilerplate(text) {
          const lower = text.toLowerCase();
          const boilerplatePatterns = [
            /^see all/i, /^learn more/i, /^view/i, /^click/i, /^add to/i,
            /^buy now/i, /^save\s/i, /^\$/i, /^shop/i, /^find low/i,
            /price match/i, /free shipping/i, /pick-?up/i
          ];
          return boilerplatePatterns.some(p => p.test(lower));
        }
        
        // Extract product overview/short description as Features fallback
        function extractOverviewAsFeatures() {
          console.log(`FB Lister v${EXTENSION_VERSION}: [Layer B] Attempting overview extraction as Features fallback...`);

          // Best Buy commonly uses these patterns for marketing description
          const overviewSelectors = [
            '[data-testid*="summary" i]',
            '[data-testid*="description" i]',
            '[data-testid*="overview" i]',
            '[class*="shortDescription" i]',
            '[class*="longDescription" i]',
            '[class*="overview" i]',
            '[class*="product-overview" i]'
          ];

          for (const selector of overviewSelectors) {
            try {
              const element = document.querySelector(selector);
              if (!element) continue;

              const text = element.textContent?.trim();
              if (text && text.length >= 80 && text.length <= 2000 && !isBoilerplate(text)) {
                console.log(`  ✅ Overview found via: ${selector} (${text.length} chars)`);
                console.log(`  featuresSource: OVERVIEW`);
                return [text];
              }
            } catch {
              // Invalid selector
            }
          }

          // Fallback: Find the first meaningful text block after the title
          const titleEl = document.querySelector('h1.heading-5, h1[class*="heading"], h1');
          if (titleEl) {
            const titleContainer = titleEl.closest('main, [role="main"], [class*="product"], section') || document.querySelector('main') || document.body;

            const blocks = titleContainer.querySelectorAll('p, div, span');
            for (const el of blocks) {
              // Only consider blocks that come AFTER the title in the DOM
              if (!(titleEl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;

              const text = el.textContent?.trim();
              if (!text) continue;

              const lower = text.toLowerCase();
              const looksLikeJunk = lower.includes('review') || lower.includes('question') || lower.includes('q&a');

              // Avoid huge containers; prefer simple blocks
              const tooComplex = (el.children?.length || 0) > 6;

              if (
                text.length >= 80 &&
                text.length <= 1200 &&
                !looksLikeJunk &&
                !tooComplex &&
                !isBoilerplate(text)
              ) {
                console.log(`  ✅ Overview found via first block after title (${text.length} chars)`);
                console.log(`  featuresSource: OVERVIEW`);
                return [text];
              }
            }
          }

          console.log(`  ❌ No suitable overview paragraph found`);
          return [];
        }

        // ===== LAYER C: FILTERED META FALLBACK =====
        
        function getFilteredMetaDescription() {
          console.log(`FB Lister v${EXTENSION_VERSION}: [Layer C] Checking meta description...`);
          
          const metaDesc = 
            document.querySelector('meta[name="description"]')?.content ||
            document.querySelector('meta[property="og:description"]')?.content || '';
          
          if (!metaDesc) {
            console.log(`FB Lister v${EXTENSION_VERSION}: [Layer C] No meta description found`);
            return null;
          }
          
          // Reject if it contains marketing boilerplate
          const boilerplatePatterns = [
            /shop.*at best buy/i,
            /find low everyday prices/i,
            /price match guarantee/i,
            /buy online for delivery or in-store/i,
            /free shipping/i,
            /^shop\s/i,
            /save on.*at best buy/i,
            /get free shipping/i,
            /pick-?up today/i
          ];
          
          for (const pattern of boilerplatePatterns) {
            if (pattern.test(metaDesc)) {
              console.log(`FB Lister v${EXTENSION_VERSION}: [Layer C] Meta rejected as boilerplate: matches "${pattern}"`);
              return null;
            }
          }
          
          console.log(`FB Lister v${EXTENSION_VERSION}: [Layer C] Meta accepted: ${metaDesc.length} chars`);
          return metaDesc;
        }

        // ===== JSON-LD additionalProperty EXTRACTION (supplement) =====
        
        function extractSpecsFromJsonLd() {
          const specs = [];
          try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
              const data = JSON.parse(script.textContent);
              const products = [];
              
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

        // Step 1: Get basic info from JSON-LD first (title, price, images)
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

        // Step 2: LAYER A - Try embedded JSON/state extraction first
        console.log(`FB Lister v${EXTENSION_VERSION}: === LAYER A: Embedded JSON ===`);
        const jsonResult = extractFromEmbeddedJson();
        
        let features = jsonResult.features;
        let specs = jsonResult.specs;
        let descSource = 'none';
        let featuresSource = features.length > 0 ? 'STATE' : 'none';

        if (features.length > 0 || specs.length > 0) {
          descSource = 'JSON';
          if (features.length > 0) featuresSource = 'STATE';
          console.log(`FB Lister v${EXTENSION_VERSION}: Layer A SUCCESS - Features: ${features.length}, Specs: ${specs.length}`);
        }
        
        // Step 3: LAYER B - Heading-driven DOM extraction (if Layer A didn't get enough)
        if (features.length < 3 && specs.length < 3) {
          console.log(`FB Lister v${EXTENSION_VERSION}: === LAYER B: Heading-Driven DOM ===`);
          const domResult = extractByHeadings();
          
          // Merge results (prefer Layer B if it got more)
          if (domResult.features.length > features.length) {
            features = domResult.features;
            if (features.length > 0) featuresSource = 'FEATURES_HEADING';
          }
          if (domResult.specs.length > specs.length) {
            specs = domResult.specs;
          }
          
          if (features.length > 0 || specs.length > 0) {
            descSource = (descSource === 'JSON') ? 'JSON+DOM' : 'DOM';
            console.log(`FB Lister v${EXTENSION_VERSION}: Layer B result - Features: ${features.length}, Specs: ${specs.length}`);
          }
        }
        
        // Step 3b: OVERVIEW FALLBACK - If features still empty, use product overview paragraph
        if (features.length === 0) {
          console.log(`FB Lister v${EXTENSION_VERSION}: === OVERVIEW FALLBACK (no Features found) ===`);
          const overviewFeatures = extractOverviewAsFeatures();
          if (overviewFeatures.length > 0) {
            features = overviewFeatures;
            featuresSource = 'OVERVIEW_FALLBACK';
            descSource = (descSource === 'JSON' || descSource === 'JSON+DOM') ? descSource + '+OVERVIEW' : 'OVERVIEW';
            console.log(`FB Lister v${EXTENSION_VERSION}: Overview fallback SUCCESS - ${features.length} paragraph(s)`);
          }
        }
        
        // Step 4: Supplement specs from JSON-LD additionalProperty if still short
        if (specs.length < 5) {
          const jsonLdSpecs = extractSpecsFromJsonLd();
          if (jsonLdSpecs.length > specs.length) {
            specs = jsonLdSpecs;
            descSource = descSource ? descSource + '+JSONLD' : 'JSONLD';
          }
        }

        // Step 5: Build description - FEATURES + SPECS ONLY
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
        
        // Step 6: LAYER C - Filtered meta fallback (ONLY if we have nothing)
        if (description.length === 0) {
          console.log(`FB Lister v${EXTENSION_VERSION}: === LAYER C: Filtered Meta ===`);
          const metaDesc = getFilteredMetaDescription();
          if (metaDesc && metaDesc.length > 50) {
            description = metaDesc;
            descSource = 'META';
            console.log(`FB Lister v${EXTENSION_VERSION}: Using filtered meta description`);
          }
        }
        
        // Final: If still nothing, mark as FAILED
        if (description.length === 0) {
          console.error(`FB Lister v${EXTENSION_VERSION}: FAILED - No features, specifications, or valid meta found!`);
          descSource = 'FAILED';
        }
        
        // Limit to ~2000 chars
        if (description.length > 2000) {
          description = description.substring(0, 1997) + '...';
        }

        // Step 7: Collect images
        const images = collectImages(jsonLdImages);

        const featuresSample = features?.[0]
          ? features[0].replace(/\s+/g, ' ').trim().slice(0, 80)
          : '';

        // Log final result
        console.log(`FB Lister v${EXTENSION_VERSION}: === EXTRACTION COMPLETE ===`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Title: ${title ? 'YES' : 'NO'} (${title.length} chars)`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Price: ${price || 'none'}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Description source: ${descSource}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Features source: ${featuresSource}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Features count: ${features.length}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Specs count: ${specs.length}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Description length: ${description.length}`);
        console.log(`FB Lister v${EXTENSION_VERSION}: Images: ${images.length}`);

        return { 
          title, 
          price, 
          description, 
          images,
          _debug: { 
            featuresCount: features.length,
            specsCount: specs.length,
            descSource,
            featuresSource,
            featuresSample,
          }
        };
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
        <div>${statusIcon} Features: ${data.featuresCount || 0}${data.featuresSource ? ` (${data.featuresSource})` : ''}</div>
        ${data.featuresSample ? `<div style="opacity:0.75;font-size:11px;">Features sample: "${data.featuresSample}"</div>` : ''}
        <div>${statusIcon} Specs: ${data.specsCount || 0}</div>
        <div>${statusIcon} Description: ${data.description ? data.description.length + ' chars' : '(none)'}</div>
        <div>${statusIcon} Source: ${data.descSource || 'unknown'}</div>
        <div>${statusIcon} Images: ${data.images ? data.images.length : 0}</div>
      </div>
      ${isFailed ? `
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3); font-size: 11px;">
        ⚠️ Could not extract Features/Specifications. The page structure may have changed.
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

      // Get debug info from extraction (if available)
      const debugInfo = productData._debug || {};
      
      // Count features/specs for diagnostic (fallback if not in _debug)
      let featuresCount = debugInfo.featuresCount;
      let specsCount = debugInfo.specsCount;
      let descSource = debugInfo.descSource;
      let featuresSource = debugInfo.featuresSource;
      let featuresSample = debugInfo.featuresSample;
      
      if (featuresCount === undefined) {
        const featuresMatch = productData.description.match(/FEATURES:\n((?:• [^\n]+\n?)+)/);
        const specsMatch = productData.description.match(/SPECIFICATIONS:\n((?:• [^\n]+\n?)+)/);
        featuresCount = featuresMatch ? (featuresMatch[1].match(/•/g) || []).length : 0;
        specsCount = specsMatch ? (specsMatch[1].match(/•/g) || []).length : 0;

        // Keep existing descSource inference
        descSource = 'none';
        if (featuresCount > 0 && specsCount > 0) descSource = 'features+specs';
        else if (featuresCount > 0) descSource = 'features';
        else if (specsCount > 0) descSource = 'specs';
        else if (productData.description.length === 0) descSource = 'FAILED';

        // Fallback inference for Features source/sample
        featuresSource = featuresCount > 0 ? 'unknown' : 'none';
        const firstLine = (productData.description.match(/FEATURES:\n• ([^\n]+)/)?.[1] || '').trim();
        featuresSample = firstLine ? firstLine.slice(0, 80) : '';
      }

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
        descSource,
        featuresSource,
        featuresSample
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
