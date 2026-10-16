// -------------------------------------------------------------------------
// TAROT WITH JIJI — FRONT-END INTERACTION CONTROLLER
// -------------------------------------------------------------------------

let servicesData = [];
let currentBookingState = {
  serviceId: 'tarot-1hr',
  fullName: '',
  email: '',
  phone: '',
  question: '',
  birthDate: '',
  birthTime: '',
  commMode: 'Text Chat',
  slotDate: '',
  slotTime: '',
  consent: false,
  activeBooking: null,
  holdTimerInterval: null
};

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadServices();
  initBookingWizard();
  initAdminModal();
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
});

// Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span> <div>${message}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// -------------------------------------------------------------------------
// NAVIGATION & ROUTING
// -------------------------------------------------------------------------
function initNavigation() {
  const links = document.querySelectorAll('.nav-link, [data-nav]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const target = link.getAttribute('data-nav') || link.getAttribute('href');
      if (target && target.startsWith('#')) {
        e.preventDefault();
        window.location.hash = target;
      }
    });
  });
}

function handleHashChange() {
  const hash = window.location.hash || '#home';
  const cleanHash = hash.replace('#', '');

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Handle section visibility
  const sections = ['home', 'services', 'book', 'about', 'legal-privacy', 'legal-terms', 'legal-refund', 'legal-disclaimer'];
  
  if (cleanHash === 'admin') {
    openAdminModal();
    return;
  }

  // Scroll to section or toggle view
  const targetEl = document.getElementById(cleanHash);
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'smooth' });
  }
}

// -------------------------------------------------------------------------
// SERVICES DATA LOADER
// -------------------------------------------------------------------------
async function loadServices() {
  try {
    const res = await fetch('/api/services');
    const data = await res.json();
    if (data.success) {
      servicesData = data.services;
      renderServicesGrid(servicesData);
      renderBookingServiceOptions(servicesData);
    }
  } catch (err) {
    console.error('Failed to load services:', err);
  }
}

