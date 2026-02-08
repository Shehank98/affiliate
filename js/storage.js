/**
 * ============================================
 * STORAGE MODULE - V2
 * With subscriber management
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

  // ============================================
  // PRODUCTS
  // ============================================
  
  getProducts() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.PRODUCTS) || '[]');
    } catch (e) {
      return [];
    }
  },

  saveProducts(products) {
    localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(products));
  },

  addProduct(product) {
    const products = this.getProducts();
    const newProduct = {
      ...product,
      id: 'p_' + Date.now(),
      createdAt: new Date().toISOString(),
      selected: false
    };
    products.unshift(newProduct); // Add to beginning
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
  // SUBSCRIBERS
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
    // Check duplicate
    if (subscribers.some(s => s.email === email)) {
      return null;
    }
    const newSub = {
      id: 's_' + Date.now(),
      email: email,
      addedAt: new Date().toISOString()
    };
    subscribers.unshift(newSub);
    this.saveSubscribers(subscribers);
    return newSub;
  },

  removeSubscriber(id) {
    const subscribers = this.getSubscribers().filter(s => s.id !== id);
    this.saveSubscribers(subscribers);
  },

  // ============================================
  // SETTINGS
  // ============================================

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS) || '{}');
    } catch (e) {
      return {};
    }
  },

  saveSettings(settings) {
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
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

    // Price score (lower price = higher score for cheap deals)
    let priceScore = 100;
    if (price > 1.5) priceScore = 70;
    else if (price > 1) priceScore = 80;
    else if (price > 0.5) priceScore = 90;

    const ratingScore = (rating / 5) * 100;

    // Weighted average
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
