# ✨ Tarot with Jiji — Sanctuary Website & WordPress Engine

A bespoke, boutique tarot consultation and intuitive reading web platform built for **Jiji (Jeevani V)**, featuring **Victorian botanical mysticism, celestial luxury, warm parchment tones, and editorial typography**.

---

## 🌟 Quickstart: Run the Live Application Locally

The full-stack interactive website is running right now on **[http://localhost:3000](http://localhost:3000)**!

To restart the server at any time:
```bash
npm start
# or
node server.js
```

### Accessing the Protected Owner Portal
- **URL**: Open [http://localhost:3000/portal-owner-2026.html](http://localhost:3000/portal-owner-2026.html) (Isolated private URL, not linked on public pages).
- **Owner PIN**: `Jevani1331!` (Configurable via `ADMIN_PIN` environment variable).

---

## 🔮 The 7 Offerings & Authoritative Fixed Pricing (INR)

| # | Offering | Price | Type | Delivery / Turnaround |
|---|---|---|---|---|
| 1 | **Tarot Reading 1hr (Chat/Call)** | **₹999** | Live Session (60m) | Live text chat or voice/video call via WhatsApp / Google Meet |
| 2 | **Tarot Reading 10 Min (In-Depth)** | **₹200** | Live Session (10m) | Focused urgent question via WhatsApp / Google Meet |
| 3 | **Pick a Card Reading** | **₹300** | Written Report | Intuitive channeled report delivered within 48 hours |
| 4 | **Future Predictions** | **₹300** | Written Report | 6–12 month timeline forecast delivered within 48 hours |
| 5 | **Birth Chart Reading** | **₹150** | Written Astrological Analysis | Natal blueprint delivered within 48 hours (birth date & time required) |
| 6 | **Career Reading** | **₹150** | Written Guidance | Professional roadmaps & pivots delivered within 48 hours |
| 7 | **Love Reading** | **₹200** | Written Report | Relationship dynamics & soul connections delivered within 48 hours |

---

## 💎 Features Implemented

### 1. Victorian Botanical Mysticism Visual Identity
- **Palette**: Deep Royal Wine (`#7A2E45`), Vintage Merlot (`#5B1F31`), Warm Parchment (`#FFFDFB` & `#F9F5F0`), Muted Dusty Rose (`#E8D8D8`), Midnight Charcoal (`#1E1E24`), Celestial Gold (`#C5A059`).
- **Typography**: Classical Serifs (`Cormorant Garamond`, `Playfair Display`) paired with clean modern sans-serif (`Plus Jakarta Sans`).
- **Imagery**: Bespoke portrait of Jiji in wine velvet with tarot deck & herbs, antique parchment backgrounds, celestial star dividers.

### 2. 5-Step Intuitive Booking Funnel
- **Step 1: Select Service** — Defaults to 1-hr reading with transparent price cards.
- **Step 2: Client Intake Details** — Full name, Email, WhatsApp number with country code, Specific Question/Focus Area, Conditional Birth details (enforced strictly for Birth Chart), Live communication mode selector, and mandatory disclaimer consent.
- **Step 3: Live Calendar Slot Selector** — 7-day date chips with real-time available timeslots (10:00 AM, 11:30 AM, 2:00 PM, 3:30 PM, 5:00 PM, 6:30 PM, 8:00 PM IST).
  * **30-Minute Reservation Hold**: Active real-time countdown timer (`29:59` to `00:00`). If abandoned, the slot releases automatically.
- **Step 4: Summary Review** — Comprehensive card breaking down client details, consultation format, chosen slot or 48h turnaround, and amount in ₹ INR.
- **Step 5: Manual UPI Payment Screen** —
  * Verified Payee: **`jeevani V`**
  * Official UPI ID: **`jeevanvedavendra@oksbi`** with 1-click **Copy** button and tooltip.
  * Dynamic high-contrast Google Pay / UPI QR Code.
  * 1-Click Mobile Intent Deep Link: `upi://pay?pa=jeevanvedavendra@oksbi&pn=jeevani%20V&am=<AMOUNT>&cu=INR&tn=Tarot-<BOOKING_REF>`
  * **Strict 12-Digit Numeric UTR Validation**: Rejects non-12-digit or non-numeric inputs.
  * **Database Uniqueness Enforcement**: Prevents reused or duplicate transaction IDs.
  * **Status Lifecycle**: Transitions from `Pending Payment` to `Awaiting Verification`.
  * **Strict Success Copy**: *"Payment received, we are verifying it. You will receive an email once confirmed."* (Under no circumstances says "Confirmed" or "Amount Paid" prematurely).
  * **WhatsApp 1-Click Dispatch**: Auto-opens WhatsApp to message Jiji directly with booking reference and UTR.
  * *"I'll Pay Later"* link to exit while holding the slot.

### 3. Owner Approval Workflow & Anti-Virus Bot Protection
- **Instant Owner Notification**: Automatically triggers an email to `jeevani.tarot@gmail.com` with customer name, phone, email, service, amount, and UTR.
- **Anti-Virus Safe Single-Use Links**: Email security scanners (e.g. Outlook SafeLinks, Microsoft Defender) pre-fetch GET links. Our system routes approval links through an **intermediate verification screen with an explicit POST confirmation button**, ensuring emails scanners cannot prematurely trigger state changes.
- **Protected Admin Dashboard**: Filter orders by `Awaiting Verification`, `Pending Payment`, `Confirmed`, and `Rejected`, with 1-click Approve and Reject buttons.
- **Simulated Email Outbox**: View all outgoing confirmation, rejection, and alert emails directly within the admin modal.

---

## 📦 Production WordPress Plugin (`wordpress-plugin/tarot-with-jiji-booking/`)

Included in this repository is the complete, self-contained WordPress plugin ready to be uploaded to any WordPress host (Kadence Pro / Astra Pro):
- `tarot-with-jiji-booking.php` — Plugin bootstrap, options, and asset enqueues.
- `includes/class-tarot-db.php` — Custom MySQL table `wp_tarot_bookings` with UTR uniqueness and 30-min hold queries.
- `includes/class-tarot-admin.php` — Admin menu, orders management table, and intermediate POST confirmation gateway.
- `includes/class-tarot-rest-api.php` — REST API endpoints for `/wp-json/tarot-jiji/v1/`.
- `includes/class-tarot-emails.php` — HTML transactional email templates for FluentSMTP, Brevo, or Resend.
- `templates/booking-shortcode.php` — Embeddable via `[tarot_jiji_booking]`.
- `templates/services-grid.php` — Embeddable via `[tarot_jiji_services]`.
- `README.md` — Complete WordPress deployment manual.