function renderServicesGrid(services) {
  const grid = document.getElementById('services-grid-container');
  if (!grid) return;

  grid.innerHTML = services.map(s => {
    const isFeatured = s.id === 'tarot-1hr';
    return `
      <div class="service-card ${isFeatured ? 'featured' : ''}" data-service-id="${s.id}">
        <span class="card-ribbon ${isFeatured ? '' : 'gold'}">${s.badge}</span>
        <div class="service-icon-wrap">${s.icon}</div>
        <h3 class="service-title serif-heading">${s.name}</h3>
        <div class="service-meta">
          <span class="service-meta-tag">⏳ ${s.duration}</span>
          <span class="service-meta-tag">${s.type === 'live' ? '📞 Live Session' : '📄 Written Report'}</span>
        </div>
        <p class="service-desc">${s.description}</p>
        <div class="service-footer">
          <div class="service-price">
            <span class="price-currency">Fixed Offering</span>
            <span class="price-val">₹${s.price}</span>
          </div>
          <button class="btn-book-card" onclick="startBookingForService('${s.id}')">Book Reading</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderBookingServiceOptions(services) {
  const container = document.getElementById('service-selection-list');
  if (!container) return;

  container.innerHTML = services.map(s => `
    <div class="service-option-card ${s.id === currentBookingState.serviceId ? 'selected' : ''}" onclick="selectBookingService('${s.id}')" id="svc-opt-${s.id}">
      <div class="option-left">
        <input type="radio" name="selectedServiceRadio" value="${s.id}" ${s.id === currentBookingState.serviceId ? 'checked' : ''} class="option-radio">
        <div class="option-info">
          <h4 class="serif-heading">${s.name}</h4>
          <span class="option-desc">${s.duration} • ${s.turnaround}</span>
        </div>
      </div>
      <div class="option-price-tag">₹${s.price}</div>
    </div>
  `).join('');
}

function selectBookingService(serviceId) {
  currentBookingState.serviceId = serviceId;
  document.querySelectorAll('.service-option-card').forEach(card => card.classList.remove('selected'));
  const card = document.getElementById(`svc-opt-${serviceId}`);
  if (card) {
    card.classList.add('selected');
    card.querySelector('input[type="radio"]').checked = true;
  }

  // Update dynamic visibility for Birth Chart and Live slot
  const selectedSvc = servicesData.find(s => s.id === serviceId);
  updateFormConditionalFields(selectedSvc);
}

function startBookingForService(serviceId) {
  selectBookingService(serviceId);
  window.location.hash = '#book';
  goToWizardStep(1);
}

// -------------------------------------------------------------------------
// MULTI-STEP BOOKING WIZARD
// -------------------------------------------------------------------------
let currentStep = 1;

function initBookingWizard() {
  document.getElementById('btn-step1-next')?.addEventListener('click', () => {
    goToWizardStep(2);
  });

  document.getElementById('btn-step2-back')?.addEventListener('click', () => {
    goToWizardStep(1);
  });

  document.getElementById('btn-step2-next')?.addEventListener('click', () => {
    if (validateStep2()) {
      const selectedSvc = servicesData.find(s => s.id === currentBookingState.serviceId);
      if (selectedSvc && selectedSvc.type === 'live') {
        goToWizardStep(3);
        setupCalendarSlotSelector();
      } else {
        // Skip step 3 for written readings
        goToWizardStep(4);
        renderSummaryReview();
      }
    }
  });

  document.getElementById('btn-step3-back')?.addEventListener('click', () => {
    goToWizardStep(2);
  });

  document.getElementById('btn-step3-next')?.addEventListener('click', () => {
    if (!currentBookingState.slotDate || !currentBookingState.slotTime) {
      showToast('Please select a date and an available consultation slot.', 'warning');
      return;
    }
    goToWizardStep(4);
    renderSummaryReview();
  });

  document.getElementById('btn-step4-back')?.addEventListener('click', () => {
    const selectedSvc = servicesData.find(s => s.id === currentBookingState.serviceId);
    if (selectedSvc && selectedSvc.type === 'live') {
      goToWizardStep(3);
    } else {
      goToWizardStep(2);
    }
  });

  document.getElementById('btn-step4-confirm')?.addEventListener('click', submitBookingAndProceedToPayment);

  // UTR Submission button
  document.getElementById('btn-submit-utr')?.addEventListener('click', handleUtrSubmission);

  // Copy UPI ID button
  document.getElementById('btn-copy-upi')?.addEventListener('click', copyUpiId);

  // "I'll Pay Later" link
  document.getElementById('link-pay-later')?.addEventListener('click', handlePayLater);
}

function updateFormConditionalFields(service) {
  const birthGroup = document.getElementById('birth-details-group');
  const birthRequired = document.getElementById('birth-required-star');
  const commModeGroup = document.getElementById('comm-mode-group');

  if (!service) return;

  if (service.id === 'birth-chart') {
    if (birthRequired) birthRequired.style.display = 'inline';
  } else {
    if (birthRequired) birthRequired.style.display = 'none';
  }

  if (service.type === 'live') {
    if (commModeGroup) commModeGroup.style.display = 'block';
  } else {
    if (commModeGroup) commModeGroup.style.display = 'none';
  }
}

function goToWizardStep(step) {
  currentStep = step;
  document.querySelectorAll('.wizard-step-pane').forEach(p => p.classList.remove('active'));
  document.getElementById(`step-${step}-pane`)?.classList.add('active');

  // Update step indicators
  document.querySelectorAll('.step-indicator').forEach(ind => {
    const s = parseInt(ind.getAttribute('data-step'));
    ind.classList.remove('active', 'completed');
    if (s === step) {
      ind.classList.add('active');
    } else if (s < step) {
      ind.classList.add('completed');
    }
  });

  window.scrollTo({
    top: document.getElementById('booking-funnel').offsetTop - 60,
    behavior: 'smooth'
  });
}

function validateStep2() {
  const name = document.getElementById('input-fullName')?.value.trim();
  const email = document.getElementById('input-email')?.value.trim();
  const phone = document.getElementById('input-phone')?.value.trim();
  const question = document.getElementById('input-question')?.value.trim();
  const consent = document.getElementById('input-consent')?.checked;
  const birthDate = document.getElementById('input-birthDate')?.value;
  const birthTime = document.getElementById('input-birthTime')?.value;

  const selectedSvc = servicesData.find(s => s.id === currentBookingState.serviceId);

  if (!name) {
    showToast('Please enter your full name.', 'warning');
    return false;
  }
  if (!email || !email.includes('@')) {
    showToast('Please provide a valid email address.', 'warning');
    return false;
  }
  if (!phone || phone.length < 8) {
    showToast('Please provide your WhatsApp phone number with country code.', 'warning');
    return false;
  }
  if (!question) {
    showToast('Please share your specific question or intentions.', 'warning');
    return false;
  }
  if (selectedSvc && selectedSvc.id === 'birth-chart' && (!birthDate || !birthTime)) {
    showToast('Birth date and time are strictly required for Birth Chart reading.', 'warning');
    return false;
  }
  if (!consent) {
    showToast('Please consent to the intuitive guidance disclaimer.', 'warning');
    return false;
  }

  currentBookingState.fullName = name;
  currentBookingState.email = email;
  currentBookingState.phone = phone;
  currentBookingState.question = question;
  currentBookingState.birthDate = birthDate || '';
  currentBookingState.birthTime = birthTime || '';
  currentBookingState.consent = consent;

  const commRadio = document.querySelector('input[name="commMode"]:checked');
  if (commRadio) {
    currentBookingState.commMode = commRadio.value;
  }

  return true;
}

// -------------------------------------------------------------------------
// STEP 3: LIVE CALENDAR SLOT SELECTOR
// -------------------------------------------------------------------------
function setupCalendarSlotSelector() {
  const dateChipsContainer = document.getElementById('date-chips-container');
  if (!dateChipsContainer) return;

  // Generate next 7 dates
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    dates.push(d);
  }

  dateChipsContainer.innerHTML = dates.map((d, index) => {
    const isoDate = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    return `
      <div class="date-chip ${index === 0 ? 'active' : ''}" onclick="selectSlotDate('${isoDate}', this)">
        <div class="chip-day">${dayName}</div>
        <div class="chip-num">${dayNum}</div>
        <div style="font-size:0.75rem;">${monthName}</div>
      </div>
    `;
  }).join('');

  // Default to today
  const firstDate = dates[0].toISOString().split('T')[0];
  selectSlotDate(firstDate, dateChipsContainer.querySelector('.date-chip'));
}

async function selectSlotDate(isoDate, chipEl) {
  currentBookingState.slotDate = isoDate;
  document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');

  const slotsContainer = document.getElementById('slots-container');
  slotsContainer.innerHTML = '<div style="padding:20px; color:#777;">Checking sacred availability...</div>';

  try {
    const res = await fetch(`/api/slots?date=${isoDate}`);
    const data = await res.json();
    if (data.success) {
      renderSlotsGrid(data.slots);
    }
  } catch (err) {
    slotsContainer.innerHTML = '<div style="color:red;">Error loading slots. Please refresh.</div>';
  }
}

function renderSlotsGrid(slots) {
  const container = document.getElementById('slots-container');
  if (!container) return;

  container.innerHTML = slots.map(s => `
    <button type="button" class="slot-btn ${s.available ? '' : 'disabled'}" 
      ${s.available ? `onclick="selectSlotTime('${s.time}', this)"` : 'disabled'}>
      ${s.time}
    </button>
  `).join('');
}

function selectSlotTime(time, btnEl) {
  currentBookingState.slotTime = time;
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  btnEl.classList.add('selected');
}

// -------------------------------------------------------------------------
// STEP 4: SUMMARY REVIEW
// -------------------------------------------------------------------------
function renderSummaryReview() {
  const service = servicesData.find(s => s.id === currentBookingState.serviceId);
  const container = document.getElementById('summary-review-card');
  if (!container || !service) return;

  container.innerHTML = `
    <div class="review-item">
      <span><strong>Consultation Service:</strong></span>
      <span>${service.name}</span>
    </div>
    <div class="review-item">
      <span><strong>Delivery Format:</strong></span>
      <span>${service.type === 'live' ? `Live Session (${service.duration})` : 'Written Report within 48h'}</span>
    </div>
    ${service.type === 'live' ? `
      <div class="review-item">
        <span><strong>Reserved Slot:</strong></span>
        <span>${currentBookingState.slotDate} at ${currentBookingState.slotTime} IST</span>
      </div>
      <div class="review-item">
        <span><strong>Communication Mode:</strong></span>
        <span>${currentBookingState.commMode}</span>
      </div>
    ` : ''}
    <div class="review-item">
      <span><strong>Client Name:</strong></span>
      <span>${currentBookingState.fullName}</span>
    </div>
    <div class="review-item">
      <span><strong>Contact Details:</strong></span>
      <span>${currentBookingState.phone} • ${currentBookingState.email}</span>
    </div>
    <div class="review-item">
      <span><strong>Specific Intentions:</strong></span>
      <span style="max-width: 300px; text-align: right; font-style: italic;">"${currentBookingState.question}"</span>
    </div>
    <div class="review-item review-total">
      <span>Total Amount Payable:</span>
      <span>₹${service.price} INR</span>
    </div>
  `;
}

// -------------------------------------------------------------------------
// STEP 5: BOOKING SUBMISSION & MANUAL UPI PAYMENT SCREEN
// -------------------------------------------------------------------------
async function submitBookingAndProceedToPayment() {
  const confirmBtn = document.getElementById('btn-step4-confirm');
  confirmBtn.disabled = true;
  confirmBtn.innerText = 'Holding Sacred Slot...';

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentBookingState)
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Booking conflict or error. Please retry.', 'danger');
      confirmBtn.disabled = false;
      confirmBtn.innerText = 'Proceed to Payment →';
      return;
    }

    currentBookingState.activeBooking = data.booking;
    goToWizardStep(5);
    renderUpiPaymentScreen(data);
    startSlotHoldCountdown(data.booking.holdExpiresAt);
  } catch (err) {
    showToast('Failed to place booking. Please check your network.', 'danger');
    confirmBtn.disabled = false;
    confirmBtn.innerText = 'Proceed to Payment →';
  }
}

async function renderUpiPaymentScreen(bookingResponse) {
  const { booking, paymentDetails } = bookingResponse;
  
  document.getElementById('payee-display-name').innerText = paymentDetails.payeeName;
  document.getElementById('payee-upi-id').innerText = paymentDetails.upiId;
  document.getElementById('payment-amount-display').innerText = `₹${booking.amount}`;
  document.getElementById('booking-ref-display').innerText = booking.bookingRef;

  // Mobile Deep Link button
  const mobileLinkBtn = document.getElementById('btn-mobile-upi');
  if (mobileLinkBtn) {
    mobileLinkBtn.href = paymentDetails.upiLink;
  }

  // Fetch dynamic QR code
  try {
    const qrRes = await fetch(`/api/qr?amount=${booking.amount}&ref=${booking.bookingRef}`);
    const qrData = await qrRes.json();
    if (qrData.success) {
      document.getElementById('upi-qr-image').src = qrData.qrDataUrl;
    }
  } catch (err) {
    console.error('Error fetching QR:', err);
  }
}

function startSlotHoldCountdown(expiresAtTimestamp) {
  if (currentBookingState.holdTimerInterval) {
    clearInterval(currentBookingState.holdTimerInterval);
  }

  const timerEl = document.getElementById('hold-timer-display');
  const timerBar = document.getElementById('slot-hold-timer-bar');
  if (timerBar) timerBar.style.display = 'flex';

  function update() {
    const now = Date.now();
    const remaining = expiresAtTimestamp - now;

    if (remaining <= 0) {
      clearInterval(currentBookingState.holdTimerInterval);
      if (timerEl) timerEl.innerText = '00:00 (Hold Expired)';
      showToast('The 30-minute reservation hold has expired. Slot has been released.', 'warning');
      return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    if (timerEl) {
      timerEl.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }

  update();
  currentBookingState.holdTimerInterval = setInterval(update, 1000);
}

function copyUpiId() {
  const upiId = document.getElementById('payee-upi-id')?.innerText || 'jeevani.v@oksbi';
  navigator.clipboard.writeText(upiId).then(() => {
    const btn = document.getElementById('btn-copy-upi');
    btn.innerText = '✓ Copied!';
    setTimeout(() => { btn.innerText = 'Copy UPI ID'; }, 2000);
    showToast('UPI ID copied to clipboard.', 'success');
  });
}

// -------------------------------------------------------------------------
// 12-DIGIT UTR SUBMISSION & AWAITING VERIFICATION LIFECYCLE
// -------------------------------------------------------------------------
async function handleUtrSubmission() {
  const utrInput = document.getElementById('input-utr-number');
  const utrVal = utrInput?.value.trim();

  // Strict 12-digit numeric validation
  if (!/^\d{12}$/.test(utrVal)) {
    showToast('Invalid UTR: Please enter exactly 12 numeric digits from your UPI transaction.', 'warning');
    utrInput?.focus();
    return;
  }

  const booking = currentBookingState.activeBooking;
  if (!booking) {
    showToast('No active booking reference found. Please restart.', 'danger');
    return;
  }

  const submitBtn = document.getElementById('btn-submit-utr');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Submitting for Verification...';

  try {
    const res = await fetch(`/api/bookings/${booking.id}/submit-utr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ utrNumber: utrVal })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to submit UTR.', 'danger');
      submitBtn.disabled = false;
      submitBtn.innerText = 'Submit Transaction Reference';
      return;
    }

    // Success state lifecycle: Strictly show "Payment received, we are verifying it..."
    renderAwaitingVerificationScreen(data);
  } catch (err) {
    showToast('Network error while submitting UTR.', 'danger');
    submitBtn.disabled = false;
    submitBtn.innerText = 'Submit Transaction Reference';
  }
}

