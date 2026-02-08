/**
 * ============================================
 * DASHBOARD MODULE - V3 with Google Sheets Sync
 * Auto-fetch product data from affiliate links
 * ============================================
 */

// ⚠️ REPLACE WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTt02nsG0G-WqzsTt51367uId3awCXHqnwCHO02EZtsm0QSLBd4mqv3s5Tgo99_is/exec';

let products = [];
let filteredProducts = [];
let currentAffiliateLink = '';

// ============================================
// INITIALIZATION
// ============================================

async function initDashboard() {
  // Show loading
  showToast('Loading from cloud...', 'info');
  
  // Sync from cloud first
  await Storage.syncAllFromCloud();
  
  // Then load everything
  loadProducts();
  syncSubscribersFromSheet();
  loadStats();
}

function loadStats() {
  const stats = Storage.getStats();
  const prods = Storage.getProducts();
  const subs = Storage.getSubscribers();
  
  document.getElementById('totalProducts').textContent = prods.length;
  document.getElementById('selectedProducts').textContent = prods.filter(p => p.selected).length;
  document.getElementById('totalSubscribers').textContent = subs.length;
  document.getElementById('emailsSent').textContent = stats.emailsSent || 0;
}

// ============================================
// GOOGLE SHEETS SYNC FOR SUBSCRIBERS
// ============================================

async function syncSubscribersFromSheet() {
  // Show loading state
  const list = document.getElementById('subscriberList');
  list.innerHTML = '<p class="empty-text">🔄 Loading subscribers from Google Sheets...</p>';
  
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getSubscribers`, {
      method: 'GET'
    });
    
    const data = await response.json();
    
    if (data.success && data.subscribers && Array.isArray(data.subscribers)) {
      console.log(`✅ Loaded ${data.subscribers.length} subscribers from Google Sheets`);
      
      // Use the new replaceAllSubscribers method (ONLY clears subscribers, not products!)
      const emails = data.subscribers
        .filter(sub => sub.email && sub.email.includes('@'))
        .map(sub => sub.email);
      
      Storage.replaceAllSubscribers(emails);
      
      loadSubscribers();
      loadStats();
      showToast(`✅ Synced ${emails.length} subscribers from Google Sheets`);
    } else {
      throw new Error('Invalid response from Google Sheets');
    }
  } catch (error) {
    console.warn('⚠️ Could not sync from Google Sheets:', error.message);
    showToast('Using local subscribers data. Check Settings to configure Google Sheets.', 'warning');
    loadSubscribers(); // Fallback to local storage
  }
}

// ============================================
// PRODUCT FETCHING FROM AFFILIATE LINK
// ============================================

function handleLinkPaste(event) {
  // Auto-trigger fetch after paste
  setTimeout(() => {
    fetchProductData();
  }, 100);
}

async function fetchProductData() {
  const link = document.getElementById('quickLink').value.trim();
  if (!link) {
    showStatus('Please paste an affiliate link', 'error');
    return;
  }
  
  currentAffiliateLink = link;
  const fetchBtn = document.getElementById('fetchBtn');
  fetchBtn.disabled = true;
  fetchBtn.innerHTML = '⏳ Fetching...';
  
  // Detect platform
  const platform = detectPlatform(link);
  document.getElementById('fetchedPlatform').value = platform;
  
  showStatus('Fetching product data...', 'info');
  
  try {
    // Try to get the actual product URL first
    const productUrl = await resolveAffiliateLink(link);
    
    // Try multiple fetch methods
    const productData = await fetchWithProxy(productUrl, platform);
    
    if (productData && productData.title) {
      displayFetchedProduct(productData);
      showStatus('✅ Product data fetched! Review and click Add.', 'success');
    } else {
      showEasyManualEntry(platform, productUrl || link);
    }
    
  } catch (error) {
    console.error('Fetch error:', error);
    showEasyManualEntry(platform, link);
  }
  
  fetchBtn.disabled = false;
  fetchBtn.innerHTML = '🔍 Fetch Data';
}

// Try to resolve affiliate redirect to actual product URL
async function resolveAffiliateLink(link) {
  // For AliExpress s.click links, try to extract the actual URL
  if (link.includes('s.click.aliexpress')) {
    // These redirect to the actual product, we'll use the link as-is
    return link;
  }
  
  // For Amazon amzn.to links
  if (link.includes('amzn.to') || link.includes('amzn.com')) {
    return link;
  }
  
  return link;
}

// Show easy manual entry with helper buttons
function showEasyManualEntry(platform, productUrl) {
  document.getElementById('fetchedProduct').classList.remove('hidden');
  document.getElementById('fetchedPlatform').value = platform;
  document.getElementById('fetchedTitle').value = '';
  document.getElementById('fetchedPrice').value = '';
  document.getElementById('fetchedRating').value = '4.5';
  document.getElementById('fetchedImageUrl').value = '';
  document.getElementById('fetchedImage').style.display = 'none';
  
  // Store URL for opening
  window.currentProductUrl = productUrl;
  
  showStatus(`
    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <span>⚡ Quick fill: Open product page, copy details</span>
      <button class="btn btn-sm btn-primary" onclick="openProductPage()">🔗 Open Product Page</button>
    </div>
    <div style="margin-top:8px; font-size:12px;">
      <strong>Tips:</strong> Right-click image → "Copy image address" | Copy title from page
    </div>
  `, 'info');
}

function openProductPage() {
  const url = window.currentProductUrl || currentAffiliateLink;
  window.open(url, '_blank');
  showToast('Product page opened! Copy title & image URL from there.');
}

function detectPlatform(url) {
  url = url.toLowerCase();
  if (url.includes('aliexpress') || url.includes('s.click.aliexpress')) return 'aliexpress';
  if (url.includes('amazon') || url.includes('amzn')) return 'amazon';
  if (url.includes('ebay')) return 'ebay';
  if (url.includes('clickbank')) return 'clickbank';
  return 'other';
}

async function fetchWithProxy(url, platform) {
  // Use multiple CORS proxy options - try each one
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `https://thingproxy.freeboard.io/fetch/${url}`
  ];
  
  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 sec timeout
      
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,application/xhtml+xml' }
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const html = await response.text();
        if (html && html.length > 500) { // Make sure we got real content
          const data = parseProductHtml(html, platform);
          if (data && data.title) return data;
        }
      }
    } catch (e) {
      console.log('Proxy failed:', e.message);
      continue;
    }
  }
  
  return null;
}

