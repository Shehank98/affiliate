/**
 * SETTINGS MODULE
 */

const GAS_CODE = `// Google Apps Script - Affiliate Hub Email Sender
// Replace SHEET_ID with your Google Sheet ID

const SHEET_ID = 'YOUR_SHEET_ID_HERE';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'sendTestEmail') {
      sendEmail(data.email, data.subject, data.htmlBody);
      return ContentService.createTextOutput(JSON.stringify({success: true}));
    }
    
    if (data.action === 'sendToAll') {
      sendToAllSubscribers(data.subject, data.htmlBody);
      return ContentService.createTextOutput(JSON.stringify({success: true}));
    }
    
    if (data.action === 'addSubscriber') {
      addSubscriber(data.email);
      return ContentService.createTextOutput(JSON.stringify({success: true}));
    }
    
    return ContentService.createTextOutput(JSON.stringify({error: 'Unknown action'}));
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.message}));
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({status: 'OK'}));
}

function sendEmail(recipient, subject, htmlBody) {
  GmailApp.sendEmail(recipient, subject, '', {
    htmlBody: htmlBody,
    name: 'Affiliate Deals'
  });
}

function sendToAllSubscribers(subject, htmlBody) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const email = data[i][0];
    if (email && email.includes('@')) {
      try {
        sendEmail(email, subject, htmlBody);
        Utilities.sleep(1000); // 1 sec delay
      } catch (e) {
        console.log('Failed: ' + email);
      }
    }
  }
}

function addSubscriber(email) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Check duplicate
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toLowerCase() === email.toLowerCase()) {
      return; // Already exists
    }
  }
  
  // Add new
  sheet.appendRow([email, new Date()]);
}`;

function initSettings() {
  const settings = Storage.getSettings();
  
  // Load values
  document.getElementById('gasUrl').value = settings.googleScriptUrl || '';
  document.getElementById('disclosure').value = settings.affiliateDisclosure || 'This email contains affiliate links.';
  document.getElementById('unsubscribe').value = settings.unsubscribeLink || '';
  
  // Update status
  const status = document.getElementById('gasStatus');
  if (settings.googleScriptUrl) {
    status.textContent = '✓ Configured';
    status.className = 'badge badge-success';
  } else {
    status.textContent = 'Not Set';
    status.className = 'badge badge-warning';
  }
  
  // Stats
  const stats = Storage.getStats();
  document.getElementById('statProducts').textContent = Storage.getProducts().length;
  document.getElementById('statSubs').textContent = Storage.getSubscribers().length;
  document.getElementById('statEmails').textContent = stats.emailsSent || 0;
  document.getElementById('statFb').textContent = stats.fbPosts || 0;
}

function saveGas() {
  const settings = Storage.getSettings();
  settings.googleScriptUrl = document.getElementById('gasUrl').value.trim();
  Storage.saveSettings(settings);
  showToast('Saved!');
  initSettings();
}

function saveEmail() {
  const settings = Storage.getSettings();
  settings.affiliateDisclosure = document.getElementById('disclosure').value.trim();
  settings.unsubscribeLink = document.getElementById('unsubscribe').value.trim();
  Storage.saveSettings(settings);
  showToast('Saved!');
}

function showCode() {
  document.getElementById('gasCode').textContent = GAS_CODE;
  document.getElementById('codeModal').classList.add('active');
}

function closeCode() {
  document.getElementById('codeModal').classList.remove('active');
}

function copyCode() {
  navigator.clipboard.writeText(GAS_CODE);
  showToast('Code copied!');
}

function exportData() {
  const data = Storage.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `affiliate-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast('Data exported!');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('This will replace all your data. Continue?')) return;
      Storage.importAll(data);
      showToast('Data imported!');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      alert('Invalid file');
    }
  };
  reader.readAsText(file);
}

function clearData() {
  if (!confirm('Delete ALL data? This cannot be undone!')) return;
  if (!confirm('Are you SURE?')) return;
  Storage.clearAll();
  showToast('Data cleared');
  setTimeout(() => location.reload(), 1000);
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
