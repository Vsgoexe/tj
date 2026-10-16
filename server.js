const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const EMAILS_FILE = path.join(DATA_DIR, 'emails.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if not present
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(EMAILS_FILE)) {
  fs.writeFileSync(EMAILS_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Owner Config
const OWNER_CONFIG = {
  payeeName: process.env.PAYEE_NAME || 'jeevani V',
  upiId: process.env.UPI_ID || 'jeevani.v@oksbi',
  ownerEmail: process.env.OWNER_EMAIL || 'jeevani.tarot@gmail.com',
  ownerPhone: process.env.OWNER_PHONE || '919741785505',
  adminPin: process.env.ADMIN_PIN || 'jiji2026',
  holdDurationMs: 30 * 60 * 1000 // 30 minutes
};

// 7 Services authoritative specification
const SERVICES = [
  {
    id: 'tarot-1hr',
    name: 'Tarot Reading 1hr (Chat/Call)',
    price: 999,
    duration: '60 minutes',
    type: 'live',
    turnaround: 'Live Session via WhatsApp or Google Meet',
    description: 'An expansive, immersive live consultation diving deep into your life path, celestial alignments, hidden obstacles, and spiritual destiny. Dedicated 60 minutes of real-time intuitive guidance.',
    badge: 'Signature Live Reading',
    icon: '🔮'
  },
  {
    id: 'tarot-10min',
    name: 'Tarot Reading 10 Min (In-Depth)',
    price: 200,
    duration: '10 minutes',
    type: 'live',
    turnaround: 'Live Quick Session via WhatsApp or Google Meet',
    description: 'A focused, rapid-fire intuitive spread targeted at one urgent crossroad, decision, or burning question. Crisp, razor-sharp clarity in 10 minutes.',
    badge: 'Urgent Clarity',
    icon: '⚡'
  },
  {
    id: 'pick-a-card',
    name: 'Pick a Card Reading',
    price: 300,
    duration: 'Written Report',
    type: 'written',
    turnaround: 'Delivered within 48 hours',
    description: 'Intuitive card pile analysis channeled specifically for your energy resonance. Includes high-resolution photos of your drawn cards and comprehensive intuitive channeled interpretation.',
    badge: 'Written Channeled Report',
    icon: '🎴'
  },
  {
    id: 'future-predictions',
    name: 'Future Predictions',
    price: 300,
    duration: 'Written Report',
    type: 'written',
    turnaround: 'Delivered within 48 hours',
    description: 'A comprehensive 6 to 12 month timeline forecast analyzing upcoming energetic shifts, unexpected opportunities, warnings, and astrological catalysts heading your way.',
    badge: 'Timeline Forecast',
    icon: '⏳'
  },
  {
    id: 'birth-chart',
    name: 'Birth Chart Reading',
    price: 150,
    duration: 'Written Astrological Analysis',
    type: 'written',
    turnaround: 'Delivered within 48 hours',
    description: 'An in-depth astrological blueprint uncovering your natal placements, planetary aspects, rising sign nuances, soul karmic lessons, and celestial strengths.',
    badge: 'Astrological Analysis',
    icon: '✨'
  },
  {
    id: 'career-reading',
    name: 'Career Reading',
    price: 150,
    duration: 'Written Guidance',
    type: 'written',
    turnaround: 'Delivered within 48 hours',
    description: 'Strategic vocational guidance targeting professional dilemmas, career pivots, business ventures, financial roadblocks, and optimal timing for breakthrough ventures.',
    badge: 'Vocational Guidance',
    icon: '🌿'
  },
  {
    id: 'love-reading',
    name: 'Love Reading',
    price: 200,
    duration: 'Written Report',
    type: 'written',
    turnaround: 'Delivered within 48 hours',
    description: 'Sacred exploration of relationship dynamics, soulmate connections, karmic contracts, emotional blockages, and future trajectories for your romantic journey.',
    badge: 'Relationship Dynamics',
    icon: '🌹'
  }
];

// Helper Functions
function getBookings() {
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, 'utf8');
    const bookings = JSON.parse(raw);
    
    // Auto-release expired holds on "Pending Payment" orders
    const now = Date.now();
    let updated = false;
    bookings.forEach(b => {
      if (b.status === 'Pending Payment' && b.holdExpiresAt && now > b.holdExpiresAt) {
        b.status = 'Expired';
        updated = true;
      }
    });
    if (updated) {
      saveBookings(bookings);
    }
    return bookings;
  } catch (e) {
    return [];
  }
}