function parseProductHtml(html, platform) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let data = {
    title: '',
    price: '',
    image: '',
    rating: '4.5'
  };
  
  // Try Open Graph tags first (most reliable)
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const ogImage = doc.querySelector('meta[property="og:image"]');
  const ogPrice = doc.querySelector('meta[property="product:price:amount"]');
  
  if (ogTitle) data.title = ogTitle.content;
  if (ogImage) data.image = ogImage.content;
  if (ogPrice) data.price = ogPrice.content;
  
  // Platform-specific parsing
  if (platform === 'aliexpress') {
    // AliExpress specific
    if (!data.title) {
      const title = doc.querySelector('h1') || doc.querySelector('.product-title');
      if (title) data.title = title.textContent.trim();
    }
    if (!data.price) {
      const price = doc.querySelector('.product-price-value') || 
                    doc.querySelector('[class*="price"]');
      if (price) data.price = extractPrice(price.textContent);
    }
  }
  
  if (platform === 'amazon') {
    if (!data.title) {
      const title = doc.querySelector('#productTitle') || doc.querySelector('#title');
      if (title) data.title = title.textContent.trim();
    }
    if (!data.price) {
      const price = doc.querySelector('.a-price .a-offscreen') || 
                    doc.querySelector('#priceblock_ourprice');
      if (price) data.price = extractPrice(price.textContent);
    }
    if (!data.image) {
      const img = doc.querySelector('#landingImage') || doc.querySelector('#imgBlkFront');
      if (img) data.image = img.src || img.dataset.src;
    }
  }
  
  if (platform === 'ebay') {
    if (!data.title) {
      const title = doc.querySelector('h1.x-item-title__mainTitle');
      if (title) data.title = title.textContent.trim();
    }
    if (!data.price) {
      const price = doc.querySelector('.x-price-primary');
      if (price) data.price = extractPrice(price.textContent);
    }
  }
  
  // Extract rating if available
  const ratingEl = doc.querySelector('[class*="rating"]') || 
                   doc.querySelector('[class*="star"]');
  if (ratingEl) {
    const ratingText = ratingEl.textContent || ratingEl.getAttribute('aria-label') || '';
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    if (ratingMatch) data.rating = ratingMatch[1];
  }
  
  // Validate we got something useful
  if (data.title || data.image) {
    return data;
  }
  
  return null;
}

function extractPrice(text) {
  if (!text) return '';
  // Extract numeric price from text like "$1.99" or "US $1.99"
  const match = text.match(/(\d+\.?\d*)/);
  return match ? match[1] : '';
}

function displayFetchedProduct(data) {
  document.getElementById('fetchedProduct').classList.remove('hidden');
  document.getElementById('fetchedTitle').value = data.title || '';
  document.getElementById('fetchedPrice').value = data.price || '';
  document.getElementById('fetchedRating').value = data.rating || '4.5';
  document.getElementById('fetchedImageUrl').value = data.image || '';
  
  const imgEl = document.getElementById('fetchedImage');
  if (data.image) {
    imgEl.src = data.image;
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }
}