function renderAwaitingVerificationScreen(response) {
  const step5Pane = document.getElementById('step-5-pane');
  if (!step5Pane) return;

  step5Pane.innerHTML = `
    <div class="awaiting-verification-screen">
      <div class="verification-icon">⏳</div>
      <h2 class="serif-heading" style="color: var(--color-primary); margin-bottom: 12px;">Transaction Submitted</h2>
      
      <!-- STRICT COMPLIANCE WITH REQUIREMENT -->
      <div class="verification-banner-strict">
        "Payment received, we are verifying it. You will receive an email once confirmed."
      </div>

      <div style="background: #FFFDFB; border: 1px solid var(--color-border); border-radius: 8px; padding: 24px; max-width: 520px; margin: 24px auto; text-align: left;">
        <div style="margin-bottom: 10px;"><strong>Booking Reference:</strong> <span style="font-family: monospace; font-size: 1.1rem; color: #7A2E45;">${response.booking.bookingRef}</span></div>
        <div style="margin-bottom: 10px;"><strong>Service:</strong> ${response.booking.serviceName}</div>
        <div style="margin-bottom: 10px;"><strong>Submitted 12-Digit UTR:</strong> <span style="font-family: monospace; font-weight: bold;">${response.booking.utrNumber}</span></div>
        <div><strong>Status:</strong> <span class="status-badge awaiting">Awaiting Verification</span></div>
      </div>

      <p style="color: var(--color-text-muted); max-width: 520px; margin: 0 auto 30px; font-size: 0.95rem; line-height: 1.6;">
        Jiji cross-checks every UPI bank deposit personally. An instant alert has been dispatched to her private dashboard. As soon as your payment is matched, your official consultation confirmation and access details will be emailed to you.
      </p>

      <div style="display: flex; justify-content: center; gap: 16px;">
        <button class="btn-secondary" onclick="window.location.hash='#home'">Return to Home</button>
        <button class="btn-primary" onclick="openAdminModal()">View Owner Verification Portal</button>
      </div>
    </div>
  `;
}

