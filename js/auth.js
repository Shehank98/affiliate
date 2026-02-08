/**
 * AUTH MODULE
 */
const Auth = {
  // YOUR EMAIL - Change this!
  ALLOWED_EMAIL: 'shehan.k98@gmail.com',
  KEY: 'aff_session',

  login(email) {
    if (email.toLowerCase() === this.ALLOWED_EMAIL.toLowerCase()) {
      localStorage.setItem(this.KEY, JSON.stringify({
        email,
        time: Date.now(),
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      }));
      return true;
    }
    return false;
  },

  logout() {
    localStorage.removeItem(this.KEY);
    window.location.href = 'index.html';
  },

  isLoggedIn() {
    try {
      const session = JSON.parse(localStorage.getItem(this.KEY));
      if (!session) return false;
      if (Date.now() > session.expires) {
        this.logout();
        return false;
      }
      return session.email.toLowerCase() === this.ALLOWED_EMAIL.toLowerCase();
    } catch (e) {
      return false;
    }
  },

  getEmail() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY))?.email || '';
    } catch (e) {
      return '';
    }
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
};