function showStatus(message, type) {
  const status = document.getElementById('fetchStatus');
  status.innerHTML = message; // Changed to innerHTML to support HTML content
  status.className = `fetch-status ${type}`;
  status.classList.remove('hidden');
}

function saveProduct() {
  const title = document.getElementById('fetchedTitle').value.trim();
  const price = document.getElementById('fetchedPrice').value;
  const rating = document.getElementById('fetchedRating').value || '4.5';
  const platform = document.getElementById('fetchedPlatform').value;
  const category = document.getElementById('fetchedCategory').value;
  const image = document.getElementById('fetchedImageUrl').value.trim();
  
  if (!title) {
    showStatus('Please enter a product title', 'error');
    return;
  }
  
  if (!price) {
    showStatus('Please enter a price', 'error');
    return;
  }
  
  if (!currentAffiliateLink) {
    showStatus('No affiliate link found', 'error');
    return;
  }
  
  Storage.addProduct({
    title,
    price: parseFloat(price).toFixed(2),
    rating: parseFloat(rating).toFixed(1),
    platform,
    category,
    image,
    affiliateLink: currentAffiliateLink
  });
  
  // Reset form
  document.getElementById('quickLink').value = '';
  document.getElementById('fetchedProduct').classList.add('hidden');
  document.getElementById('fetchStatus').classList.add('hidden');
  currentAffiliateLink = '';
  
  // Refresh
  loadProducts();
  loadStats();
  showToast('Product added!');
}

// ============================================
// PRODUCTS DISPLAY
// ============================================

function loadProducts() {
  products = Storage.getProducts().map(p => ({
    ...p,
    score: ScoreCalculator.calculate(p)
  }));
  filterProducts();
}