function handlePayLater() {
  showToast('Booking saved with 30-minute hold active. You can complete payment before the timer expires.', 'info');
  window.location.hash = '#home';
}

// -------------------------------------------------------------------------
// PROTECTED ADMIN DASHBOARD & APPROVAL WORKFLOW
// -------------------------------------------------------------------------
let adminPin = '';
let currentFilter = 'all';

function initAdminModal() {
  document.getElementById('close-admin-modal')?.addEventListener('click', closeAdminModal);
  document.getElementById('btn-admin-login')?.addEventListener('click', handleAdminLogin);

  // Status Filter Tabs
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      loadAdminOrders();
    });
  });

  // Outbox view tab
  document.getElementById('btn-view-outbox')?.addEventListener('click', loadAdminEmails);
}

function openAdminModal() {
  const modal = document.getElementById('admin-modal-overlay');
  modal.classList.add('active');
  if (adminPin) {
    loadAdminOrders();
  }
}

function closeAdminModal() {
  const modal = document.getElementById('admin-modal-overlay');
  modal.classList.remove('active');
  if (window.location.hash === '#admin') {
    window.location.hash = '#home';
  }
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
      document.getElementById('admin-login-view').style.display = 'none';
      document.getElementById('admin-dashboard-view').style.display = 'block';
      loadAdminOrders();
    } else {
      showToast('Incorrect PIN. Access denied.', 'danger');
    }
  } catch (e) {
    showToast('Failed to authenticate.', 'danger');
  }
}

