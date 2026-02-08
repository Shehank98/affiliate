/**
 * TELEGRAM MODULE
 * Automatic posting to Telegram channels
 */

let products = [];
let botToken = '';
let channelId = '';

function initTelegram() {
  // Load saved settings
  const settings = Storage.getSettings();
  if (settings.telegramBotToken) {
    document.getElementById('botToken').value = settings.telegramBotToken;
    botToken = settings.telegramBotToken;
  }
  if (settings.telegramChannelId) {
    document.getElementById('channelId').value = settings.telegramChannelId;
    channelId = settings.telegramChannelId;
  }
  
  // Update status
  updateConnectionStatus();
  
  // Load selected products
  products = Storage.getSelectedProducts();
  displayProducts();
  updatePreview();
}

function updateConnectionStatus() {
  const status = document.getElementById('tgStatus');
  if (botToken && channelId) {
    status.textContent = '✓ Configured';
    status.className = 'badge badge-success';
  } else {
    status.textContent = 'Not Connected';
    status.className = 'badge badge-warning';
  }
}

function saveTelegramSettings() {
  botToken = document.getElementById('botToken').value.trim();
  channelId = document.getElementById('channelId').value.trim();
  
  if (!botToken || !channelId) {
    alert('Please enter both Bot Token and Channel ID');
    return;
  }
  
  const settings = Storage.getSettings();
  settings.telegramBotToken = botToken;
  settings.telegramChannelId = channelId;
  Storage.saveSettings(settings);
  
  updateConnectionStatus();
  showToast('Settings saved!');
}

async function testConnection() {
  botToken = document.getElementById('botToken').value.trim();
  channelId = document.getElementById('channelId').value.trim();
  
  if (!botToken || !channelId) {
    alert('Please enter Bot Token and Channel ID first');
    return;
  }
  
  try {
    // Test by getting bot info
    const botInfo = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botData = await botInfo.json();
    
    if (!botData.ok) {
      throw new Error('Invalid bot token');
    }
    
    // Try sending a test message
    const testResult = await sendTelegramMessage(
      '✅ Connection successful!\n\nYour Affiliate Hub is now connected to this channel.',
      false
    );
    
    if (testResult) {
      alert(`✅ Success! Connected as @${botData.result.username}\n\nTest message sent to your channel.`);
      saveTelegramSettings();
    }
    
  } catch (error) {
    alert('❌ Connection failed!\n\n' + error.message + '\n\nPlease check:\n1. Bot token is correct\n2. Bot is added as channel admin\n3. Channel ID is correct');
  }
}

async function getChannelId() {
  botToken = document.getElementById('botToken').value.trim();
  
  if (!botToken) {
    alert('Please enter your Bot Token first');
    return;
  }
  
  alert('To get your private channel ID:\n\n1. Forward any message from your channel to @userinfobot\n2. It will reply with the channel ID (starts with -100)\n3. Paste that ID in the Channel ID field');
}

function toggleSetup() {
  const content = document.getElementById('setupContent');
  content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

// ============================================
// DISPLAY PRODUCTS
// ============================================

function displayProducts() {
  const container = document.getElementById('productList');
  const countEl = document.getElementById('productCount');
  
  countEl.textContent = products.length;
  
  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No products selected</p>
        <a href="dashboard.html" class="btn btn-sm btn-primary">Select Products</a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = products.map((p, i) => `
    <div class="product-row">
      <img src="${p.image || 'https://via.placeholder.com/50'}" width="50" height="50" style="border-radius:6px; object-fit:cover;">
      <div class="product-details">
        <strong>${truncate(p.title, 50)}</strong>
        <span>$${p.price} | ⭐${p.rating}</span>
      </div>
      <button class="btn-icon" onclick="removeProduct(${i})">✕</button>
    </div>
  `).join('');
}

function removeProduct(index) {
  const productId = products[index].id;
  Storage.toggleProductSelection(productId);
  products.splice(index, 1);
  displayProducts();
  updatePreview();
}

// ============================================
// POST TEMPLATES
// ============================================

function getPostTemplate(product, style) {
  const templates = {
    clean: `*${escapeMarkdown(truncate(product.title, 100))}*

💰 *$${product.price}*

👉 [View Product](${product.affiliateLink})`,

    detailed: `✨ *${escapeMarkdown(truncate(product.title, 80))}*

💵 Price: *$${product.price}*
⭐ Rating: ${product.rating}/5
📦 Platform: ${product.platform || 'Online'}

🔗 [Get It Here](${product.affiliateLink})

#deals #shopping #recommended`,

    urgent: `🔥 *HOT FIND!*

${escapeMarkdown(truncate(product.title, 70))}

💰 Only *$${product.price}*!

⚡ [Grab It Now](${product.affiliateLink})`,

    simple: `${escapeMarkdown(truncate(product.title, 80))} - *$${product.price}*
👉 ${product.affiliateLink}`
  };
  
  return templates[style] || templates.clean;
}

function updatePreview() {
  const style = document.getElementById('postStyle').value;
  const preview = document.getElementById('postPreview');
  
  if (products.length === 0) {
    preview.innerHTML = '<p style="color: var(--text-dim);">Select products to see preview</p>';
    return;
  }
  
  const samplePost = getPostTemplate(products[0], style);
  
  // Display preview (convert markdown to visual)
  let displayText = samplePost
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '<span style="color: var(--accent);">🔗 $1</span>')
    .replace(/\n/g, '<br>');
  
  preview.innerHTML = `
    <div class="tg-preview-box">
      ${products[0].image ? `<img src="${products[0].image}" style="max-width:200px; border-radius:8px; margin-bottom:10px;">` : ''}
      <div>${displayText}</div>
    </div>
  `;
}

