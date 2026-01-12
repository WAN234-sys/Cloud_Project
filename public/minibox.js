/** SCE v1.0.1 [BETA] - MINIBOX & VERIFICATION ENGINE **/
let mbClicks = 0;
let mbTimer;

/**
 * 1. TRIPLE-CLICK TRIGGER (Diagnostic Bridge)
 * Sequence: 3 clicks within 800ms on the chip icon/header to toggle the HUD.
 */
function handleMiniboxClick() {
    mbClicks++;
    clearTimeout(mbTimer);
    mbTimer = setTimeout(() => mbClicks = 0, 800);

    if (mbClicks === 3) {
        const container = document.getElementById('minibox-container');
        if (!container) return;

        // Toggle visibility with a 'terminal-active' class for styling if needed
        const isHidden = container.style.display === 'none' || container.style.display === '';
        container.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
            renderMiniboxContent();
            // Clear notification dot upon viewing
            const dot = document.getElementById('notif-dot');
            if (dot) dot.style.display = 'none';
        }
        mbClicks = 0;
        console.log("[MINIBOX] Diagnostic Bridge Toggled.");
    }
}

/**
 * 2. DYNAMIC CONTENT RENDERING
 * Logic: Pivots the HUD interface based on the Identity Handshake.
 */
async function renderMiniboxContent() {
    const vBox = document.getElementById('verify-box'); 
    const userDisplay = document.getElementById('mini-user-display');
    const actionArea = document.querySelector('.minibox-actions');
    
    // Sync User Label
    if (userDisplay) {
        userDisplay.innerText = window.currentUser?.username || "UNVERIFIED";
        userDisplay.style.color = window.currentUser?.isAdmin ? "var(--gold)" : "var(--electric-green)";
    }

    // 1. ADMIN LOGIC: Fetch the Service Queue
    if (window.currentUser?.isAdmin) {
        const adminTrigger = document.getElementById('admin-trigger');
        if (adminTrigger) adminTrigger.style.display = 'block';
        
        // Show the ticket queue in the minibox section if needed
        if (vBox) {
            vBox.innerHTML = `<h4 class="section-label">ADMIN_TICKET_QUEUE</h4><div id="ticket-list" style="font-size:9px; color:var(--text-muted);">Syncing...</div>`;
            vBox.style.display = 'block';
            fetchTicketQueue();
        }
    } 
    
    // 2. GUEST LOGIC: Lock interaction
    else if (window.currentUser?.isGuest) {
        if (vBox) {
            vBox.innerHTML = `<p class="section-desc" style="color:#ff4d4d;">[RESTRICTED] Establish Neural Link via GitHub to request asset recovery.</p>`;
            vBox.style.display = 'block';
        }
    } 
    
    // 3. USER LOGIC: Standard Recovery Check
    else {
        if (window.currentUser?.newRestoreAvailable && vBox) {
            vBox.style.display = 'block';
        }
    }
}

/**
 * 3. ADMIN: FETCH TICKET QUEUE
 */
async function fetchTicketQueue() {
    const list = document.getElementById('ticket-list');
    try {
        const res = await fetch('/api/admin/tickets'); // Sync with admin routes
        const tickets = await res.json();
        
        if (list) {
            list.innerHTML = tickets.length > 0 ? '' : 'Queue Clear.';
            tickets.forEach(t => {
                list.innerHTML += `<div style="border-bottom:1px solid #333; padding:4px 0;">
                    <span style="color:var(--gold);">${t.username}</span>: ${t.filename}
                </div>`;
            });
        }
    } catch (e) {
        if (list) list.innerHTML = "OFFLINE";
    }
}

/**
 * 4. KEY VERIFICATION HANDLER
 * Final step: Reconstitutes the file from the Vault to the Community Archive.
 */
async function verifyOwnership() {
    const input = document.getElementById('verify_key_input');
    const key = input.value.trim();

    if (!key) return alert("INPUT_NULL: Recovery Key Required.");

    try {
        // Change to the specific verification route in your server
        const res = await fetch('/api/user/verify-key', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: key })
        });

        const result = await res.json();

        if (res.ok) {
            alert("IDENTITY_VERIFIED: Asset successfully reconstituted.");
            if (window.fetchFiles) window.fetchFiles(); // Refresh repository
            document.getElementById('verify-box').style.display = 'none';
        } else {
            alert(`VERIFICATION_FAILED: ${result.error || 'Invalid Key'}`);
        }
    } catch (e) {
        console.error("[MINIBOX] Sync Error:", e);
        alert("PROTOCOL_CRITICAL: Handshake failed.");
    }
}

// Attach listener to the icon in the injected HTML once loaded
document.addEventListener('click', (e) => {
    if (e.target.closest('.status-text') || e.target.closest('.minibox-header')) {
        handleMiniboxClick();
    }
});