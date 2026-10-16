<?php
if (!defined('ABSPATH')) {
    exit;
}
$services = Tarot_JIJI_DB::get_services();
?>
<div class="tarot-services-grid-wrapper">
    <?php foreach ($services as $s): ?>
        <div class="tarot-svc-card <?php echo $s['id'] === 'tarot-1hr' ? 'featured' : ''; ?>">
            <span class="badge"><?php echo esc_html($s['badge']); ?></span>
            <h3 class="serif-title"><?php echo esc_html($s['name']); ?></h3>
            <div class="meta">
                <span>⏱️ <?php echo esc_html($s['duration']); ?></span>
                <span><?php echo $s['type'] === 'live' ? '📞 Live Session' : '📄 Written Report'; ?></span>
            </div>
            <p class="desc"><?php echo esc_html($s['description']); ?></p>
            <div class="footer">
                <div class="price">
                    <span class="curr">INR Fixed</span>
                    <span class="val">₹<?php echo esc_html($s['price']); ?></span>
                </div>
                <a href="#book" class="tarot-btn-sm" onclick="if(window.tarotSelectService){window.tarotSelectService('<?php echo esc_js($s['id']); ?>');}">Book Reading</a>
            </div>
        </div>
    <?php endforeach; ?>
</div>