async function loadAdminOrders() {
  if (!adminPin) return;

  const tableBody = document.getElementById('admin-orders-tbody');
  tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Loading orders...</td></tr>';

  try {
    const url = currentFilter === 'all' ? '/api/admin/orders' : `/api/admin/orders?status=${currentFilter}`;
    const res = await fetch(url, { headers: { 'x-admin-pin': adminPin } });
    const data = await res.json();

    if (data.success) {
      renderAdminOrdersTable(data.orders);
    }
  } catch (err) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error loading orders</td></tr>';
  }
}

function renderAdminOrdersTable(orders) {
  const tableBody = document.getElementById('admin-orders-tbody');
  if (!tableBody) return;

  if (orders.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#777;">No orders found under this filter.</td></tr>';
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
          <span style="font-size:0.75rem; color:#888;">${new Date(o.createdAt).toLocaleDateString()}</span>
        </td>
        <td>
          <strong>${o.fullName}</strong><br>
          <span style="font-size:0.8rem; color:#666;">📞 ${o.phone}</span><br>
          <span style="font-size:0.8rem; color:#666;">✉️ ${o.email}</span>
        </td>
        <td>
          <strong>${o.serviceName}</strong><br>
          <span style="font-size:0.8rem; color:#888;">${o.slotDate ? `Slot: ${o.slotDate} ${o.slotTime} (${o.commMode})` : 'Written 48h Report'}</span>
        </td>
        <td>
          <span style="font-family:monospace; font-size:1.1rem; font-weight:bold; color:#7A2E45;">₹${o.amount}</span>
        </td>
        <td>
          ${o.utrNumber ? `<span style="font-family:monospace; font-weight:bold; background:#FFF0F4; padding:3px 6px; border-radius:4px; color:#7A2E45;">${o.utrNumber}</span>` : '<span style="color:#aaa;">Pending</span>'}
        </td>
        <td>
          <span class="status-badge ${statusClass}">${o.status}</span>
        </td>
        <td>
          ${canAction ? `
            <div class="action-btns">
              <button class="btn-approve" onclick="adminApproveOrder('${o.id}')">✓ Approve</button>
              <button class="btn-reject" onclick="adminRejectOrder('${o.id}')">✕ Reject</button>
            </div>
          ` : '<span style="font-size:0.8rem; color:#888;">Finalized</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

async function adminApproveOrder(orderId) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
      method: 'POST',
      headers: { 'x-admin-pin': adminPin }
    });
    const data = await res.json();
    if (data.success) {
      showToast(`✨ Order ${orderId} Confirmed! Consultation email sent.`, 'success');
      loadAdminOrders();
    } else {
      showToast(data.error || 'Failed to approve order.', 'danger');
    }
  } catch (err) {
    showToast('Failed to approve order.', 'danger');
  }
}