function saveBookings(bookings) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

function getEmails() {
  try {
    const raw = fs.readFileSync(EMAILS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function logEmail(email) {
  const emails = getEmails();
  const entry = {
    id: 'EML-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    ...email
  };
  emails.unshift(entry);
  fs.writeFileSync(EMAILS_FILE, JSON.stringify(emails, null, 2));
  return entry;
}

function generateBookingRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'TJ-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

function generateActionToken(orderId, action) {
  // Simple deterministic token for simulation (in production uses HMAC with secret)
  return Buffer.from(`${orderId}:${action}:${OWNER_CONFIG.adminPin}:sacred_jiji`).toString('base64url');
}

function verifyActionToken(orderId, action, token) {
  const expected = generateActionToken(orderId, action);
  return expected === token;
}

// ---------------------------------------------------------------------------
// API ENDPOINTS
// ---------------------------------------------------------------------------

// 1. Get services
app.get('/api/services', (req, res) => {
  res.json({ success: true, services: SERVICES });
});

// 2. Get available slots for live readings
app.get('/api/slots', (req, res) => {
  const { date } = req.query; // format: YYYY-MM-DD
  if (!date) {
    return res.status(400).json({ error: 'Date query parameter is required (YYYY-MM-DD).' });
  }

  // Standard live slots available each day
  const standardSlots = [
    '10:00 AM',
    '11:30 AM',
    '02:00 PM',
    '03:30 PM',
    '05:00 PM',
    '06:30 PM',
    '08:00 PM'
  ];

  const bookings = getBookings();
  const now = Date.now();

  // Filter slots booked or held for that date
  const takenSlots = bookings
    .filter(b => b.slotDate === date && (b.status === 'Confirmed' || b.status === 'Awaiting Verification' || (b.status === 'Pending Payment' && b.holdExpiresAt && b.holdExpiresAt > now)))
    .map(b => b.slotTime);

  const availability = standardSlots.map(time => ({
    time,
    available: !takenSlots.includes(time)
  }));

  res.json({ success: true, date, slots: availability });
});

// 3. Create a booking (Step 1 to 4 completion -> enters Pending Payment)
app.post('/api/bookings', (req, res) => {
  const {
    serviceId,
    fullName,
    email,
    phone,
    question,
    birthDate,
    birthTime,
    commMode,
    slotDate,
    slotTime,
    consent
  } = req.body;

  // Validation
  const service = SERVICES.find(s => s.id === serviceId);
  if (!service) {
    return res.status(400).json({ error: 'Invalid service selected.' });
  }
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'WhatsApp phone number with country code is required.' });
  }
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Specific question or focus area is required.' });
  }
  if (!consent) {
    return res.status(400).json({ error: 'You must consent to the intuitive guidance disclaimer.' });
  }
  if (service.id === 'birth-chart' && (!birthDate || !birthTime)) {
    return res.status(400).json({ error: 'Birth date and birth time are strictly required for Birth Chart reading.' });
  }

  const now = Date.now();
  const bookings = getBookings();

  // If live service, verify slot availability
  if (service.type === 'live') {
    if (!slotDate || !slotTime) {
      return res.status(400).json({ error: 'Live calendar slot date and time are required for this reading.' });
    }
    const isConflict = bookings.some(b => 
      b.slotDate === slotDate &&
      b.slotTime === slotTime &&
      (b.status === 'Confirmed' || b.status === 'Awaiting Verification' || (b.status === 'Pending Payment' && b.holdExpiresAt > now))
    );
    if (isConflict) {
      return res.status(409).json({ error: 'This calendar slot was just claimed. Please pick another available slot.' });
    }
  }

  const bookingRef = generateBookingRef();
  const holdExpiresAt = now + OWNER_CONFIG.holdDurationMs;

  const newBooking = {
    id: bookingRef,
    bookingRef,
    serviceId: service.id,
    serviceName: service.name,
    serviceType: service.type,
    amount: service.price, // Integer INR
    fullName: fullName.trim(),
    email: email.trim(),
    phone: phone.trim(),
    question: question.trim(),
    birthDate: birthDate || null,
    birthTime: birthTime || null,
    commMode: service.type === 'live' ? (commMode || 'Text Chat') : null,
    slotDate: slotDate || null,
    slotTime: slotTime || null,
    consent: true,
    status: 'Pending Payment', // Initial status
    utrNumber: null,
    createdAt: new Date().toISOString(),
    holdExpiresAt: holdExpiresAt,
    history: [
      {
        status: 'Pending Payment',
        timestamp: new Date().toISOString(),
        note: 'Order created. 30-minute slot hold active.'
      }
    ]
  };

  bookings.push(newBooking);
  saveBookings(bookings);

  // Return payment details and UPI link
  const upiLink = `upi://pay?pa=${encodeURIComponent(OWNER_CONFIG.upiId)}&pn=${encodeURIComponent(OWNER_CONFIG.payeeName)}&am=${service.price}&cu=INR&tn=Tarot-${bookingRef}`;

  res.status(201).json({
    success: true,
    booking: newBooking,
    paymentDetails: {
      payeeName: OWNER_CONFIG.payeeName,
      upiId: OWNER_CONFIG.upiId,
      amount: service.price,
      bookingRef,
      holdExpiresAt,
      upiLink
    }
  });
});

