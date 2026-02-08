/**
 * FACEBOOK MODULE
 * Generate FB posts for manual posting
 */

let products = [];
let posts = [];

function initFacebook() {
  products = Storage.getSelectedProducts();
  
  if (products.length === 0) {
    document.getElementById('postsContainer').innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="icon">📦</div>
          <h3>No Products Selected</h3>
          <p><a href="dashboard.html">Go to Dashboard</a> to select products</p>
        </div>
      </div>
    `;
    return;
  }
  
  regenerate();
}

function regenerate() {
  const style = document.getElementById('postStyle').value;
  const customHashtags = document.getElementById('hashtags').value;
  
  posts = products.map(p => ({
    product: p,
    caption: generateCaption(p, style, customHashtags)
  }));
  
  renderPosts();
}

function generateCaption(p, style, customHashtags) {
  const baseHashtags = {
    electronics: '#tech #gadgets',
    fashion: '#fashion #style',
    beauty: '#beauty #skincare',
    home: '#homedecor #home',
    toys: '#toys #fun',
    sports: '#fitness #sports',
    other: '#deals #shopping'
  };
  
  const hashtags = (baseHashtags[p.category] || '#deals') + ' ' + (customHashtags || '');
  
  const templates = {
    deal: `🔥 HOT DEAL ALERT! 🔥

${p.title}

💰 Only $${p.price}!
⭐ ${p.rating} star rating

👉 Grab yours before it's gone!
🔗 Link in comments

${hashtags} #sale`,

    question: `Have you seen this? 👀

${p.title}

It's only $${p.price}! 🤯

Would you try it? Drop a 🙋 below!

${hashtags}`,

    urgency: `⏰ LIMITED TIME ⏰

${p.title}

🚨 Just $${p.price} - Won't last!
⭐ ${p.rating}/5 rating

Link in comments 👇

${hashtags} #hurry`,

    simple: `${p.title}

Price: $${p.price}
Rating: ⭐ ${p.rating}

Link in comments 👇

${hashtags}`
  };
  
  return templates[style] || templates.deal;
}

function renderPosts() {
  const container = document.getElementById('postsContainer');
  
  container.innerHTML = posts.map((post, i) => `
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-header">
        <h3>Post ${i + 1}</h3>
        <span class="badge badge-success">${post.product.platform}</span>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Preview -->
        <div class="fb-preview">
          <div class="fb-header">
            <div class="fb-avatar">Y</div>
            <div>
              <div class="fb-name">Your Page</div>
              <div class="fb-time">Just now · 🌐</div>
            </div>
          </div>
          <div class="fb-content">${escapeHtml(post.caption)}</div>
          ${post.product.image ? `<img src="${post.product.image}" class="fb-image" onerror="this.style.display='none'">` : ''}
        </div>
        
        <!-- Actions -->
        <div>
          <div class="form-group">
            <label>Caption (editable)</label>
            <textarea id="caption-${i}" rows="8" style="font-size:13px;">${post.caption}</textarea>
          </div>
          
          <div class="form-group">
            <label>Affiliate Link (for comments)</label>
            <input type="text" value="${post.product.affiliateLink}" readonly style="background:var(--bg-card); font-size:12px;">
          </div>
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-sm btn-secondary" onclick="copyCaption(${i})">📋 Copy Caption</button>
            <button class="btn btn-sm btn-secondary" onclick="copyLink(${i})">🔗 Copy Link</button>
            <button class="btn btn-sm btn-secondary" onclick="openImage(${i})">📥 Get Image</button>
            <button class="btn btn-sm btn-primary" onclick="savePost(${i})">💾 Save</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function copyCaption(i) {
  const caption = document.getElementById(`caption-${i}`).value;
  navigator.clipboard.writeText(caption);
  showToast('Caption copied!');
}

function copyLink(i) {
  navigator.clipboard.writeText(posts[i].product.affiliateLink);
  showToast('Link copied!');
}

function openImage(i) {
  const img = posts[i].product.image;
  if (img) {
    window.open(img, '_blank');
    showToast('Image opened - right-click to save');
  } else {
    alert('No image available');
  }
}

function savePost(i) {
  const caption = document.getElementById(`caption-${i}`).value;
  Storage.addFBHistory({
    productTitle: posts[i].product.title,
    caption,
    imageUrl: posts[i].product.image,
    affiliateLink: posts[i].product.affiliateLink
  });
  showToast('Post saved to history!');
}

function downloadAll() {
  let content = `FACEBOOK POSTS - ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
  
  posts.forEach((post, i) => {
    const caption = document.getElementById(`caption-${i}`)?.value || post.caption;
    content += `POST ${i + 1}\n${'-'.repeat(30)}\n`;
    content += `Product: ${post.product.title}\n`;
    content += `Price: $${post.product.price}\n`;
    content += `Image: ${post.product.image || 'N/A'}\n`;
    content += `Affiliate Link: ${post.product.affiliateLink}\n\n`;
    content += `CAPTION:\n${caption}\n\n`;
    content += `${'='.repeat(50)}\n\n`;
  });
  
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fb-posts-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  showToast('Posts downloaded!');
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