function filterProducts() {
  const platform = document.getElementById('filterPlatform').value;
  const sortBy = document.getElementById('sortBy').value;
  
  filteredProducts = products.filter(p => {
    if (platform !== 'all' && p.platform !== platform) return false;
    return true;
  });
  
  // Sort
  switch (sortBy) {
    case 'newest':
      filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'score':
      filteredProducts.sort((a, b) => b.score - a.score);
      break;
    case 'price-low':
      filteredProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      break;
  }
  
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  
  if (filteredProducts.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  
  empty.classList.add('hidden');
  
  grid.innerHTML = filteredProducts.map(p => `
    <div class="product-card ${p.selected ? 'selected' : ''}" onclick="toggleSelect('${p.id}')">
      <div class="product-checkbox ${p.selected ? 'checked' : ''}">
        ${p.selected ? '✓' : ''}
      </div>
      <img src="${p.image || 'https://via.placeholder.com/150?text=No+Image'}" 
           alt="${escapeHtml(p.title)}" 
           onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
      <div class="product-info">
        <div class="product-platform">${p.platform}</div>
        <h4>${escapeHtml(truncate(p.title, 50))}</h4>
        <div class="product-meta">
          <span class="price">$${p.price}</span>
          <span class="rating">⭐${p.rating}</span>
        </div>
        <div class="product-score" style="color: ${ScoreCalculator.getColor(p.score)}">
          Score: ${p.score}/100
        </div>
      </div>
      <div class="product-actions" onclick="event.stopPropagation()">
        <button class="btn-icon" onclick="editProduct('${p.id}')" title="Edit">✏️</button>
        <button class="btn-icon" onclick="deleteProduct('${p.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
  
  updateActionBar();
}

function toggleSelect(id) {
  Storage.toggleProductSelection(id);
  const product = products.find(p => p.id === id);
  if (product) product.selected = !product.selected;
  renderProducts();
  loadStats();
}

function deselectAll() {
  Storage.deselectAllProducts();
  products.forEach(p => p.selected = false);
  renderProducts();
  loadStats();
}

function updateActionBar() {
  const selected = products.filter(p => p.selected);
  const actionBar = document.getElementById('actionBar');
  const actionCount = document.getElementById('actionCount');
  const selectionInfo = document.getElementById('selectionInfo');
  
  if (selected.length > 0) {
    actionBar.classList.remove('hidden');
    actionCount.textContent = selected.length;
    
    if (selected.length === 5) {
      selectionInfo.textContent = '✅ Perfect! 5 selected for email';
      selectionInfo.style.color = 'var(--success)';
    } else if (selected.length < 5) {
      selectionInfo.textContent = `Select ${5 - selected.length} more for email`;
      selectionInfo.style.color = 'var(--warning)';
    } else {
      selectionInfo.textContent = `${selected.length} selected (5 recommended for email)`;
      selectionInfo.style.color = 'var(--text-secondary)';
    }
  } else {
    actionBar.classList.add('hidden');
    selectionInfo.textContent = 'Select 5 for email';
    selectionInfo.style.color = 'var(--text-secondary)';
  }
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  
  document.getElementById('editId').value = id;
  document.getElementById('editTitle').value = product.title;
  document.getElementById('editPrice').value = product.price;
  document.getElementById('editRating').value = product.rating;
  document.getElementById('editImage').value = product.image || '';
  document.getElementById('editLink').value = product.affiliateLink;
  
  document.getElementById('editModal').classList.add('active');
}

function closeModal() {
  document.getElementById('editModal').classList.remove('active');
}

function saveEdit() {
  const id = document.getElementById('editId').value;
  Storage.updateProduct(id, {
    title: document.getElementById('editTitle').value.trim(),
    price: parseFloat(document.getElementById('editPrice').value).toFixed(2),
    rating: parseFloat(document.getElementById('editRating').value).toFixed(1),
    image: document.getElementById('editImage').value.trim(),
    affiliateLink: document.getElementById('editLink').value.trim()
  });
  closeModal();
  loadProducts();
  showToast('Product updated!');
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  Storage.deleteProduct(id);
  loadProducts();
  loadStats();
  showToast('Product deleted');
}

function deleteSelected() {
  const selected = products.filter(p => p.selected);
  if (!confirm(`Delete ${selected.length} products?`)) return;
  Storage.deleteProducts(selected.map(p => p.id));
  loadProducts();
  loadStats();
  showToast(`${selected.length} products deleted`);
}

// ============================================
// SUBSCRIBERS
// ============================================

function loadSubscribers() {
  const subscribers = Storage.getSubscribers();
  const list = document.getElementById('subscriberList');
  const count = document.getElementById('subscriberCount');
  
  count.textContent = `${subscribers.length} subscribers`;
  
  if (subscribers.length === 0) {
    list.innerHTML = '<p class="empty-text">No subscribers yet. Add emails above or sync from Google Sheets.</p>';
    return;
  }
  
  // Show ALL subscribers with delete buttons
  list.innerHTML = `
    <div class="subscriber-table">
      <div class="subscriber-header">
        <span>Email</span>
        <span>Added</span>
        <span></span>
      </div>
      ${subscribers.map(s => `
        <div class="subscriber-row">
          <span class="subscriber-email">${s.email}</span>
          <span class="subscriber-date">${new Date(s.addedAt).toLocaleDateString()}</span>
          <button class="btn-icon btn-delete" onclick="deleteSubscriber('${s.id}')" title="Delete">🗑️</button>
        </div>
      `).join('')}
    </div>
  `;
}

function deleteSubscriber(id) {
  if (!confirm('Remove this subscriber?')) return;
  Storage.removeSubscriber(id);
  loadSubscribers();
  loadStats();
  showToast('Subscriber removed');
}

async function addSubscriber() {
  const input = document.getElementById('newSubscriberEmail');
  const email = input.value.trim().toLowerCase();
  
  if (!email || !email.includes('@')) {
    showToast('Enter a valid email', 'error');
    return;
  }
  
  // Check if already exists
  const existing = Storage.getSubscribers();
  if (existing.some(s => s.email.toLowerCase() === email)) {
    showToast('Email already exists!', 'error');
    return;
  }
  
  // Add to local storage
  Storage.addSubscriber(email);
  
  // Sync to Google Sheets
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'addSubscriber', 
        email: email 
      })
    });
    
    const result = await response.json();
    console.log('Added to Google Sheets:', result);
  } catch (error) {
    console.warn('Could not sync to Google Sheets:', error);
    showToast('Added locally (Google Sheets sync failed)', 'warning');
  }
  
  input.value = '';
  loadSubscribers();
  loadStats();
  showToast('Subscriber added!');
}

function removeSubscriber(id) {
  Storage.removeSubscriber(id);
  loadSubscribers();
  loadStats();
}

// ============================================
// NAVIGATION
// ============================================

function goToEmail() {
  const selected = products.filter(p => p.selected);
  if (selected.length === 0) {
    showToast('Select at least 1 product', 'error');
    return;
  }
  if (selected.length !== 5) {
    if (!confirm(`You have ${selected.length} products selected. Recommended is 5. Continue anyway?`)) {
      return;
    }
  }
  window.location.href = 'email.html';
}

function goToShare() {
  const selected = products.filter(p => p.selected);
  if (selected.length === 0) {
    showToast('Select at least 1 product', 'error');
    return;
  }
  window.location.href = 'share.html';
}

function goToFacebook() {
  const selected = products.filter(p => p.selected);
  if (selected.length === 0) {
    showToast('Select at least 1 product', 'error');
    return;
  }
  window.location.href = 'facebook.html';
}

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
