// -------------------------------------------------------------------------
// TAROT WITH JIJI — SECURE OWNER PORTAL SCRIPT
// -------------------------------------------------------------------------
let adminPin = localStorage.getItem('jiji_admin_pin') || '';
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initAdminPortal();
});

function initAdminPortal() {
  document.getElementById('btn-admin-login')?.addEventListener('click', handleAdminLogin);
  document.getElementById('admin-pin-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAdminLogin();
  });

  // Status Filter Tabs
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    const filter = btn.getAttribute('data-filter');
    if (filter) {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = filter;
        loadAdminOrders();
      });
    }
  });

  document.getElementById('btn-refresh-orders')?.addEventListener('click', loadAdminOrders);
  document.getElementById('btn-view-outbox')?.addEventListener('click', loadAdminEmails);
  document.getElementById('btn-admin-logout')?.addEventListener('click', handleAdminLogout);

  // Auto-login if PIN stored in localStorage
  if (adminPin) {
    document.getElementById('admin-pin-input').value = adminPin;
    handleAdminLogin();
  }
}

function handleAdminLogout() {
  adminPin = '';
  localStorage.removeItem('jiji_admin_pin');
  document.getElementById('admin-dashboard-view').style.display = 'none';
  document.getElementById('admin-login-view').style.display = 'block';
  document.getElementById('admin-pin-input').value = '';
  showToast('Logged out successfully.', 'info');
}

async function handleAdminLogin() {
  const pinInput = document.getElementById('admin-pin-input');
  const pin = pinInput.value.trim();

  if (!pin) {
    showToast('Please enter the owner PIN.', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/admin/orders', {
      headers: { 'x-admin-pin': pin }
    });
    if (res.ok) {
      adminPin = pin;
      localStorage.setItem('jiji_admin_pin', pin);
      document.getElementById('admin-login-view').style.display = 'none';
      document.getElementById('admin-dashboard-view').style.display = 'flex';
      loadAdminOrders();
    } else {
      showToast('Incorrect PIN. Access denied.', 'danger');
    }
  } catch (e) {
    showToast('Failed to authenticate with server.', 'danger');
  }
}

async function loadAdminOrders() {
  if (!adminPin) return;

  const tableBody = document.getElementById('admin-orders-tbody');
  tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">🔮 Channeling sanctuary orders...</td></tr>';

  try {
    const url = currentFilter === 'all' ? '/api/admin/orders' : `/api/admin/orders?status=${encodeURIComponent(currentFilter)}`;
    const res = await fetch(url, { headers: { 'x-admin-pin': adminPin } });
    const data = await res.json();

    if (data.success) {
      renderAdminOrdersTable(data.orders);
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">${data.error || 'Failed to fetch orders'}</td></tr>`;
    }
  } catch (err) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">Error connecting to server.</td></tr>';
  }
}

