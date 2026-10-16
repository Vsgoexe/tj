<?php
if (!defined('ABSPATH')) {
    exit;
}

class Tarot_JIJI_Emails {

    public static function init() {
        add_filter('wp_mail_content_type', [__CLASS__, 'set_html_content_type']);
    }

    public static function set_html_content_type() {
        return 'text/html';
    }

    public static function send_owner_verification_alert($booking) {
        $owner_email = get_option('tarot_jiji_owner_email', get_option('admin_email'));
        
        $base_url = home_url('/');
        $approve_url = add_query_arg([
            'tarot_action_gateway' => '1',
            'ref'    => $booking->booking_ref,
            'action' => 'approve',
            'token'  => $booking->action_token
        ], $base_url);

        $reject_url = add_query_arg([
            'tarot_action_gateway' => '1',
            'ref'    => $booking->booking_ref,
            'action' => 'reject',
            'token'  => $booking->action_token
        ], $base_url);

        $subject = "🔔 [Action Required] Verify Payment: ₹{$booking->amount} from {$booking->full_name} ({$booking->booking_ref})";

        $body = "
        <div style=\"font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FFFDFB; border: 1px solid #E8D8D8; color: #1E1E24; border-radius: 8px;\">
            <h2 style=\"color: #7A2E45; border-bottom: 2px solid #E8D8D8; padding-bottom: 12px; margin-top: 0;\">Tarot with Jiji — Payment Verification Notice</h2>
            <p>A client has submitted their 12-digit UPI transaction reference for manual verification:</p>
            
            <table style=\"width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 15px;\">
                <tr style=\"background: #F9F5F0;\"><td style=\"padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;\">Booking Reference</td><td style=\"padding: 10px; border: 1px solid #E8D8D8;\">{$booking->booking_ref}</td></tr>
                <tr><td style=\"padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;\">Client Name</td><td style=\"padding: 10px; border: 1px solid #E8D8D8;\">{$booking->full_name}</td></tr>
                <tr style=\"background: #F9F5F0;\"><td style=\"padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;\">Service</td><td style=\"padding: 10px; border: 1px solid #E8D8D8;\">{$booking->service_name}</td></tr>
                <tr><td style=\"padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;\">Amount Expected</td><td style=\"padding: 10px; border: 1px solid #E8D8D8; font-size: 18px; color: #7A2E45; font-weight: bold;\">₹{$booking->amount}</td></tr>
                <tr style=\"background: #FFF0F4;\"><td style=\"padding: 10px; font-weight: bold; border: 1px solid #E8D8D8; color: #7A2E45;\">Submitted 12-digit UTR</td><td style=\"padding: 10px; border: 1px solid #E8D8D8; font-family: monospace; font-size: 17px; font-weight: bold; color: #7A2E45;\">{$booking->utr_number}</td></tr>
                <tr><td style=\"padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;\">Client Contact</td><td style=\"padding: 10px; border: 1px solid #E8D8D8;\">{$booking->phone} / {$booking->email}</td></tr>
                " . (!empty($booking->slot_date) ? "<tr style=\"background: #F9F5F0;\"><td style=\"padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;\">Requested Slot</td><td style=\"padding: 10px; border: 1px solid #E8D8D8;\">{$booking->slot_date} at {$booking->slot_time} ({$booking->comm_mode})</td></tr>" : "") . "
                <tr><td style=\"padding: 10px; font-weight: bold; border: 1px solid #E8D8D8;\">Client's Question</td><td style=\"padding: 10px; border: 1px solid #E8D8D8; font-style: italic;\">\"{$booking->question}\"</td></tr>
            </table>

            <div style=\"margin: 28px 0; text-align: center;\">
                <a href=\"{$approve_url}\" style=\"background-color: #2e7d32; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block; margin-right: 12px;\">✓ Approve Payment</a>
                <a href=\"{$reject_url}\" style=\"background-color: #c62828; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;\">✕ Reject Payment</a>
            </div>

            <p style=\"font-size: 12px; color: #666; border-top: 1px solid #E8D8D8; padding-top: 12px;\">
                <strong>Security Protection:</strong> These single-use links open an intermediate confirmation screen in your WordPress portal to protect against email security pre-fetch bots.
            </p>
        </div>";

