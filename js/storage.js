/**
 * ============================================
 * STORAGE MODULE - V5 CLOUD SYNC WITH STATUS
 * Everything syncs to Google Sheets!
 * Shows sync status so you know it's working
 * ============================================
 */

const Storage = {
  KEYS: {
    PRODUCTS: 'aff_products',
    SETTINGS: 'aff_settings',
    STATS: 'aff_stats',
    SUBSCRIBERS: 'aff_subscribers',
    EMAIL_HISTORY: 'aff_email_history',
    FB_HISTORY: 'aff_fb_history'
  },

  // Get Google Script URL
  getScriptUrl() {
    const settings = this.getSettingsLocal();
    return settings.googleScriptUrl || '';
  },

  // ============================================
  // PRODUCTS - CLOUD SYNCED
  // ============================================
  
  getProducts() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.PRODUCTS) || '[]');
    } catch (e) {
      return [];
    }
  },

  saveProducts(products) {
    // Save locally first (instant)
    localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(products));
    
    // Then sync to cloud (async)
    this.syncProductsToCloud(products);
  },

  async syncProductsToCloud(products) {
    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) {
      console.warn('⚠️ No Google Script URL configured. Products not synced to cloud.');
      return;
    }
    
    try {
      console.log('🔄 Syncing products to Google Sheets...');
      
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveProducts',
          products: products
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Products synced to Google Sheets!');
        this.showSyncToast('✅ Synced to cloud');
      } else {
        console.error('❌ Sync failed:', result.error);
        this.showSyncToast('⚠️ Sync failed', 'error');
      }
    } catch (e) {
      console.error('❌ Could not sync products to cloud:', e);
      this.showSyncToast('⚠️ Sync failed - check console', 'error');
    }
  },

  async loadProductsFromCloud() {
    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) {
      console.warn('⚠️ No Google Script URL configured');
      return false;
    }
    
    try {
      console.log('🔄 Loading products from Google Sheets...');
      
      const response = await fetch(`${scriptUrl}?action=getProducts`);
      const data = await response.json();
      
      if (data.success && data.products) {
        localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(data.products));
        console.log(`✅ Loaded ${data.products.length} products from Google Sheets`);
        return true;
      } else {
        console.warn('⚠️ No products returned from cloud');
        return false;
      }
    } catch (e) {
      console.error('❌ Could not load products from cloud:', e);
      return false;
    }
  },

  addProduct(product) {
    const products = this.getProducts();
    const newProduct = {
      ...product,
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      selected: false
    };
    products.unshift(newProduct);
    this.saveProducts(products);
    return newProduct;
  },

  updateProduct(id, updates) {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...updates };
      this.saveProducts(products);
    }
  },

  deleteProduct(id) {
    const products = this.getProducts().filter(p => p.id !== id);
    this.saveProducts(products);
  },

  deleteProducts(ids) {
    const products = this.getProducts().filter(p => !ids.includes(p.id));
    this.saveProducts(products);
  },

  getSelectedProducts() {
    return this.getProducts().filter(p => p.selected);
  },

  toggleProductSelection(id) {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx].selected = !products[idx].selected;
      this.saveProducts(products);
    }
  },

  selectAllProducts() {
    const products = this.getProducts().map(p => ({ ...p, selected: true }));
    this.saveProducts(products);
  },

  deselectAllProducts() {
    const products = this.getProducts().map(p => ({ ...p, selected: false }));
    this.saveProducts(products);
  },

  // ============================================
  // SUBSCRIBERS - CLOUD SYNCED
  // ============================================

  getSubscribers() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.SUBSCRIBERS) || '[]');
    } catch (e) {
      return [];
    }
  },

  saveSubscribers(subscribers) {
    localStorage.setItem(this.KEYS.SUBSCRIBERS, JSON.stringify(subscribers));
  },

  addSubscriber(email) {
    const subscribers = this.getSubscribers();
    const normalizedEmail = email.toLowerCase().trim();
    
    if (subscribers.some(s => s.email.toLowerCase() === normalizedEmail)) {
      console.log('Subscriber already exists:', normalizedEmail);
      return null;
    }
    
    const newSub = {
      id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      email: normalizedEmail,
      addedAt: new Date().toISOString()
    };
    subscribers.unshift(newSub);
    this.saveSubscribers(subscribers);
    return newSub;
  },

  replaceAllSubscribers(emails) {
    const newSubscribers = emails.map((email, index) => ({
      id: 's_sync_' + Date.now() + '_' + index,
      email: typeof email === 'string' ? email.toLowerCase().trim() : email.email.toLowerCase().trim(),
      addedAt: new Date().toISOString()
    }));
    this.saveSubscribers(newSubscribers);
    console.log(`Replaced all subscribers with ${newSubscribers.length} from Google Sheets`);
  },

  removeSubscriber(id) {
    const subscribers = this.getSubscribers().filter(s => s.id !== id);
    this.saveSubscribers(subscribers);
  },

  // ============================================
  // SETTINGS - CLOUD SYNCED
  // ============================================

  getSettingsLocal() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS) || '{}');
    } catch (e) {
      return {};
    }
  },

  getSettings() {
    return this.getSettingsLocal();
  },

  saveSettings(settings) {
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    this.syncSettingsToCloud(settings);
  },

  async syncSettingsToCloud(settings) {
    const scriptUrl = settings.googleScriptUrl;
    if (!scriptUrl) {
      console.warn('⚠️ No Google Script URL to sync settings');
      return;
    }
    
    try {
      console.log('🔄 Syncing settings to Google Sheets...');
      
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveSettings',
          settings: settings
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Settings synced to Google Sheets');
        this.showSyncToast('✅ Settings saved to cloud');
      } else {
        console.error('❌ Settings sync failed:', result.error);
      }
    } catch (e) {
      console.error('❌ Could not sync settings to cloud:', e);
    }
  },

  async loadSettingsFromCloud() {
    const settings = this.getSettingsLocal();
    const scriptUrl = settings.googleScriptUrl;
    if (!scriptUrl) {
      console.warn('⚠️ No Google Script URL configured');
      return false;
    }
    
    try {
      console.log('🔄 Loading settings from Google Sheets...');
      
      const response = await fetch(`${scriptUrl}?action=getSettings`);
      const data = await response.json();
      
      if (data.success && data.settings) {
        // Merge with local settings (keep googleScriptUrl from local)
        const merged = { ...data.settings, googleScriptUrl: scriptUrl };
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(merged));
        console.log('✅ Settings loaded from Google Sheets');
        return true;
      }
    } catch (e) {
      console.error('❌ Could not load settings from cloud:', e);
    }
    return false;
  },

  // ============================================
  // STATS
  // ============================================

  getStats() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.STATS) || '{}');
    } catch (e) {
      return {};
    }
  },

  incrementStat(key) {
    const stats = this.getStats();
    stats[key] = (stats[key] || 0) + 1;
    localStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
  },

  // ============================================
  // HISTORY
  // ============================================

  addEmailHistory(data) {
    try {
      const history = JSON.parse(localStorage.getItem(this.KEYS.EMAIL_HISTORY) || '[]');
      history.unshift({ ...data, sentAt: new Date().toISOString() });
      localStorage.setItem(this.KEYS.EMAIL_HISTORY, JSON.stringify(history.slice(0, 50)));
      this.incrementStat('emailsSent');
    } catch (e) {}
  },

  getEmailHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.EMAIL_HISTORY) || '[]');
    } catch (e) {
      return [];
    }
  },

  addFBHistory(data) {
    try {
      const history = JSON.parse(localStorage.getItem(this.KEYS.FB_HISTORY) || '[]');
      history.unshift({ ...data, createdAt: new Date().toISOString() });
      localStorage.setItem(this.KEYS.FB_HISTORY, JSON.stringify(history.slice(0, 50)));
      this.incrementStat('fbPosts');
    } catch (e) {}
  },

  getFBHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.FB_HISTORY) || '[]');
    } catch (e) {
      return [];
    }
  },

  // ============================================
  // DATA MANAGEMENT
  // ============================================

  exportAll() {
    return {
      products: this.getProducts(),
      subscribers: this.getSubscribers(),
      settings: this.getSettings(),
      stats: this.getStats(),
      emailHistory: this.getEmailHistory(),
      fbHistory: this.getFBHistory(),
      exportedAt: new Date().toISOString()
    };
  },

  importAll(data) {
    if (data.products) this.saveProducts(data.products);
    if (data.subscribers) this.saveSubscribers(data.subscribers);
    if (data.settings) this.saveSettings(data.settings);
    if (data.stats) localStorage.setItem(this.KEYS.STATS, JSON.stringify(data.stats));
    if (data.emailHistory) localStorage.setItem(this.KEYS.EMAIL_HISTORY, JSON.stringify(data.emailHistory));
    if (data.fbHistory) localStorage.setItem(this.KEYS.FB_HISTORY, JSON.stringify(data.fbHistory));
  },

  clearAll() {
    Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
  },

  clearSubscribers() {
    localStorage.removeItem(this.KEYS.SUBSCRIBERS);
  },

  // ============================================
  // CLOUD SYNC - LOAD ALL
  // ============================================

  async syncAllFromCloud() {
    console.log('🔄 Syncing all data from Google Sheets...');
    
    const productsLoaded = await this.loadProductsFromCloud();
    const settingsLoaded = await this.loadSettingsFromCloud();
    
    if (productsLoaded || settingsLoaded) {
      console.log('✅ Cloud sync complete!');
      this.showSyncToast('✅ Loaded from cloud');
    } else {
      console.log('ℹ️ No cloud data found or sync disabled');
    }
  },

  // ============================================
  // SYNC TOAST NOTIFICATION
  // ============================================

  showSyncToast(message, type = 'success') {
    // Check if showToast function exists globally
    if (typeof showToast === 'function') {
      showToast(message, type);
      return;
    }

    // Fallback: create our own toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#ff4757' : '#2ed573'};
      color: white;
      border-radius: 6px;
      font-size: 13px;
      z-index: 9999;
      animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
};

// ============================================
// SCORE CALCULATOR
// ============================================

const ScoreCalculator = {
  PLATFORM: { amazon: 90, ebay: 80, aliexpress: 70, clickbank: 75, other: 60 },
  CATEGORY: { electronics: 85, beauty: 80, fashion: 75, home: 70, toys: 75, sports: 70, other: 60 },

  calculate(product) {
    const price = parseFloat(product.price) || 0;
    const rating = parseFloat(product.rating) || 3;
    const platform = this.PLATFORM[product.platform] || 60;
    const category = this.CATEGORY[product.category] || 60;

    let priceScore = 100;
    if (price > 1.5) priceScore = 70;
    else if (price > 1) priceScore = 80;
    else if (price > 0.5) priceScore = 90;

    const ratingScore = (rating / 5) * 100;

    const score = (
      priceScore * 0.25 +
      ratingScore * 0.30 +
      platform * 0.25 +
      category * 0.20
    );

    return Math.round(score);
  },

  getColor(score) {
    if (score >= 80) return '#2ed573';
    if (score >= 60) return '#ffa502';
    return '#ff4757';
  }
};