function renderAdminOrdersTable(orders) {
  const tableBody = document.getElementById('admin-orders-tbody');
  if (!tableBody) return;

  if (orders.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#888;">No orders found under this filter.</td></tr>';
    return;
  }

  tableBody.innerHTML = orders.map(o => {
    let statusClass = 'pending';
    if (o.status === 'Awaiting Verification') statusClass = 'awaiting';
    else if (o.status === 'Confirmed') statusClass = 'confirmed';
    else if (o.status === 'Rejected') statusClass = 'rejected';
    else if (o.status === 'Expired') statusClass = 'expired';

    const canAction = o.status === 'Awaiting Verification' || o.status === 'Pending Payment';

    return `
      <tr>
        <td>
          <strong style="color: #7A2E45;">${o.bookingRef}</strong><br>
          <span style="font-size:0.75rem; color:#888;">${new Date(o.createdAt).toLocaleString()}</span>
        </td>
        <td>
          <strong>${o.fullName}</strong><br>
          <a href="https://wa.me/${o.phone.replace(/[^0-9]/g, '')}" target="_blank" style="font-size:0.82rem; color:#25D366; text-decoration:none; font-weight:600;">📱 WhatsApp: ${o.phone}</a><br>
          <span style="font-size:0.8rem; color:#666;">✉️ ${o.email}</span>
        </td>
        <td>
          <strong>${o.serviceName}</strong><br>
          <span style="font-size:0.8rem; color:#888;">${o.slotDate ? `Slot: ${o.slotDate} ${o.slotTime} (${o.commMode || 'Live'})` : 'Written 48h Report'}</span>
        </td>
        <td>
          <span style="font-family:monospace; font-size:1.15rem; font-weight:bold; color:#7A2E45;">₹${o.amount}</span>
        </td>
        <td>
          ${o.utrNumber ? `<span style="font-family:monospace; font-weight:bold; background:#FFF0F4; padding:4px 8px; border-radius:4px; color:#7A2E45; border:1px solid #E8D8D8;">${o.utrNumber}</span>` : '<span style="color:#aaa; font-style:italic;">Not submitted</span>'}
        </td>
        <td>
          <span class="status-badge ${statusClass}">${o.status}</span>
        </td>
        <td>
          ${canAction ? `
            <div class="action-btns" style="display:flex; gap:6px;">
              <button class="btn-approve" onclick="adminApproveOrder('${o.id}')" style="background:#2E7D32; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.82rem; font-weight:600;">✓ Approve</button>
              <button class="btn-reject" onclick="adminRejectOrder('${o.id}')" style="background:#C62828; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.82rem; font-weight:600;">✕ Reject</button>
            </div>
          ` : '<span style="font-size:0.82rem; color:#888;">Finalized</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

async function adminApproveOrder(orderId) {
  if (!confirm(`Are you sure you want to approve order ${orderId} and dispatch confirmation?`)) return;

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
      method: 'POST',
      headers: { 'x-admin-pin': adminPin }
    });
    const data = await res.json();
    if (data.success) {
      showToast(`✨ Order ${orderId} Confirmed! Confirmation logged.`, 'success');
      loadAdminOrders();
    } else {
      showToast(data.error || 'Failed to approve order.', 'danger');
    }
  } catch (err) {
    showToast('Failed to approve order.', 'danger');
  }
}

async function adminRejectOrder(orderId) {
  if (!confirm(`Reject order ${orderId}?`)) return;

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/reject`, {
      method: 'POST',
      headers: { 'x-admin-pin': adminPin }
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Order ${orderId} Rejected.`, 'warning');
      loadAdminOrders();
    } else {
      showToast(data.error || 'Failed to reject order.', 'danger');
    }
  } catch (err) {
    showToast('Failed to reject order.', 'danger');
  }
}

async function loadAdminEmails() {
  try {
    const res = await fetch('/api/admin/emails', { headers: { 'x-admin-pin': adminPin } });
    const data = await res.json();
    if (data.success) {
      showEmailViewer(data.emails);
    }
  } catch (e) {
    showToast('Failed to load email outbox', 'danger');
  }
}

function showEmailViewer(emails) {
  const container = document.getElementById('admin-modal-body-content');
  if (!container) return;

  container.innerHTML = `
    <div style="margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center;">
      <h3 class="serif-heading" style="margin:0;">Simulated System Outbox (${emails.length} Emails Dispatched)</h3>
      <button class="btn-secondary" onclick="loadAdminOrders()" style="padding:8px 16px; font-size:0.85rem;">← Back to Orders Table</button>
    </div>
    <div style="display:flex; flex-direction:column; gap:16px;">
      ${emails.length === 0 ? '<p style="color:#777; padding:30px; text-align:center;">No emails logged yet.</p>' : emails.map(e => `
        <div style="border: 1px solid #E8D8D8; border-radius: 8px; padding: 18px; background: #FFFFFF; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.85rem; color:#666;">
            <span><strong>To:</strong> ${e.to}</span>
            <span>${new Date(e.timestamp).toLocaleString()}</span>
          </div>
          <div style="font-weight:bold; color:#7A2E45; margin-bottom:12px;">${e.subject}</div>
          <div style="background:#F9F5F0; padding:14px; border-radius:6px; font-size:0.9rem;">
            ${e.bodyHtml}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>✦</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s forwards ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
