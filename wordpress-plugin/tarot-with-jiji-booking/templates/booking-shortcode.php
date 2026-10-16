<?php
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="tarot-booking-wrapper" id="tarot-booking-app">
    <!-- Wizard Progress Header -->
    <div class="tarot-wizard-header">
        <div class="tarot-wizard-steps">
            <div class="tarot-step-ind active" data-step="1">
                <div class="circle">1</div>
                <span>Service</span>
            </div>
            <div class="tarot-step-ind" data-step="2">
                <div class="circle">2</div>
                <span>Intake</span>
            </div>
            <div class="tarot-step-ind" data-step="3">
                <div class="circle">3</div>
                <span>Slot</span>
            </div>
            <div class="tarot-step-ind" data-step="4">
                <div class="circle">4</div>
                <span>Review</span>
            </div>
            <div class="tarot-step-ind" data-step="5">
                <div class="circle">5</div>
                <span>Payment</span>
            </div>
        </div>
    </div>

    <!-- Wizard Panes -->
    <div class="tarot-wizard-body">
        <!-- Step 1: Select Service -->
        <div class="tarot-step-pane active" id="wp-step-1">
            <h3 class="serif-title">Select Your Sacred Offering</h3>
            <p class="step-sub">Choose the reading that calls to your soul.</p>
            <div class="services-radio-group" id="wp-services-list">
                <!-- Loaded via JS -->
            </div>
            <div class="tarot-wizard-nav">
                <div></div>
                <button type="button" class="tarot-btn-primary" id="wp-btn-step1-next">Continue to Details →</button>
            </div>
        </div>

        <!-- Step 2: Intake Details -->
        <div class="tarot-step-pane" id="wp-step-2">
            <h3 class="serif-title">Sacred Intake & Focus Area</h3>
            <div class="tarot-form-grid">
                <div class="tarot-field">
                    <label>Full Name *</label>
                    <input type="text" id="wp-intake-name" class="tarot-input" required>
                </div>
                <div class="tarot-field">
                    <label>Email Address *</label>
                    <input type="email" id="wp-intake-email" class="tarot-input" required>
                </div>
            </div>
            <div class="tarot-field">
                <label>WhatsApp Phone Number (with Country Code) *</label>
                <input type="tel" id="wp-intake-phone" class="tarot-input" placeholder="+91 98765 43210" required>
            </div>
            <div class="tarot-field">
                <label>Your Question / Sacred Intentions *</label>
                <textarea id="wp-intake-question" class="tarot-textarea" rows="4" required></textarea>
            </div>
            <div class="tarot-form-grid" id="wp-birth-group">
                <div class="tarot-field">
                    <label>Birth Date <span id="wp-birth-req" style="display:none; color:#7A2E45;">*</span></label>
                    <input type="date" id="wp-intake-birthdate" class="tarot-input">
                </div>
                <div class="tarot-field">
                    <label>Exact Birth Time</label>
                    <input type="time" id="wp-intake-birthtime" class="tarot-input">
                </div>
            </div>
            <div class="tarot-field" id="wp-comm-group">
                <label>Preferred Live Mode</label>
                <div style="display:flex; gap: 20px; margin-top: 6px;">
                    <label><input type="radio" name="wp_comm_mode" value="Text Chat" checked> Live Text Chat</label>
                    <label><input type="radio" name="wp_comm_mode" value="Voice/Video Call"> Voice/Video Call</label>
                </div>
            </div>
            <div class="tarot-field" style="margin-top: 16px;">
                <label style="display:flex; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="wp-intake-consent" required>
                    <span style="font-size: 13px; color: #555;">I understand that readings are for intuitive guidance, spiritual reflection, and personal empowerment. *</span>
                </label>
            </div>
            <div class="tarot-wizard-nav">
                <button type="button" class="tarot-btn-secondary" id="wp-btn-step2-back">← Back</button>
                <button type="button" class="tarot-btn-primary" id="wp-btn-step2-next">Continue →</button>
            </div>
        </div>

        <!-- Step 3: Slot Selector -->
        <div class="tarot-step-pane" id="wp-step-3">
            <h3 class="serif-title">Select Consultation Slot (IST)</h3>
            <div class="slot-hold-alert">⏱️ 30-minute reservation hold active while booking.</div>
            <div class="dates-chips-row" id="wp-dates-row"></div>
            <div class="slots-grid-row" id="wp-slots-row"></div>
            <div class="tarot-wizard-nav">
                <button type="button" class="tarot-btn-secondary" id="wp-btn-step3-back">← Back</button>
                <button type="button" class="tarot-btn-primary" id="wp-btn-step3-next">Review Summary →</button>
            </div>
        </div>

        <!-- Step 4: Summary Review -->
        <div class="tarot-step-pane" id="wp-step-4">
            <h3 class="serif-title">Review Your Consultation Details</h3>
            <div class="summary-box" id="wp-summary-box"></div>
            <div class="tarot-wizard-nav">
                <button type="button" class="tarot-btn-secondary" id="wp-btn-step4-back">← Edit Details</button>
                <button type="button" class="tarot-btn-primary" id="wp-btn-step4-confirm">Proceed to Sacred UPI Deposit →</button>
            </div>
        </div>

        <!-- Step 5: Manual UPI Screen -->
        <div class="tarot-step-pane" id="wp-step-5">
            <div class="upi-step-center">
                <h3 class="serif-title">Manual UPI Payment</h3>
                <div class="payee-card">
                    <div>
                        <div style="font-size: 12px; color: #777;">VERIFIED PAYEE</div>
                        <div style="font-weight: bold; font-size: 16px;" id="wp-payee-name">jeevani V</div>
                        <div style="font-family: monospace; color: #7A2E45;" id="wp-payee-upi">jeevanvedavendra@oksbi</div>
                    </div>
                    <button type="button" class="tarot-btn-sm" id="wp-copy-upi-btn">Copy UPI ID</button>
                </div>
                <div class="qr-box">
                    <img id="wp-qr-img" src="" alt="Google Pay QR Code">
                    <div style="font-weight: bold; margin-top: 8px;">Amount: <span id="wp-amount-tag" style="color:#7A2E45;">₹999</span></div>
                    <div style="font-size: 12px; color: #888;">Ref: <span id="wp-ref-tag">TJ-XXXXXX</span></div>
                </div>
                <a id="wp-mobile-intent" href="#" class="tarot-btn-gpay">⚡ Pay with Any UPI App</a>
                <div class="utr-box">
                    <label style="font-weight: bold; font-size: 14px;">12-Digit UPI Transaction ID / UTR *</label>
                    <input type="text" id="wp-utr-input" maxlength="12" class="tarot-input utr-field" placeholder="e.g. 429384918231">
                    <button type="button" class="tarot-btn-primary" id="wp-btn-submit-utr" style="width: 100%; margin-top: 12px;">Submit Transaction Reference</button>
                </div>
            </div>
        </div>
    </div>
</div>
