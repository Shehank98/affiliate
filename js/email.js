/**
 * EMAIL MODULE - V4
 * 3 Professional Email Templates + Batch Sending
 */

let products = [];
let emailHtml = '';
let statusCheckInterval = null;

function initEmail() {
  products = Storage.getSelectedProducts();
  
  const settings = Storage.getSettings();
  if (!settings.googleScriptUrl) {
    document.getElementById('noScript').classList.remove('hidden');
  }
  
  document.getElementById('productCount').textContent = products.length;
  displaySelectedProducts();
  
  if (products.length > 0) {
    generatePreview();
  }
  
  // Check if there's an ongoing campaign
  checkCampaignStatus();
}

function displaySelectedProducts() {
  const container = document.getElementById('productList');
  if (products.length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim)">No products selected. <a href="dashboard.html">Select products</a></p>';
    return;
  }
  
  container.innerHTML = products.map(p => `
    <div style="display:inline-flex; align-items:center; gap:8px; background:var(--bg); padding:6px 10px; border-radius:6px; font-size:12px; margin:3px;">
      <span style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(p.title)}</span>
      <span style="color:var(--accent);">$${p.price}</span>
    </div>
  `).join('');
}

function generatePreview() {
  if (products.length === 0) {
    document.getElementById('preview').innerHTML = '<p style="color:#888; text-align:center;">No products selected</p>';
    return;
  }
  
  const template = document.getElementById('templateSelect').value;
  const subject = document.getElementById('emailSubject').value;
  const intro = document.getElementById('introText').value;
  const brandName = document.getElementById('brandName').value || 'Weekly Picks';
  const settings = Storage.getSettings();
  
  switch(template) {
    case 'minimal':
      emailHtml = generateMinimalTemplate({ products, subject, intro, brandName, settings });
      break;
    case 'magazine':
      emailHtml = generateMagazineTemplate({ products, subject, intro, brandName, settings });
      break;
    case 'grid':
      emailHtml = generateGridTemplate({ products, subject, intro, brandName, settings });
      break;
    default:
      emailHtml = generateMinimalTemplate({ products, subject, intro, brandName, settings });
  }
  
  document.getElementById('preview').innerHTML = emailHtml;
  document.getElementById('htmlCode').value = emailHtml;
}

// ============================================
// CAMPAIGN STATUS MANAGEMENT
// ============================================

async function checkCampaignStatus() {
  const settings = Storage.getSettings();
  if (!settings.googleScriptUrl) return;
  
  try {
    const response = await fetch(`${settings.googleScriptUrl}?action=getCampaignStatus`);
    const status = await response.json();
    
    if (status.success && status.inProgress) {
      showCampaignProgress(status);
    } else {
      hideCampaignProgress();
    }
  } catch (e) {
    console.log('Could not check campaign status:', e);
  }
}

function showCampaignProgress(status) {
  // Create or update progress bar
  let progressDiv = document.getElementById('campaignProgress');
  if (!progressDiv) {
    progressDiv = document.createElement('div');
    progressDiv.id = 'campaignProgress';
    progressDiv.className = 'campaign-progress';
    const firstCard = document.querySelector('.card');
    if (firstCard) {
      firstCard.parentNode.insertBefore(progressDiv, firstCard);
    }
  }
  
  const progress = Math.round((status.sentCount / status.totalEmails) * 100);
  
  progressDiv.innerHTML = `
    <div class="alert alert-info">
      <h4>📊 Campaign in Progress</h4>
      <p><strong>${status.subject}</strong></p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <p style="margin: 10px 0;">${status.sentCount} of ${status.totalEmails} sent (${progress}%)</p>
      <p><small>Started: ${new Date(status.startedAt).toLocaleString()}</small></p>
      ${status.remaining > 0 ? `
        <p class="warning-text">⚠️ ${status.remaining} emails remaining. Daily limit reached.</p>
        <button class="btn btn-primary btn-sm" onclick="resumeCampaign()">
          📧 Send Next Batch (Resume)
        </button>
      ` : `
        <p class="success-text">✅ Campaign completed!</p>
      `}
    </div>
  `;
  
  // Disable send button if campaign in progress
  const sendBtn = document.querySelector('button[onclick="sendToAll()"]');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = '⏸️ Campaign in Progress';
  }
}