// 4. Generate UPI QR Code image
app.get('/api/qr', async (req, res) => {
  const { amount, ref } = req.query;
  const bookingRef = ref || 'Tarot-Consultation';
  const price = amount || '999';
  const upiString = `upi://pay?pa=${OWNER_CONFIG.upiId}&pn=${encodeURIComponent(OWNER_CONFIG.payeeName)}&am=${price}&cu=INR&tn=Tarot-${bookingRef}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(upiString, {
      width: 320,
      margin: 2,
      color: {
        dark: '#7A2E45', // Deep Royal Wine color
        light: '#FFFDFB'  // Warm Parchment background
      }
    });
    res.json({ success: true, qrDataUrl, upiString });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR Code' });
  }
});

// 5. Submit 12-digit UTR (transitions Pending Payment -> Awaiting Verification)
app.post('/api/bookings/:id/submit-utr', (req, res) => {
  const bookingId = req.params.id;
  const { utrNumber } = req.body;

  if (!utrNumber || typeof utrNumber !== 'string') {
    return res.status(400).json({ error: '12-digit UPI Transaction ID / UTR is required.' });
  }

  const cleanUtr = utrNumber.trim();
  // Strict 12-digit numeric validation
  if (!/^\d{12}$/.test(cleanUtr)) {
    return res.status(400).json({ error: 'Invalid UTR: Must be exactly 12 numeric digits.' });
  }

  const bookings = getBookings();
  const booking = bookings.find(b => b.id === bookingId || b.bookingRef === bookingId);

  if (!booking) {
    return res.status(404).json({ error: 'Booking order not found.' });
  }

  // Enforce Database Uniqueness across all bookings
  const duplicate = bookings.find(b => b.utrNumber === cleanUtr && b.id !== booking.id);
  if (duplicate) {
    return res.status(409).json({
      error: `UTR ${cleanUtr} has already been submitted for another booking (${duplicate.bookingRef}). Each transaction ID can only be used once.`
    });
  }

  // Update Status
  booking.utrNumber = cleanUtr;
  booking.status = 'Awaiting Verification';
  booking.utrSubmittedAt = new Date().toISOString();
  booking.history.push({
    status: 'Awaiting Verification',
    timestamp: new Date().toISOString(),
    note: `Customer submitted UTR: ${cleanUtr}. Awaiting owner manual verification.`
  });

  saveBookings(bookings);

  // Generate safe 2-step verification action links for owner email
  const approveToken = generateActionToken(booking.id, 'approve');
  const rejectToken = generateActionToken(booking.id, 'reject');
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const approveUrl = `${baseUrl}/api/verify-action?order=${booking.id}&action=approve&token=${approveToken}`;
  const rejectUrl = `${baseUrl}/api/verify-action?order=${booking.id}&action=reject&token=${rejectToken}`;

  // Trigger Instant Notification Email to Owner
  const ownerEmailContent = {
    to: OWNER_CONFIG.ownerEmail,
    subject: `🔔 [Action Required] New Payment Awaiting Verification: ₹${booking.amount} from ${booking.fullName} (${booking.bookingRef})`,
    bodyHtml: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FFFDFB; border: 1px solid #E8D8D8; color: #1E1E24; border-radius: 8px;">
        <h2 style="color: #7A2E45; border-bottom: 2px solid #E8D8D8; padding-bottom: 12px; margin-top: 0;">Tarot with Jiji — Payment Verification Notice</h2>
        <p>A client has submitted a 12-digit UPI transaction reference for manual verification:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 15px;">
          <tr style="background: #F9F5F0;"><td style="padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;">Booking Reference</td><td style="padding: 10px; border: 1px solid #E8D8D8;">${booking.bookingRef}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;">Client Name</td><td style="padding: 10px; border: 1px solid #E8D8D8;">${booking.fullName}</td></tr>
          <tr style="background: #F9F5F0;"><td style="padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;">Service</td><td style="padding: 10px; border: 1px solid #E8D8D8;">${booking.serviceName}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;">Amount Expected</td><td style="padding: 10px; border: 1px solid #E8D8D8; font-size: 18px; color: #7A2E45; font-weight: bold;">₹${booking.amount}</td></tr>
          <tr style="background: #FFF0F4;"><td style="padding: 10px; font-weight: bold; border: 1px solid #E8D8D8; color: #7A2E45;">Submitted 12-digit UTR</td><td style="padding: 10px; border: 1px solid #E8D8D8; font-family: monospace; font-size: 17px; font-weight: bold; color: #7A2E45;">${cleanUtr}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;">Client Contact</td><td style="padding: 10px; border: 1px solid #E8D8D8;">${booking.phone} / ${booking.email}</td></tr>
          ${booking.slotDate ? `<tr style="background: #F9F5F0;"><td style="padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;">Consultation Slot</td><td style="padding: 10px; border: 1px solid #E8D8D8;">${booking.slotDate} at ${booking.slotTime} (${booking.commMode})</td></tr>` : ''}
          <tr><td style="padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;">Client's Question</td><td style="padding: 10px; border: 1px solid #E8D8D8; font-style: italic;">"${booking.question}"</td></tr>
        </table>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${approveUrl}" style="background-color: #2e7d32; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block; margin-right: 12px;">✓ Approve Payment</a>
          <a href="${rejectUrl}" style="background-color: #c62828; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">✕ Reject Payment</a>
        </div>
        
        <p style="font-size: 12px; color: #666; border-top: 1px solid #E8D8D8; padding-top: 12px;">
          <strong>Security Note:</strong> These links open an intermediate confirmation screen requiring an explicit confirmation click to prevent accidental triggers from email security scanners.
        </p>
      </div>
    `
  };
  logEmail(ownerEmailContent);

  // Send polite automated acknowledgment email to customer
  const customerAckEmail = {
    to: booking.email,
    subject: `We have received your payment reference — Tarot with Jiji (${booking.bookingRef})`,
    bodyHtml: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FFFDFB; border: 1px solid #E8D8D8; color: #1E1E24; border-radius: 8px;">
        <h2 style="color: #7A2E45;">Payment Received — Verification in Progress</h2>
        <p>Dear ${booking.fullName},</p>
        <p>Thank you for submitting your payment reference (UTR: <strong>${cleanUtr}</strong>) for your reading: <em>${booking.serviceName}</em>.</p>
        <div style="background: #F9F5F0; padding: 16px; border-left: 4px solid #7A2E45; margin: 18px 0;">
          <p style="margin: 0; font-weight: 500;">Payment received, we are verifying it. You will receive an email once confirmed.</p>
        </div>
        <p>Jiji personally verifies each transaction before initiating your consultation or channeled report. We honor your trust and look forward to sharing sacred clarity with you.</p>
        <p style="margin-top: 24px;">Warm blessings,<br><strong>Tarot with Jiji</strong></p>
      </div>
    `
  };
  logEmail(customerAckEmail);

  res.json({
    success: true,
    status: 'Awaiting Verification',
    message: 'Payment received, we are verifying it. You will receive an email once confirmed.',
    booking: {
      bookingRef: booking.bookingRef,
      serviceName: booking.serviceName,
      status: booking.status,
      utrNumber: cleanUtr
    }
  });
});

// 6. Get single booking status
app.get('/api/bookings/:id', (req, res) => {
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === req.params.id || b.bookingRef === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }
  res.json({ success: true, booking });
});

// ---------------------------------------------------------------------------
// OWNER INTERMEDIATE VERIFICATION (Protects against Antivirus Prefetch Bots)
// ---------------------------------------------------------------------------

// GET /api/verify-action: Displays intermediate confirmation screen
app.get('/api/verify-action', (req, res) => {
  const { order, action, token } = req.query;

  if (!order || !action || !token) {
    return res.status(400).send('<h1>Invalid or incomplete link</h1>');
  }

  if (!verifyActionToken(order, action, token)) {
    return res.status(403).send('<h1>Security verification failed or expired token.</h1>');
  }

  const bookings = getBookings();
  const booking = bookings.find(b => b.id === order || b.bookingRef === order);
  if (!booking) {
    return res.status(404).send('<h1>Booking not found</h1>');
  }

  const isApprove = action === 'approve';
  const actionColor = isApprove ? '#2e7d32' : '#c62828';
  const actionText = isApprove ? 'Approve Payment' : 'Reject Payment';
  const actionDesc = isApprove
    ? 'This will confirm the booking, mark payment as verified, and immediately dispatch the official booking confirmation email with session instructions to the client.'
    : 'This will reject the payment reference and send a polite notification email to the client with a link to retry.';

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirm Action — Tarot with Jiji</title>
      <style>
        body { font-family: 'Georgia', serif; background-color: #F9F5F0; color: #1E1E24; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: #FFFDFB; max-width: 540px; width: 100%; border: 1px solid #E8D8D8; border-radius: 12px; padding: 32px; box-shadow: 0 10px 30px rgba(122,46,69,0.08); }
        h1 { color: #7A2E45; font-size: 24px; margin-top: 0; border-bottom: 1px solid #E8D8D8; padding-bottom: 16px; }
        .details { background: #F9F5F0; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 15px; line-height: 1.6; }
        .btn-confirm { background: ${actionColor}; color: white; border: none; padding: 14px 28px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%; transition: opacity 0.2s; }
        .btn-confirm:hover { opacity: 0.9; }
        .note { font-size: 13px; color: #666; margin-top: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Tarot with Jiji — Action Confirmation</h1>
        <p style="font-weight: 500;">You are about to <strong>${actionText}</strong> for the following order:</p>
        <div class="details">
          <div><strong>Booking Ref:</strong> ${booking.bookingRef}</div>
          <div><strong>Client Name:</strong> ${booking.fullName}</div>
          <div><strong>Service:</strong> ${booking.serviceName}</div>
          <div><strong>Amount:</strong> ₹${booking.amount}</div>
          <div><strong>Submitted UTR:</strong> <span style="font-family: monospace; font-weight: bold; color: #7A2E45;">${booking.utrNumber || 'N/A'}</span></div>
          <div><strong>Current Status:</strong> ${booking.status}</div>
        </div>
        <p style="color: #4A4A54; font-size: 14px;">${actionDesc}</p>
        <form method="POST" action="/api/verify-action">
          <input type="hidden" name="order" value="${booking.id}">
          <input type="hidden" name="action" value="${action}">
          <input type="hidden" name="token" value="${token}">
          <button type="submit" class="btn-confirm">Yes, ${actionText}</button>
        </form>
        <div class="note">Anti-bot protection active. Action will only execute on explicit POST submit.</div>
      </div>
    </body>
    </html>
  `);
});