        wp_mail($owner_email, $subject, $body);
    }

    public static function send_customer_utr_received_email($booking) {
        $subject = "Payment Reference Received — Tarot with Jiji ({$booking->booking_ref})";
        $body = "
        <div style=\"font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FFFDFB; border: 1px solid #E8D8D8; color: #1E1E24; border-radius: 8px;\">
            <h2 style=\"color: #7A2E45;\">Payment Received — Verification in Progress</h2>
            <p>Dear {$booking->full_name},</p>
            <p>Thank you for submitting your payment reference (UTR: <strong>{$booking->utr_number}</strong>) for your reading: <em>{$booking->service_name}</em>.</p>
            <div style=\"background: #F9F5F0; padding: 16px; border-left: 4px solid #7A2E45; margin: 18px 0;\">
                <p style=\"margin: 0; font-weight: 500;\">Payment received, we are verifying it. You will receive an email once confirmed.</p>
            </div>
            <p>Jiji personally verifies each transaction before initiating your consultation or channeled report. We honor your trust and look forward to sharing sacred clarity with you.</p>
            <p style=\"margin-top: 24px;\">Warm blessings,<br><strong>Tarot with Jiji</strong></p>
        </div>";

        wp_mail($booking->email, $subject, $body);
    }

    public static function send_customer_confirmed_email($booking) {
        $subject = "✨ [CONFIRMED] Your Sacred Reading with Jiji is Scheduled ({$booking->booking_ref})";
        $body = "
        <div style=\"font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 28px; background: #FFFDFB; border: 2px solid #7A2E45; color: #1E1E24; border-radius: 8px;\">
            <h2 style=\"color: #7A2E45; text-align: center; margin-top: 0;\">Your Reading is Confirmed ✨</h2>
            <p>Dear {$booking->full_name},</p>
            <p>Your payment of <strong>₹{$booking->amount}</strong> has been successfully verified by Jiji. Your sacred space is held.</p>
            
            <div style=\"background: #F9F5F0; border-left: 4px solid #7A2E45; padding: 18px; margin: 20px 0;\">
                <p style=\"margin: 0 0 8px 0;\"><strong>Service:</strong> {$booking->service_name}</p>
                <p style=\"margin: 0 0 8px 0;\"><strong>Booking Reference:</strong> {$booking->booking_ref}</p>
                " . (!empty($booking->slot_date) ? "<p style=\"margin: 0 0 8px 0;\"><strong>Scheduled Time:</strong> {$booking->slot_date} at {$booking->slot_time} IST</p>" : "<p style=\"margin: 0 0 8px 0;\"><strong>Turnaround:</strong> Within 48 hours delivered to your WhatsApp and email</p>") . "
                " . (!empty($booking->comm_mode) ? "<p style=\"margin: 0;\"><strong>Session Mode:</strong> {$booking->comm_mode} via WhatsApp (+91 96866 76266) or Google Meet</p>" : "") . "
            </div>

            <h3 style=\"color: #7A2E45; margin-top: 24px;\">Preparing for Your Session:</h3>
            <ul style=\"color: #4A4A54; line-height: 1.6;\">
                <li>Take 5 minutes prior to ground your energy and reflect on your questions.</li>
                <li>Ensure you are in a quiet, undisturbed sanctuary.</li>
                <li>For live readings, Jiji will reach out on WhatsApp (+91 {$booking->phone}) 5 minutes before your scheduled slot.</li>
            </ul>

            <p style=\"margin-top: 28px; text-align: center; font-style: italic; color: #7A2E45;\">\"The cards reveal the energies at play, but your free will creates the destiny.\"</p>
            <p style=\"text-align: center;\">With celestial warmth and light,<br><strong>Jiji (Jeevani V)</strong><br><span style=\"font-size: 13px; color: #777;\">Tarot with Jiji</span></p>
        </div>";

        wp_mail($booking->email, $subject, $body);
    }

    public static function send_customer_rejected_email($booking) {
        $subject = "Update regarding your Tarot with Jiji booking ({$booking->booking_ref})";
        $body = "
        <div style=\"font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FFFDFB; border: 1px solid #E8D8D8; color: #1E1E24; border-radius: 8px;\">
            <h2 style=\"color: #7A2E45;\">Payment Verification Notice</h2>
            <p>Dear {$booking->full_name},</p>
            <p>We attempted to verify the 12-digit transaction ID provided (<strong>{$booking->utr_number}</strong>) for your reading ({$booking->service_name}), but our bank records did not reflect a matching receipt for ₹{$booking->amount}.</p>
            <p>This occasionally happens due to bank delays or typos in the UTR digits. If you believe this is an error or would like to submit the corrected transaction ID, please reach out to us directly or retry via our booking portal.</p>
            <div style=\"text-align: center; margin: 24px 0;\">
                <a href=\"" . home_url('/#book') . "\" style=\"background-color: #7A2E45; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px;\">Retry Booking / Contact Jiji</a>
            </div>
            <p>Warm regards,<br><strong>Tarot with Jiji Team</strong></p>
        </div>";

        wp_mail($booking->email, $subject, $body);
    }
}