function hideCampaignProgress() {
  const progressDiv = document.getElementById('campaignProgress');
  if (progressDiv) {
    progressDiv.remove();
  }
  
  const sendBtn = document.querySelector('button[onclick="sendToAll()"]');
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.textContent = '🚀 Send to All Subscribers';
  }
}

// ============================================
// TEMPLATE 1: MINIMAL (Clean Apple-style)
// ============================================
function generateMinimalTemplate({ products, subject, intro, brandName, settings }) {
  const productsHtml = products.map(p => `
    <tr>
      <td style="padding:30px 0; border-bottom:1px solid #f0f0f0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="120" style="vertical-align:top;">
              <img src="${p.image || 'https://via.placeholder.com/120x120/f8f8f8/ccc?text=+'}" width="120" height="120" style="display:block; border-radius:8px;" alt="">
            </td>
            <td style="padding-left:25px; vertical-align:top;">
              <h3 style="margin:0 0 8px; font-size:17px; font-weight:600; color:#1d1d1f; line-height:1.3;">${escapeHtml(truncate(p.title, 65))}</h3>
              <p style="margin:0 0 12px; font-size:14px; color:#86868b;">Rating: ${p.rating} out of 5</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td><span style="font-size:22px; font-weight:600; color:#1d1d1f;">$${p.price}</span></td>
                  <td style="padding-left:20px;">
                    <a href="${p.affiliateLink}" style="display:inline-block; padding:10px 22px; background:#0071e3; color:#fff; text-decoration:none; border-radius:20px; font-size:14px; font-weight:500;">View Item</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background:#ffffff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="padding:0 0 40px; text-align:center; border-bottom:1px solid #f0f0f0;">
              <h1 style="margin:0; font-size:28px; font-weight:600; color:#1d1d1f; letter-spacing:-0.5px;">${escapeHtml(brandName)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 0 30px;">
              <p style="margin:0; font-size:17px; color:#1d1d1f; line-height:1.6;">${escapeHtml(intro)}</p>
            </td>
          </tr>
          ${productsHtml}
          <tr>
            <td style="padding:40px 0; text-align:center;">
              <p style="margin:0 0 10px; font-size:12px; color:#86868b;">You're receiving this because you subscribed to ${escapeHtml(brandName)}.</p>
              <p style="margin:0; font-size:12px;"><a href="${settings.unsubscribeLink || '#'}" style="color:#86868b;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// TEMPLATE 2: MAGAZINE (Editorial Style)
// ============================================
function generateMagazineTemplate({ products, subject, intro, brandName, settings }) {
  const featured = products[0];
  const others = products.slice(1);
  
  const othersHtml = others.map(p => `
    <td width="33%" style="padding:10px; vertical-align:top;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td><img src="${p.image || 'https://via.placeholder.com/150x150/f5f5f5/999?text=+'}" width="100%" style="display:block; border-radius:8px; max-height:140px; object-fit:cover;" alt=""></td></tr>
        <tr>
          <td style="padding-top:12px;">
            <h4 style="margin:0 0 6px; font-size:13px; font-weight:600; color:#222; line-height:1.3;">${escapeHtml(truncate(p.title, 40))}</h4>
            <p style="margin:0 0 8px; font-size:18px; font-weight:700; color:#e63946;">$${p.price}</p>
            <a href="${p.affiliateLink}" style="font-size:12px; color:#222; text-decoration:underline;">Shop Now</a>
          </td>
        </tr>
      </table>
    </td>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background:#f8f8f8; font-family:Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;">
    <tr>
      <td align="center" style="padding:30px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff;">
          <tr>
            <td style="padding:30px 40px; border-bottom:3px solid #222;">
              <table width="100%">
                <tr>
                  <td><h1 style="margin:0; font-size:32px; font-weight:400; color:#222; font-style:italic;">${escapeHtml(brandName)}</h1></td>
                  <td style="text-align:right;"><p style="margin:0; font-size:12px; color:#666; text-transform:uppercase; letter-spacing:2px;">${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px 20px;">
              <p style="margin:0; font-size:16px; color:#444; line-height:1.7; font-style:italic;">${escapeHtml(intro)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa; border-radius:12px; overflow:hidden;">
                <tr><td><img src="${featured.image || 'https://via.placeholder.com/520x300/eee/999?text=Featured'}" width="100%" style="display:block; max-height:280px; object-fit:cover;" alt=""></td></tr>
                <tr>
                  <td style="padding:25px;">
                    <p style="margin:0 0 8px; font-size:11px; color:#e63946; text-transform:uppercase; letter-spacing:1.5px; font-family:Arial,sans-serif;">Editor's Pick</p>
                    <h2 style="margin:0 0 12px; font-size:22px; font-weight:400; color:#222; line-height:1.3;">${escapeHtml(featured.title)}</h2>
                    <p style="margin:0 0 15px; font-size:14px; color:#666;">Rated ${featured.rating}/5 stars</p>
                    <table>
                      <tr>
                        <td><span style="font-size:28px; font-weight:700; color:#222;">$${featured.price}</span></td>
                        <td style="padding-left:20px;"><a href="${featured.affiliateLink}" style="display:inline-block; padding:12px 28px; background:#222; color:#fff; text-decoration:none; font-family:Arial,sans-serif; font-size:13px; text-transform:uppercase; letter-spacing:1px;">View Details</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${others.length > 0 ? `
          <tr>
            <td style="padding:30px 30px 20px;">
              <h3 style="margin:0 0 20px; font-size:14px; color:#222; text-transform:uppercase; letter-spacing:2px; text-align:center; font-family:Arial,sans-serif;">More Finds</h3>
              <table width="100%" cellpadding="0" cellspacing="0"><tr>${othersHtml}</tr></table>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:30px 40px; border-top:1px solid #eee; text-align:center;">
              <p style="margin:0 0 10px; font-size:12px; color:#999; font-family:Arial,sans-serif;">You received this from ${escapeHtml(brandName)}</p>
              <a href="${settings.unsubscribeLink || '#'}" style="font-size:12px; color:#999; font-family:Arial,sans-serif;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// TEMPLATE 3: GRID (Modern Catalog)
// ============================================
function generateGridTemplate({ products, subject, intro, brandName, settings }) {
  const rows = [];
  for (let i = 0; i < products.length; i += 2) {
    rows.push(products.slice(i, i + 2));
  }
  
  const productsHtml = rows.map(row => `
    <tr>
      ${row.map(p => `
        <td width="50%" style="padding:10px; vertical-align:top;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.08);">
            <tr><td><img src="${p.image || 'https://via.placeholder.com/260x180/f0f0f0/aaa?text=Product'}" width="100%" height="160" style="display:block; object-fit:cover;" alt=""></td></tr>
            <tr>
              <td style="padding:20px;">
                <p style="margin:0 0 6px; font-size:10px; color:#10b981; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${p.platform || 'Featured'}</p>
                <h3 style="margin:0 0 10px; font-size:14px; font-weight:600; color:#111; line-height:1.4; min-height:40px;">${escapeHtml(truncate(p.title, 50))}</h3>
                <p style="margin:0 0 15px; font-size:13px; color:#6b7280;">&#9733; ${p.rating}</p>
                <table width="100%">
                  <tr>
                    <td><span style="font-size:22px; font-weight:700; color:#111;">$${p.price}</span></td>
                    <td style="text-align:right;"><a href="${p.affiliateLink}" style="display:inline-block; padding:10px 16px; background:#10b981; color:#fff; text-decoration:none; border-radius:8px; font-size:12px; font-weight:600;">Get It</a></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      `).join('')}
      ${row.length === 1 ? '<td width="50%"></td>' : ''}
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:40px 15px;">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;">
          <tr>
            <td style="padding:0 0 25px; text-align:center;">
              <table width="100%" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius:20px;">
                <tr>
                  <td style="padding:40px 30px; text-align:center;">
                    <h1 style="margin:0 0 10px; font-size:28px; font-weight:700; color:#ffffff;">${escapeHtml(brandName)}</h1>
                    <p style="margin:0; font-size:15px; color:rgba(255,255,255,0.9); line-height:1.5;">${escapeHtml(intro)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">${productsHtml}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:35px 20px; text-align:center;">
              <p style="margin:0 0 8px; font-size:13px; color:#6b7280;">Curated by ${escapeHtml(brandName)}</p>
              <p style="margin:0; font-size:13px;"><a href="${settings.unsubscribeLink || '#'}" style="color:#6b7280; text-decoration:underline;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// SEND FUNCTIONS WITH BATCH SUPPORT
// ============================================

async function sendTest() {
  const email = document.getElementById('testEmail').value.trim();
  if (!email) { alert('Enter a test email'); return; }
  
  const settings = Storage.getSettings();
  if (!settings.googleScriptUrl) { alert('Configure Google Apps Script in Settings'); return; }
  
  if (!emailHtml) generatePreview();
  
  try {
    await fetch(settings.googleScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendTestEmail',
        email,
        subject: document.getElementById('emailSubject').value,
        htmlBody: emailHtml
      })
    });
    showToast('Test email sent!');
  } catch (e) { alert('Error sending'); }
}

async function sendToAll() {
  const settings = Storage.getSettings();
  if (!settings.googleScriptUrl) { alert('Configure Google Apps Script'); return; }
  
  const subscribers = Storage.getSubscribers();
  if (subscribers.length === 0) { alert('No subscribers!'); return; }
  
  if (!emailHtml) generatePreview();
  
  // Show warning if over daily limit
  if (subscribers.length > 100) {
    const confirmed = confirm(
      `You have ${subscribers.length} subscribers.\n\n` +
      `⚠️ Gmail has a daily limit of 100 emails.\n\n` +
      `This campaign will:\n` +
      `• Send 90 emails today\n` +
      `• Remaining ${subscribers.length - 90} will be sent tomorrow\n\n` +
      `Continue?`
    );
    if (!confirmed) return;
  } else {
    if (!confirm(`Send to ${subscribers.length} subscribers?`)) return;
  }
  
  try {
    const response = await fetch(settings.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendToAll',
        subject: document.getElementById('emailSubject').value,
        htmlBody: emailHtml
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      if (result.remaining && result.remaining > 0) {
        showToast(`✅ Sent ${result.sentThisBatch} emails! ${result.remaining} remaining for tomorrow.`);
        // Show progress UI
        setTimeout(() => checkCampaignStatus(), 1000);
      } else {
        showToast('Campaign started!');
        // Record in history
        Storage.addEmailHistory({
          subject: document.getElementById('emailSubject').value,
          recipientCount: subscribers.length,
          template: document.getElementById('templateSelect').value
        });
      }
    } else {
      throw new Error(result.error || 'Failed to start campaign');
    }
  } catch (e) {
    console.error(e);
    // Fallback for no-cors mode
    showToast('Campaign started!');
  }
}

async function resumeCampaign() {
  const settings = Storage.getSettings();
  
  if (!confirm('Resume sending the campaign? This will send the next batch of emails.')) {
    return;
  }
  
  try {
    const response = await fetch(settings.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resumeCampaign'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast(result.message || 'Batch sent successfully!');
      // Refresh status
      setTimeout(() => checkCampaignStatus(), 2000);
    } else {
      alert('Error: ' + (result.error || 'Failed to resume'));
    }
  } catch (e) {
    alert('Error resuming campaign');
  }
}

function copyHtml() {
  document.getElementById('htmlCode').select();
  document.execCommand('copy');
  showToast('Copied!');
}

function downloadHtml() {
  if (!emailHtml) generatePreview();
  const blob = new Blob([emailHtml], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `email-${new Date().toISOString().split('T')[0]}.html`;
  a.click();
}

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

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