// POST /api/verify-action: Safely performs state change
app.post('/api/verify-action', (req, res) => {
  const { order, action, token } = req.body;

  if (!order || !action || !token || !verifyActionToken(order, action, token)) {
    return res.status(403).send('<h1>Forbidden: Invalid verification parameters</h1>');
  }

  const bookings = getBookings();
  const booking = bookings.find(b => b.id === order || b.bookingRef === order);
  if (!booking) {
    return res.status(404).send('<h1>Booking not found</h1>');
  }

  if (action === 'approve') {
    booking.status = 'Confirmed';
    booking.approvedAt = new Date().toISOString();
    booking.history.push({
      status: 'Confirmed',
      timestamp: new Date().toISOString(),
      note: 'Payment verified and approved by owner.'
    });
    saveBookings(bookings);

    // Send automated booking confirmation email to customer
    const confirmationEmail = {
      to: booking.email,
      subject: `✨ [CONFIRMED] Your Sacred Reading with Jiji is Scheduled (${booking.bookingRef})`,
      bodyHtml: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 28px; background: #FFFDFB; border: 2px solid #7A2E45; color: #1E1E24; border-radius: 8px;">
          <h2 style="color: #7A2E45; text-align: center; margin-top: 0;">Your Reading is Confirmed ✨</h2>
          <p>Dear ${booking.fullName},</p>
          <p>Your payment of <strong>₹${booking.amount}</strong> has been successfully verified by Jiji. Your sacred space is held.</p>
          
          <div style="background: #F9F5F0; border-left: 4px solid #7A2E45; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${booking.serviceName}</p>
            <p style="margin: 0 0 8px 0;"><strong>Booking Reference:</strong> ${booking.bookingRef}</p>
            ${booking.slotDate ? `<p style="margin: 0 0 8px 0;"><strong>Scheduled Time:</strong> ${booking.slotDate} at ${booking.slotTime} IST</p>` : `<p style="margin: 0 0 8px 0;"><strong>Turnaround:</strong> Within 48 hours to this email and WhatsApp</p>`}
            ${booking.commMode ? `<p style="margin: 0;"><strong>Session Mode:</strong> ${booking.commMode} via WhatsApp (+91 98845 21000) or Google Meet</p>` : ''}
          </div>

          <h3 style="color: #7A2E45; margin-top: 24px;">Preparing for Your Session:</h3>
          <ul style="color: #4A4A54; line-height: 1.6;">
            <li>Take 5 minutes prior to ground your energy and reflect on your questions.</li>
            <li>Ensure you are in a quiet, undisturbed sanctuary.</li>
            <li>For live readings, Jiji will reach out on WhatsApp (+91 ${booking.phone}) 5 minutes before your scheduled slot.</li>
          </ul>

          <p style="margin-top: 28px; text-align: center; font-style: italic; color: #7A2E45;">"The cards reveal the energies at play, but your free will creates the destiny."</p>
          <p style="text-align: center;">With celestial warmth and light,<br><strong>Jiji (Jeevani V)</strong><br><span style="font-size: 13px; color: #777;">Tarot with Jiji</span></p>
        </div>
      `
    };
    logEmail(confirmationEmail);

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Approved — Tarot with Jiji</title>
        <style>
          body { font-family: 'Georgia', serif; background-color: #F9F5F0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 12px; border: 1px solid #E8D8D8; text-align: center; max-width: 500px; }
          h2 { color: #2e7d32; margin-top: 0; }
          a { display: inline-block; margin-top: 20px; background: #7A2E45; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>✓ Payment Approved Successfully!</h2>
          <p>Order <strong>${booking.bookingRef}</strong> has been marked as <strong>Confirmed</strong>.</p>
          <p>The client (${booking.fullName}) has been sent their full consultation confirmation email.</p>
          <a href="/#admin">Return to Admin Dashboard</a>
        </div>
      </body>
      </html>
    `);
  } else if (action === 'reject') {
    booking.status = 'Rejected';
    booking.rejectedAt = new Date().toISOString();
    booking.history.push({
      status: 'Rejected',
      timestamp: new Date().toISOString(),
      note: 'Payment reference could not be verified and was rejected by owner.'
    });
    saveBookings(bookings);

    // Send polite rejection email with retry link
    const rejectionEmail = {
      to: booking.email,
      subject: `Update regarding your Tarot with Jiji booking (${booking.bookingRef})`,
      bodyHtml: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FFFDFB; border: 1px solid #E8D8D8; color: #1E1E24; border-radius: 8px;">
          <h2 style="color: #7A2E45;">Payment Verification Update</h2>
          <p>Dear ${booking.fullName},</p>
          <p>We attempted to verify the 12-digit transaction ID provided (<strong>${booking.utrNumber}</strong>) for your reading (${booking.serviceName}), but our bank records did not reflect a matching receipt for ₹${booking.amount}.</p>
          <p>This occasionally happens due to bank delays or typos in the UTR digits. If you believe this is an error or would like to submit the corrected transaction ID, please reach out to us directly or retry via our booking portal.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${req.protocol}://${req.get('host')}/#book" style="background-color: #7A2E45; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px;">Retry Booking / Contact Jiji</a>
          </div>
          <p>Warm regards,<br><strong>Tarot with Jiji Team</strong></p>
        </div>
      `
    };
    logEmail(rejectionEmail);

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Rejected — Tarot with Jiji</title>
        <style>
          body { font-family: 'Georgia', serif; background-color: #F9F5F0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 12px; border: 1px solid #E8D8D8; text-align: center; max-width: 500px; }
          h2 { color: #c62828; margin-top: 0; }
          a { display: inline-block; margin-top: 20px; background: #7A2E45; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>✕ Payment Rejected</h2>
          <p>Order <strong>${booking.bookingRef}</strong> has been marked as <strong>Rejected</strong>.</p>
          <p>A polite notification email has been dispatched to ${booking.fullName}.</p>
          <a href="/#admin">Return to Admin Dashboard</a>
        </div>
      </body>
      </html>
    `);
  }
});

