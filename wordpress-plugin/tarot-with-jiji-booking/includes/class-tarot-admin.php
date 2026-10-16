<?php
if (!defined('ABSPATH')) {
    exit;
}

class Tarot_JIJI_Admin {

    public static function init() {
        add_action('admin_menu', [__CLASS__, 'register_admin_menus']);
        add_action('admin_post_tarot_confirm_verification', [__CLASS__, 'handle_post_verification_action']);
        add_action('admin_init', [__CLASS__, 'check_email_action_gateway']);
    }

    public static function register_admin_menus() {
        add_menu_page(
            'Tarot with Jiji Bookings',
            'Tarot Bookings',
            'manage_options',
            'tarot-bookings',
            [__CLASS__, 'render_bookings_page'],
            'dashicons-star-filled',
            26
        );

        add_submenu_page(
            'tarot-bookings',
            'Tarot Settings',
            'Settings',
            'manage_options',
            'tarot-settings',
            [__CLASS__, 'render_settings_page']
        );
    }

    /**
     * Intercepts GET request from owner email links and presents safe POST confirmation page
     * Protects completely against email spam/antivirus scanners that pre-fetch GET links!
     */
    public static function check_email_action_gateway() {
        if (isset($_GET['tarot_action_gateway']) && $_GET['tarot_action_gateway'] === '1') {
            if (!current_user_can('manage_options')) {
                auth_redirect();
            }

            $booking_ref = sanitize_text_field($_GET['ref'] ?? '');
            $action = sanitize_text_field($_GET['action'] ?? '');
            $token = sanitize_text_field($_GET['token'] ?? '');

            global $wpdb;
            $table = Tarot_JIJI_DB::get_table_name();
            $booking = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM $table WHERE booking_ref = %s AND action_token = %s",
                $booking_ref,
                $token
            ));

            if (!$booking) {
                wp_die('Invalid, expired, or previously used action link.', 'Verification Error', ['response' => 403]);
            }

