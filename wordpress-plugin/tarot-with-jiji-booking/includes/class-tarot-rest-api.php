<?php
if (!defined('ABSPATH')) {
    exit;
}

class Tarot_JIJI_REST_API {

    public static function init() {
        add_action('rest_api_init', [__CLASS__, 'register_routes']);
    }

    public static function register_routes() {
        register_rest_route('tarot-jiji/v1', '/services', [
            'methods'  => 'GET',
            'callback' => [__CLASS__, 'get_services'],
            'permission_callback' => '__return_true'
        ]);

        register_rest_route('tarot-jiji/v1', '/slots', [
            'methods'  => 'GET',
            'callback' => [__CLASS__, 'get_slots'],
            'permission_callback' => '__return_true'
        ]);

        register_rest_route('tarot-jiji/v1', '/create-booking', [
            'methods'  => 'POST',
            'callback' => [__CLASS__, 'create_booking'],
            'permission_callback' => '__return_true'
        ]);

        register_rest_route('tarot-jiji/v1', '/submit-utr', [
            'methods'  => 'POST',
            'callback' => [__CLASS__, 'submit_utr'],
            'permission_callback' => '__return_true'
        ]);
    }

    public static function get_services() {
        return rest_ensure_response([
            'success'  => true,
            'services' => Tarot_JIJI_DB::get_services()
        ]);
    }

    public static function get_slots($request) {
        $date = sanitize_text_field($request->get_param('date'));
        if (empty($date)) {
            return new WP_Error('missing_date', 'Date parameter required', ['status' => 400]);
        }

        global $wpdb;
        $table = Tarot_JIJI_DB::get_table_name();

        // Standard consultation timeslots
        $standard = ['10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM', '06:30 PM', '08:00 PM'];

        // Get booked or held slots
        $booked = $wpdb->get_col($wpdb->prepare(
            "SELECT slot_time FROM $table 
             WHERE slot_date = %s 
             AND (status IN ('Confirmed', 'Awaiting Verification') OR (status = 'Pending Payment' AND hold_expires_at > NOW()))",
            $date
        ));

        $slots = [];
        foreach ($standard as $time) {
            $slots[] = [
                'time'      => $time,
                'available' => !in_array($time, $booked)
            ];
        }

        return rest_ensure_response([
            'success' => true,
            'date'    => $date,
            'slots'   => $slots
        ]);
    }

    public static function create_booking($request) {
        $params = $request->get_json_params();

        $service_id = sanitize_text_field($params['serviceId'] ?? '');
        $full_name  = sanitize_text_field($params['fullName'] ?? '');
        $email      = sanitize_email($params['email'] ?? '');
        $phone      = sanitize_text_field($params['phone'] ?? '');
        $question   = sanitize_textarea_field($params['question'] ?? '');
        $consent    = !empty($params['consent']);

        if (empty($full_name) || empty($email) || empty($phone) || empty($question) || !$consent) {
            return new WP_Error('invalid_fields', 'Required fields are missing.', ['status' => 400]);
        }

        $services = Tarot_JIJI_DB::get_services();
        $service = null;
        foreach ($services as $s) {
            if ($s['id'] === $service_id) {
                $service = $s;
                break;
            }
        }

        if (!$service) {
            return new WP_Error('invalid_service', 'Selected service does not exist.', ['status' => 400]);
        }

        if ($service['id'] === 'birth-chart' && (empty($params['birthDate']) || empty($params['birthTime']))) {
            return new WP_Error('birth_details_required', 'Birth date and time are strictly required for Birth Chart reading.', ['status' => 400]);
        }

        // Generate unique booking reference
        $booking_ref = 'TJ-' . strtoupper(wp_generate_password(6, false));

        $booking_id = Tarot_JIJI_DB::create_booking([
            'booking_ref'  => $booking_ref,
            'service_id'   => $service['id'],
            'service_name' => $service['name'],
            'amount'       => $service['price'],
            'full_name'    => $full_name,
            'email'        => $email,
            'phone'        => $phone,
            'question'     => $question,
            'birth_date'   => $params['birthDate'] ?? null,
            'birth_time'   => $params['birthTime'] ?? null,
            'comm_mode'    => $params['commMode'] ?? null,
            'slot_date'    => $params['slotDate'] ?? null,
            'slot_time'    => $params['slotTime'] ?? null
        ]);

        if (!$booking_id) {
            return new WP_Error('db_error', 'Could not create booking record.', ['status' => 500]);
        }

        $payee_name = get_option('tarot_jiji_payee_name', 'jeevani V');
        $upi_id     = get_option('tarot_jiji_upi_id', 'jeevani.v@oksbi');
        $upi_link   = "upi://pay?pa=" . rawurlencode($upi_id) . "&pn=" . rawurlencode($payee_name) . "&am=" . $service['price'] . "&cu=INR&tn=Tarot-" . $booking_ref;

        return rest_ensure_response([
            'success' => true,
            'booking' => [
                'bookingRef'     => $booking_ref,
                'serviceName'    => $service['name'],
                'amount'         => $service['price'],
                'holdExpiresAt'  => date('Y-m-d H:i:s', strtotime('+30 minutes'))
            ],
            'paymentDetails' => [
                'payeeName' => $payee_name,
                'upiId'     => $upi_id,
                'upiLink'   => $upi_link
            ]
        ]);
    }

    public static function submit_utr($request) {
        $params = $request->get_json_params();
        $booking_ref = sanitize_text_field($params['bookingRef'] ?? '');
        $utr = sanitize_text_field($params['utrNumber'] ?? '');

        // Strict 12-digit numeric validation
        if (!preg_match('/^\d{12}$/', $utr)) {
            return new WP_Error('invalid_utr', 'Invalid UTR: Must be exactly 12 numeric digits.', ['status' => 400]);
        }

        // Database uniqueness check
        if (Tarot_JIJI_DB::check_utr_exists($utr)) {
            return new WP_Error('utr_exists', "UTR $utr has already been submitted for another booking. Each transaction reference can only be submitted once.", ['status' => 409]);
        }

        global $wpdb;
        $table = Tarot_JIJI_DB::get_table_name();
        $booking = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE booking_ref = %s", $booking_ref));

        if (!$booking) {
            return new WP_Error('not_found', 'Booking reference not found.', ['status' => 404]);
        }

        // Update database
        Tarot_JIJI_DB::submit_utr($booking_ref, $utr);
        $booking->utr_number = $utr;
        $booking->status = 'Awaiting Verification';

        // Trigger Instant Notification Email to Owner
        Tarot_JIJI_Emails::send_owner_verification_alert($booking);

        // Trigger automated acknowledgment to customer
        Tarot_JIJI_Emails::send_customer_utr_received_email($booking);

        // Strict response message compliance
        return rest_ensure_response([
            'success' => true,
            'status'  => 'Awaiting Verification',
            'message' => 'Payment received, we are verifying it. You will receive an email once confirmed.'
        ]);
    }
}