// ---------------------------------------------------------------------------
// ADMIN DASHBOARD REST APIs
// ---------------------------------------------------------------------------

// Middleware to protect admin endpoints
function requireAdminAuth(req, res, next) {
  const pin = req.headers['x-admin-pin'] || req.query.pin;
  if (pin !== OWNER_CONFIG.adminPin) {
    return res.status(401).json({ error: 'Unauthorized. Invalid Admin PIN.' });
  }
  next();
}

// Get all orders with optional status filter
app.get('/api/admin/orders', requireAdminAuth, (req, res) => {
  const { status } = req.query;
  let bookings = getBookings();
  if (status && status !== 'all') {
    bookings = bookings.filter(b => b.status.toLowerCase() === status.toLowerCase());
  }
  bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, count: bookings.length, orders: bookings });
});

// 1-click Approve from Admin Dashboard
app.post('/api/admin/orders/:id/approve', requireAdminAuth, (req, res) => {
  const bookingId = req.params.id;
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === bookingId || b.bookingRef === bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Order not found' });
  }

  booking.status = 'Confirmed';
  booking.approvedAt = new Date().toISOString();
  booking.history.push({
    status: 'Confirmed',
    timestamp: new Date().toISOString(),
    note: 'Manually approved via Admin Dashboard by Jiji.'
  });
  saveBookings(bookings);

  // Send customer confirmation email
  const confirmationEmail = {
    to: booking.email,
    subject: `✨ [CONFIRMED] Your Sacred Reading with Jiji is Scheduled (${booking.bookingRef})`,
    bodyHtml: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 28px; background: #FFFDFB; border: 2px solid #7A2E45; color: #1E1E24; border-radius: 8px;">
        <h2 style="color: #7A2E45; text-align: center; margin-top: 0;">Your Reading is Confirmed ✨</h2>
        <p>Dear ${booking.fullName},</p>
        <p>Your payment of <strong>₹${booking.amount}</strong> has been successfully verified. Your reading space is now secured.</p>
        <div style="background: #F9F5F0; border-left: 4px solid #7A2E45; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${booking.serviceName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Booking Reference:</strong> ${booking.bookingRef}</p>
          ${booking.slotDate ? `<p style="margin: 0 0 8px 0;"><strong>Scheduled Time:</strong> ${booking.slotDate} at ${booking.slotTime} IST</p>` : `<p style="margin: 0 0 8px 0;"><strong>Turnaround:</strong> Within 48 hours to this email and WhatsApp</p>`}
          ${booking.commMode ? `<p style="margin: 0;"><strong>Session Mode:</strong> ${booking.commMode} via WhatsApp or Google Meet</p>` : ''}
        </div>
        <p>With celestial warmth,<br><strong>Jiji (Jeevani V)</strong></p>
      </div>
    `
  };
  logEmail(confirmationEmail);

  res.json({ success: true, message: 'Order approved successfully', booking });
});

// 1-click Reject from Admin Dashboard
app.post('/api/admin/orders/:id/reject', requireAdminAuth, (req, res) => {
  const bookingId = req.params.id;
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === bookingId || b.bookingRef === bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Order not found' });
  }

  booking.status = 'Rejected';
  booking.rejectedAt = new Date().toISOString();
  booking.history.push({
    status: 'Rejected',
    timestamp: new Date().toISOString(),
    note: 'Manually rejected via Admin Dashboard by Jiji.'
  });
  saveBookings(bookings);

  // Send rejection email
  const rejectionEmail = {
    to: booking.email,
    subject: `Update regarding your Tarot with Jiji booking (${booking.bookingRef})`,
    bodyHtml: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FFFDFB; border: 1px solid #E8D8D8; color: #1E1E24; border-radius: 8px;">
        <h2 style="color: #7A2E45;">Payment Verification Notice</h2>
        <p>Dear ${booking.fullName},</p>
        <p>Your payment reference (UTR: ${booking.utrNumber}) could not be verified in our banking records for ₹${booking.amount}.</p>
        <p>Please contact Jiji or submit a new booking with the correct transaction reference.</p>
        <p>Warm regards,<br><strong>Tarot with Jiji</strong></p>
      </div>
    `
  };
  logEmail(rejectionEmail);

  res.json({ success: true, message: 'Order rejected', booking });
});

// View Outbox / Simulated Emails for verification
app.get('/api/admin/emails', requireAdminAuth, (req, res) => {
  res.json({ success: true, emails: getEmails() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✨ Tarot with Jiji server running smoothly on http://localhost:${PORT}`);
});