async function adminRejectOrder(orderId) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/reject`, {
      method: 'POST',
      headers: { 'x-admin-pin': adminPin }
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Order ${orderId} Rejected. Notification email sent.`, 'warning');
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
      showEmailViewerModal(data.emails);
    }
  } catch (e) {
    showToast('Failed to load email outbox', 'danger');
  }
}

function showEmailViewerModal(emails) {
  const container = document.getElementById('admin-modal-body-content');
  if (!container) return;

  container.innerHTML = `
    <div style="margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
      <h3 class="serif-heading" style="margin:0;">Simulated System Outbox (${emails.length} Emails Dispatched)</h3>
      <button class="btn-secondary" onclick="loadAdminOrders()" style="padding:6px 14px; font-size:0.85rem;">← Back to Orders Table</button>
    </div>
    <div style="display:flex; flex-direction:column; gap:16px;">
      ${emails.length === 0 ? '<p style="color:#777;">No emails logged yet.</p>' : emails.map(e => `
        <div style="border: 1px solid #E8D8D8; border-radius: 8px; padding: 18px; background: #FFFFFF;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.85rem; color:#666;">
            <span><strong>To:</strong> ${e.to}</span>
            <span>${new Date(e.timestamp).toLocaleTimeString()}</span>
          </div>
          <div style="font-weight:bold; color:#7A2E45; margin-bottom:12px;">${e.subject}</div>
          <div style="background:#F9F5F0; padding:12px; border-radius:6px; font-size:0.9rem;">
            ${e.bodyHtml}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