// ============================================
// TELEGRAM API
// ============================================

async function sendTelegramMessage(text, withImage = false, imageUrl = '') {
  const url = withImage && imageUrl
    ? `https://api.telegram.org/bot${botToken}/sendPhoto`
    : `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const body = withImage && imageUrl
    ? {
        chat_id: channelId,
        photo: imageUrl,
        caption: text,
        parse_mode: 'Markdown'
      }
    : {
        chat_id: channelId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(data.description || 'Failed to send message');
  }
  
  return data;
}

async function postAllToTelegram() {
  if (!botToken || !channelId) {
    alert('Please configure Telegram settings first');
    return;
  }
  
  if (products.length === 0) {
    alert('No products selected');
    return;
  }
  
  if (!confirm(`Post ${products.length} products to Telegram now?`)) return;
  
  const style = document.getElementById('postStyle').value;
  const includeImage = document.getElementById('includeImage').value === 'yes';
  
  showProgress(0, products.length);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const message = getPostTemplate(product, style);
    
    try {
      await sendTelegramMessage(message, includeImage, product.image);
      success++;
    } catch (error) {
      console.error('Failed to post:', error);
      failed++;
    }
    
    updateProgress(i + 1, products.length);
    
    // Delay between posts to avoid rate limiting
    if (i < products.length - 1) {
      await delay(2000);
    }
  }
  
  hideProgress();
  
  // Show results
  let resultMsg = `✅ Posted ${success} products to Telegram!`;
  if (failed > 0) {
    resultMsg += `\n⚠️ ${failed} posts failed.`;
  }
  alert(resultMsg);
  
  // Update stats
  const stats = Storage.getStats();
  stats.telegramPosts = (stats.telegramPosts || 0) + success;
  localStorage.setItem('aff_stats', JSON.stringify(stats));
}

async function postOneByOne() {
  if (!botToken || !channelId) {
    alert('Please configure Telegram settings first');
    return;
  }
  
  if (products.length === 0) {
    alert('No products selected');
    return;
  }
  
  const style = document.getElementById('postStyle').value;
  const includeImage = document.getElementById('includeImage').value === 'yes';
  const product = products[0];
  const message = getPostTemplate(product, style);
  
  try {
    await sendTelegramMessage(message, includeImage, product.image);
    showToast('Posted to Telegram!');
    
    // Remove from list
    removeProduct(0);
  } catch (error) {
    alert('Failed to post: ' + error.message);
  }
}

// ============================================
// PROGRESS UI
// ============================================

function showProgress(current, total) {
  document.getElementById('postProgress').classList.remove('hidden');
  updateProgress(current, total);
}

function updateProgress(current, total) {
  const percent = (current / total) * 100;
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('progressText').textContent = `Posting ${current} of ${total}...`;
}

function hideProgress() {
  document.getElementById('postProgress').classList.add('hidden');
}

// ============================================
// OTHER PLATFORMS (COPY)
// ============================================

function copyForInstagram() {
  if (products.length === 0) {
    alert('No products selected');
    return;
  }
  
  let text = '';
  products.forEach((p, i) => {
    text += `${i + 1}. ${p.title}\n💰 $${p.price}\n🔗 Link in bio\n\n`;
  });
  text += '#deals #shopping #musthave #affordable #onlineshopping';
  
  navigator.clipboard.writeText(text);
  showToast('Instagram caption copied!');
}

function copyForWhatsApp() {
  if (products.length === 0) {
    alert('No products selected');
    return;
  }
  
  let text = '🛍️ Check out these finds!\n\n';
  products.forEach((p, i) => {
    text += `${i + 1}. ${truncate(p.title, 50)}\n   💰 $${p.price}\n   🔗 ${p.affiliateLink}\n\n`;
  });
  
  navigator.clipboard.writeText(text);
  showToast('WhatsApp message copied!');
  
  // Also open WhatsApp
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

function copyForTwitter() {
  if (products.length === 0) {
    alert('No products selected');
    return;
  }
  
  const p = products[0];
  const text = `${truncate(p.title, 100)}\n\n💰 $${p.price}\n\n${p.affiliateLink}\n\n#deals #shopping`;
  
  navigator.clipboard.writeText(text);
  showToast('Tweet copied!');
  
  // Open Twitter
  const encoded = encodeURIComponent(text);
  window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
}

// ============================================
// UTILITIES
// ============================================

function escapeMarkdown(text) {
  if (!text) return '';
  // Escape special markdown characters for Telegram
  return text.replace(/([_*\[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
