<?php
if (!defined('ABSPATH')) {
    exit;
}

class Tarot_JIJI_DB {

    public static function get_table_name() {
        global $wpdb;
        return $wpdb->prefix . 'tarot_bookings';
    }

    public static function install() {
        global $wpdb;
        $table_name = self::get_table_name();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            booking_ref varchar(32) NOT NULL,
            service_id varchar(64) NOT NULL,
            service_name varchar(191) NOT NULL,
            amount int(11) NOT NULL,
            full_name varchar(191) NOT NULL,
            email varchar(191) NOT NULL,
            phone varchar(64) NOT NULL,
            question text NOT NULL,
            birth_date date DEFAULT NULL,
            birth_time time DEFAULT NULL,
            comm_mode varchar(64) DEFAULT NULL,
            slot_date date DEFAULT NULL,
            slot_time varchar(32) DEFAULT NULL,
            utr_number varchar(32) DEFAULT NULL,
            status varchar(64) NOT NULL DEFAULT 'Pending Payment',
            hold_expires_at datetime DEFAULT NULL,
            action_token varchar(64) DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY booking_ref (booking_ref),
            UNIQUE KEY utr_number (utr_number)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        // Default plugin options
        add_option('tarot_jiji_payee_name', 'jeevani V');
        add_option('tarot_jiji_upi_id', 'jeevanvedavendra@oksbi');
        add_option('tarot_jiji_owner_email', get_option('admin_email'));
        add_option('tarot_jiji_slot_hold_minutes', 30);
    }

    public static function get_services() {
        return [
            [
                'id' => 'tarot-1hr',
                'name' => 'Tarot Reading 1hr (Chat/Call)',
                'price' => 999,
                'duration' => '60 minutes',
                'type' => 'live',
                'turnaround' => 'Live session via WhatsApp or Google Meet',
                'badge' => 'Signature Live Reading',
                'description' => 'Dedicated 60 minutes exploring your cosmic destiny, soul alignments, and hidden roadblocks.'
            ],
            [
                'id' => 'tarot-10min',
                'name' => 'Tarot Reading 10 Min (In-Depth)',
                'price' => 200,
                'duration' => '10 minutes',
                'type' => 'live',
                'turnaround' => 'Live quick session via WhatsApp or Google Meet',
                'badge' => 'Urgent Clarity',
                'description' => 'Focused spread targeted at one urgent crossroad or burning question.'
            ],
            [
                'id' => 'pick-a-card',
                'name' => 'Pick a Card Reading',
                'price' => 300,
                'duration' => 'Written Channeled Report',
                'type' => 'written',
                'turnaround' => 'Delivered within 48 hours',
                'badge' => 'Intuitive Dossier',
                'description' => 'Card pile analysis channeled specifically for your energy resonance with card photos.'
            ],
            [
                'id' => 'future-predictions',
                'name' => 'Future Predictions',
                'price' => 300,
                'duration' => 'Written Report',
                'type' => 'written',
                'turnaround' => 'Delivered within 48 hours',
                'badge' => 'Timeline Forecast',
                'description' => '6 to 12 month timeline forecast analyzing upcoming energetic shifts and opportunities.'
            ],
            [
                'id' => 'birth-chart',
                'name' => 'Birth Chart Reading',
                'price' => 150,
                'duration' => 'Written Astrological Analysis',
                'type' => 'written',
                'turnaround' => 'Delivered within 48 hours',
                'badge' => 'Astrological Analysis',
                'description' => 'In-depth astrological blueprint uncovering natal placements, rising sign nuances, and soul karma.'
            ],
            [
                'id' => 'career-reading',
                'name' => 'Career Reading',
                'price' => 150,
                'duration' => 'Written Guidance',
                'type' => 'written',
                'turnaround' => 'Delivered within 48 hours',
                'badge' => 'Vocational Guidance',
                'description' => 'Strategic vocational guidance targeting professional dilemmas and optimal timing for transitions.'
            ],
            [
                'id' => 'love-reading',
                'name' => 'Love Reading',
                'price' => 200,
                'duration' => 'Written Report',
                'type' => 'written',
                'turnaround' => 'Delivered within 48 hours',
                'badge' => 'Relationship Dynamics',
                'description' => 'Sacred exploration of relationship dynamics, soulmate bonds, and future emotional trajectories.'
            ]
        ];
    }

    public static function create_booking($data) {
        global $wpdb;
        $table_name = self::get_table_name();

        // Expire older pending holds first
        $wpdb->query("UPDATE $table_name SET status = 'Expired' WHERE status = 'Pending Payment' AND hold_expires_at < NOW()");

        $inserted = $wpdb->insert($table_name, [
            'booking_ref'     => $data['booking_ref'],
            'service_id'      => sanitize_text_field($data['service_id']),
            'service_name'    => sanitize_text_field($data['service_name']),
            'amount'          => intval($data['amount']),
            'full_name'       => sanitize_text_field($data['full_name']),
            'email'           => sanitize_email($data['email']),
            'phone'           => sanitize_text_field($data['phone']),
            'question'        => sanitize_textarea_field($data['question']),
            'birth_date'      => !empty($data['birth_date']) ? sanitize_text_field($data['birth_date']) : null,
            'birth_time'      => !empty($data['birth_time']) ? sanitize_text_field($data['birth_time']) : null,
            'comm_mode'       => !empty($data['comm_mode']) ? sanitize_text_field($data['comm_mode']) : null,
            'slot_date'       => !empty($data['slot_date']) ? sanitize_text_field($data['slot_date']) : null,
            'slot_time'       => !empty($data['slot_time']) ? sanitize_text_field($data['slot_time']) : null,
            'status'          => 'Pending Payment',
            'hold_expires_at' => date('Y-m-d H:i:s', strtotime('+30 minutes')),
            'action_token'    => wp_generate_password(24, false)
        ]);

        if ($inserted) {
            return $wpdb->insert_id;
        }
        return false;
    }

    public static function check_utr_exists($utr) {
        global $wpdb;
        $table_name = self::get_table_name();
        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE utr_number = %s",
            $utr
        ));
        return intval($count) > 0;
    }

    public static function submit_utr($booking_ref, $utr) {
        global $wpdb;
        $table_name = self::get_table_name();

        return $wpdb->update(
            $table_name,
            [
                'utr_number' => $utr,
                'status'     => 'Awaiting Verification'
            ],
            ['booking_ref' => $booking_ref],
            ['%s', '%s'],
            ['%s']
        );
    }
}