            self::render_intermediate_confirmation_screen($booking, $action, $token);
            exit;
        }
    }

    private static function render_intermediate_confirmation_screen($booking, $action, $token) {
        $is_approve = ($action === 'approve');
        $action_label = $is_approve ? 'Approve Payment' : 'Reject Payment';
        $btn_color = $is_approve ? '#2e7d32' : '#c62828';
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Confirm Action — Tarot with Jiji</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FFFDFB; color: #1E1E24; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                .box { background: #FFFFFF; border: 1px solid #E8D8D8; border-radius: 12px; padding: 36px; max-width: 520px; width: 100%; box-shadow: 0 10px 30px rgba(122,46,69,0.08); }
                h1 { color: #7A2E45; font-size: 22px; margin-top: 0; border-bottom: 2px solid #E8D8D8; padding-bottom: 12px; }
                .summary { background: #F9F5F0; border-radius: 8px; padding: 18px; margin: 20px 0; font-size: 14px; line-height: 1.8; }
                .btn { background: <?php echo esc_attr($btn_color); ?>; color: #fff; border: none; padding: 14px 28px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%; transition: opacity 0.2s; }
                .btn:hover { opacity: 0.9; }
                .note { font-size: 12px; color: #777; margin-top: 14px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="box">
                <h1>Tarot with Jiji — Confirm Verification</h1>
                <p>You are about to execute <strong><?php echo esc_html($action_label); ?></strong> for the following order:</p>
                
                <div class="summary">
                    <div><strong>Booking Ref:</strong> <?php echo esc_html($booking->booking_ref); ?></div>
                    <div><strong>Customer:</strong> <?php echo esc_html($booking->full_name); ?> (<?php echo esc_html($booking->phone); ?>)</div>
                    <div><strong>Service:</strong> <?php echo esc_html($booking->service_name); ?></div>
                    <div><strong>Amount:</strong> ₹<?php echo esc_html($booking->amount); ?></div>
                    <div><strong>Submitted 12-digit UTR:</strong> <span style="font-family: monospace; font-weight: bold; color: #7A2E45;"><?php echo esc_html($booking->utr_number ?: 'None'); ?></span></div>
                </div>

                <form method="POST" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <?php wp_nonce_field('tarot_confirm_verification_nonce', '_tarot_nonce'); ?>
                    <input type="hidden" name="action" value="tarot_confirm_verification">
                    <input type="hidden" name="ref" value="<?php echo esc_attr($booking->booking_ref); ?>">
                    <input type="hidden" name="ver_action" value="<?php echo esc_attr($action); ?>">
                    <input type="hidden" name="token" value="<?php echo esc_attr($token); ?>">
                    <button type="submit" class="btn">Yes, Confirm <?php echo esc_html($action_label); ?></button>
                </form>

                <p class="note">Protected against automated antivirus scanners. Action strictly executes on POST confirmation.</p>
            </div>
        </body>
        </html>
        <?php
    }

    /**
     * Executes state change on POST request
     */
    public static function handle_post_verification_action() {
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized', '', ['response' => 403]);
        }
        check_admin_referer('tarot_confirm_verification_nonce', '_tarot_nonce');

        $booking_ref = sanitize_text_field($_POST['ref'] ?? '');
        $ver_action = sanitize_text_field($_POST['ver_action'] ?? '');
        $token = sanitize_text_field($_POST['token'] ?? '');

        global $wpdb;
        $table = Tarot_JIJI_DB::get_table_name();
        $booking = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE booking_ref = %s AND action_token = %s",
            $booking_ref,
            $token
        ));

        if (!$booking) {
            wp_die('Invalid order or token expired.');
        }

        if ($ver_action === 'approve') {
            $wpdb->update($table, ['status' => 'Confirmed'], ['booking_ref' => $booking_ref]);
            Tarot_JIJI_Emails::send_customer_confirmed_email($booking);
            wp_redirect(admin_url('admin.php?page=tarot-bookings&msg=approved'));
            exit;
        } elseif ($ver_action === 'reject') {
            $wpdb->update($table, ['status' => 'Rejected'], ['booking_ref' => $booking_ref]);
            Tarot_JIJI_Emails::send_customer_rejected_email($booking);
            wp_redirect(admin_url('admin.php?page=tarot-bookings&msg=rejected'));
            exit;
        }
    }

    public static function render_bookings_page() {
        global $wpdb;
        $table = Tarot_JIJI_DB::get_table_name();
        $status_filter = sanitize_text_field($_GET['status'] ?? 'all');

        $where = "WHERE 1=1";
        if ($status_filter !== 'all') {
            $where .= $wpdb->prepare(" AND status = %s", $status_filter);
        }

        $orders = $wpdb->get_results("SELECT * FROM $table $where ORDER BY created_at DESC");
        ?>
        <div class="wrap">
            <h1 class="wp-heading-inline" style="font-family: Georgia, serif; color: #7A2E45;">Tarot with Jiji — Orders & Verification</h1>
            <hr class="wp-header-end">

            <?php if (isset($_GET['msg']) && $_GET['msg'] === 'approved'): ?>
                <div class="notice notice-success is-dismissible"><p>Order approved and confirmation email dispatched to customer!</p></div>
            <?php elseif (isset($_GET['msg']) && $_GET['msg'] === 'rejected'): ?>
                <div class="notice notice-warning is-dismissible"><p>Order marked as Rejected. Polite notification sent to customer.</p></div>
            <?php endif; ?>

            <ul class="subsubsub">
                <li><a href="<?php echo admin_url('admin.php?page=tarot-bookings'); ?>" class="<?php echo $status_filter === 'all' ? 'current' : ''; ?>">All Orders</a> |</li>
                <li><a href="<?php echo admin_url('admin.php?page=tarot-bookings&status=Awaiting+Verification'); ?>" class="<?php echo $status_filter === 'Awaiting Verification' ? 'current' : ''; ?>">Awaiting Verification</a> |</li>
                <li><a href="<?php echo admin_url('admin.php?page=tarot-bookings&status=Pending+Payment'); ?>" class="<?php echo $status_filter === 'Pending Payment' ? 'current' : ''; ?>">Pending Payment</a> |</li>
                <li><a href="<?php echo admin_url('admin.php?page=tarot-bookings&status=Confirmed'); ?>" class="<?php echo $status_filter === 'Confirmed' ? 'current' : ''; ?>">Confirmed</a> |</li>
                <li><a href="<?php echo admin_url('admin.php?page=tarot-bookings&status=Rejected'); ?>" class="<?php echo $status_filter === 'Rejected' ? 'current' : ''; ?>">Rejected</a></li>
            </ul>

            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th style="width: 110px;">Ref / Date</th>
                        <th>Client Details</th>
                        <th>Service & Consultation</th>
                        <th style="width: 80px;">Amount</th>
                        <th style="width: 140px;">12-Digit UTR</th>
                        <th style="width: 130px;">Status</th>
                        <th style="width: 160px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($orders)): ?>
                        <tr><td colspan="7" style="text-align:center; padding: 20px;">No bookings found.</td></tr>
                    <?php else: ?>
                        <?php foreach ($orders as $order): ?>
                            <tr>
                                <td>
                                    <strong><?php echo esc_html($order->booking_ref); ?></strong><br>
                                    <small><?php echo esc_html(date('d M Y, H:i', strtotime($order->created_at))); ?></small>
                                </td>
                                <td>
                                    <strong><?php echo esc_html($order->full_name); ?></strong><br>
                                    <small>📞 <?php echo esc_html($order->phone); ?></small><br>
                                    <small>✉️ <?php echo esc_html($order->email); ?></small>
                                </td>
                                <td>
                                    <strong><?php echo esc_html($order->service_name); ?></strong><br>
                                    <?php if ($order->slot_date): ?>
                                        <small>🗓️ <?php echo esc_html($order->slot_date . ' ' . $order->slot_time); ?> (<?php echo esc_html($order->comm_mode); ?>)</small>
                                    <?php else: ?>
                                        <small>📄 Channeled 48h Written Report</small>
                                    <?php endif; ?>
                                </td>
                                <td><strong style="color: #7A2E45;">₹<?php echo esc_html($order->amount); ?></strong></td>
                                <td>
                                    <?php if ($order->utr_number): ?>
                                        <span style="font-family: monospace; font-weight: bold; background: #FFF0F4; padding: 3px 6px; border-radius: 4px; color: #7A2E45;">
                                            <?php echo esc_html($order->utr_number); ?>
                                        </span>
                                    <?php else: ?>
                                        <span style="color: #999;">—</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="badge" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                                        <?php echo esc_html($order->status); ?>
                                    </span>
                                </td>
                                <td>
                                    <?php if ($order->status === 'Awaiting Verification' || $order->status === 'Pending Payment'): ?>
                                        <a href="<?php echo esc_url(add_query_arg(['tarot_action_gateway' => '1', 'ref' => $order->booking_ref, 'action' => 'approve', 'token' => $order->action_token], home_url('/'))); ?>" class="button button-primary" style="background:#2e7d32; border-color:#2e7d32;">Approve</a>
                                        <a href="<?php echo esc_url(add_query_arg(['tarot_action_gateway' => '1', 'ref' => $order->booking_ref, 'action' => 'reject', 'token' => $order->action_token], home_url('/'))); ?>" class="button button-secondary" style="color:#c62828;">Reject</a>
                                    <?php else: ?>
                                        <small style="color: #777;">Completed</small>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    public static function render_settings_page() {
        if (isset($_POST['tarot_save_settings'])) {
            check_admin_referer('tarot_settings_nonce');
            update_option('tarot_jiji_payee_name', sanitize_text_field($_POST['payee_name']));
            update_option('tarot_jiji_upi_id', sanitize_text_field($_POST['upi_id']));
            update_option('tarot_jiji_owner_email', sanitize_email($_POST['owner_email']));
            echo '<div class="notice notice-success is-dismissible"><p>Settings saved successfully.</p></div>';
        }

        $payee_name = get_option('tarot_jiji_payee_name', 'jeevani V');
        $upi_id = get_option('tarot_jiji_upi_id', 'jeevani.v@oksbi');
        $owner_email = get_option('tarot_jiji_owner_email', get_option('admin_email'));
        ?>
        <div class="wrap">
            <h1 style="color: #7A2E45;">Tarot with Jiji — Manual UPI & Booking Settings</h1>
            <form method="POST">
                <?php wp_nonce_field('tarot_settings_nonce'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Verified Payee Name</th>
                        <td><input type="text" name="payee_name" value="<?php echo esc_attr($payee_name); ?>" class="regular-text" required></td>
                    </tr>
                    <tr>
                        <th scope="row">Official UPI ID</th>
                        <td><input type="text" name="upi_id" value="<?php echo esc_attr($upi_id); ?>" class="regular-text" required></td>
                    </tr>
                    <tr>
                        <th scope="row">Owner Alert Email</th>
                        <td><input type="email" name="owner_email" value="<?php echo esc_attr($owner_email); ?>" class="regular-text" required></td>
                    </tr>
                </table>
                <p class="submit">
                    <input type="submit" name="tarot_save_settings" class="button button-primary" value="Save Settings">
                </p>
            </form>
        </div>
        <?php
    }
}
