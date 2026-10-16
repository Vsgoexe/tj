<?php
/**
 * Plugin Name: Tarot with Jiji — Sacred Booking & Manual UPI Gateway
 * Plugin URI: https://tarotwithjiji.com
 * Description: Luxury Victorian botanical booking engine, live calendar slot reservation with 30-min hold, manual UPI payment verification, strict 12-digit UTR uniqueness, and anti-virus safe approval workflow.
 * Version: 1.0.0
 * Author: Jeevani V & Antigravity
 * Author URI: https://tarotwithjiji.com
 * Text Domain: tarot-jiji
 */

if (!defined('ABSPATH')) {
    exit;
}

define('TAROT_JIJI_VERSION', '1.0.0');
define('TAROT_JIJI_PATH', plugin_dir_path(__FILE__));
define('TAROT_JIJI_URL', plugin_dir_url(__FILE__));

// Require Core Subsystems
require_once TAROT_JIJI_PATH . 'includes/class-tarot-db.php';
require_once TAROT_JIJI_PATH . 'includes/class-tarot-admin.php';
require_once TAROT_JIJI_PATH . 'includes/class-tarot-rest-api.php';
require_once TAROT_JIJI_PATH . 'includes/class-tarot-emails.php';

// Activation & Deactivation
register_activation_hook(__FILE__, ['Tarot_JIJI_DB', 'install']);

// Main Plugin Class
class Tarot_With_Jiji {
    private static $instance = null;

    public static function instance() {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function __construct() {
        add_action('init', [$this, 'init']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_assets']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        add_shortcode('tarot_jiji_booking', [$this, 'render_booking_shortcode']);
        add_shortcode('tarot_jiji_services', [$this, 'render_services_shortcode']);
    }

    public function init() {
        Tarot_JIJI_Admin::init();
        Tarot_JIJI_REST_API::init();
        Tarot_JIJI_Emails::init();
    }

    public function enqueue_frontend_assets() {
        wp_enqueue_style(
            'tarot-google-fonts',
            'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,600;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
            [],
            null
        );

        wp_enqueue_style(
            'tarot-booking-css',
            TAROT_JIJI_URL . 'assets/css/tarot-booking.css',
            ['tarot-google-fonts'],
            TAROT_JIJI_VERSION
        );

        wp_enqueue_script(
            'tarot-booking-js',
            TAROT_JIJI_URL . 'assets/js/tarot-booking.js',
            ['jquery'],
            TAROT_JIJI_VERSION,
            true
        );

        wp_localize_script('tarot-booking-js', 'tarotJijiConfig', [
            'restUrl' => esc_url_raw(rest_url('tarot-jiji/v1/')),
            'nonce'   => wp_create_nonce('wp_rest'),
            'payeeName' => get_option('tarot_jiji_payee_name', 'jeevani V'),
            'upiId' => get_option('tarot_jiji_upi_id', 'jeevani.v@oksbi'),
            'holdDurationMins' => 30
        ]);
    }

    public function enqueue_admin_assets($hook) {
        if (strpos($hook, 'tarot-bookings') !== false) {
            wp_enqueue_style('tarot-admin-css', TAROT_JIJI_URL . 'assets/css/tarot-admin.css', [], TAROT_JIJI_VERSION);
        }
    }

    public function render_booking_shortcode($atts) {
        ob_start();
        include TAROT_JIJI_PATH . 'templates/booking-shortcode.php';
        return ob_get_clean();
    }

    public function render_services_shortcode($atts) {
        ob_start();
        include TAROT_JIJI_PATH . 'templates/services-grid.php';
        return ob_get_clean();
    }
}

// Bootstrap Plugin
function tarot_with_jiji() {
    return Tarot_With_Jiji::instance();
}
tarot_with_jiji();
