# TAROT WITH JIJI — WORDPRESS PLUGIN & DEPLOYMENT GUIDE

## 1. Overview
This is the complete, production-ready WordPress plugin for **Tarot with Jiji (Jeevani V)**. It provides:
- Victorian botanical aesthetic styling with classical serif typography (`Cormorant Garamond` / `Playfair Display`) and deep royal wine (`#7A2E45`) accents.
- 5-step intuitive booking funnel with calendar slot reservation and 30-minute reservation hold.
- Manual UPI payment gateway with Google Pay QR generation and mobile deep linking (`upi://pay?pa=...`).
- Strict 12-digit numeric UTR validation and database uniqueness enforcement.
- Anti-virus scanner-safe owner approval workflow with 2-step intermediate POST confirmation.
- WP-Admin management table for reviewing and 1-click approving/rejecting payments.
- Authoritative INR pricing for all 7 offerings.

---

## 2. The 7 Authoritative Services & Pricing
1. **Tarot Reading 1hr (Chat/Call)** — ₹999 (Live 60-min session via WhatsApp/Meet)
2. **Tarot Reading 10 Min (In-Depth)** — ₹200 (Live 10-min urgent question)
3. **Pick a Card Reading** — ₹300 (Written report within 48 hours)
4. **Future Predictions** — ₹300 (Written report within 48 hours)
5. **Birth Chart Reading** — ₹150 (Written astrological analysis within 48 hours; requires birth date & time)
6. **Career Reading** — ₹150 (Written vocational guidance within 48 hours)
7. **Love Reading** — ₹200 (Written relationship dynamics report within 48 hours)

---

## 3. WordPress Installation
1. Compress the folder `tarot-with-jiji-booking` into a `.zip` file, or copy it directly into your WordPress installation:
   ```
   /wp-content/plugins/tarot-with-jiji-booking/
   ```
2. In WP-Admin, navigate to **Plugins > Installed Plugins** and click **Activate** under *Tarot with Jiji — Sacred Booking & Manual UPI Gateway*.
3. The plugin will automatically run `dbDelta` to create the custom MySQL table: `wp_tarot_bookings`.
4. Navigate to **Tarot Bookings > Settings** to configure:
   - Verified Payee Name: `jeevani V`
   - Official UPI ID: `jeevani.v@oksbi`
   - Owner Alert Email: `jeevani.tarot@gmail.com`

---

## 4. Shortcodes for Pages
- **Booking Funnel**: Place `[tarot_jiji_booking]` on your `/book` page.
- **Offerings Grid**: Place `[tarot_jiji_services]` on your `/services` or Home page.

---

## 5. Anti-Virus Scanner Safety Design
Corporate and mobile email clients (such as Microsoft Defender, Outlook SafeLinks, and Google Workspace security scanners) routinely pre-fetch and scan all URLs found inside inbound emails with HTTP GET requests.

If approval links used GET requests, these bots would inadvertently approve orders without owner consent!
**Our implementation prevents this:**
- The action links in the owner alert email route to an intermediate verification gateway.
- WordPress loads an intermediate screen displaying full order details with an explicit **POST** confirmation button.
- A cryptographically verified nonce / token guarantees that state transitions **strictly only occur via explicit POST form submissions**.

---

## 6. Recommended WordPress Stack
- **Theme**: Kadence Pro or Astra Pro
- **Transactional Emails**: FluentSMTP configured with Brevo or Resend API (ensures 100% inbox delivery and zero spam routing)
- **Security**: Cloudflare Turnstile or Wordfence
