/** SCE v1.0.1 [BETA] - MINIBOX & VERIFICATION ENGINE **/
let mbClicks = 0;
let mbTimer;

/**
 * 1. TRIPLE-CLICK TRIGGER (Diagnostic Bridge)
 * Sequence: 3 clicks within 800ms on the chip icon to toggle the HUD.
 */
function handleMiniboxClick() {
    mbClicks++;
    clearTimeout(mbTimer);
    mbTimer = setTimeout(() => mbClicks = 0, 800);

    if (mbClicks === 3) {
        const ui = document.getElementById('minibox-ui');
        if (!ui) return;

        const isHidden = ui.style.display === 'none' || ui.style.display === '';
        ui.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
            renderMiniboxContent();
            // Reset notification dot if no pending items remain in the global user state
            const dot = document.getElementById('notif-dot');
            if (dot && (!window.currentUser || !window.currentUser.newRestoreAvailable)) {
                dot.style.display = 'none';
            }
        }
        mbClicks = 0;
        if (window.playClickSound) window.playClickSound();
    }
}

/**
 * 2. DYNAMIC CONTENT RENDERING
 * Logic: Pivots the HUD interface based on the Identity Handshake.
 */
async function renderMiniboxContent() {
    const container = document.getElementById('minibox-content');
    const vBox = document.getElementById('verify-box'); 
    const userDisplay = document.getElementById('mini-user-display');
    
    if (!container) return;
    if (userDisplay) userDisplay.innerText = window.currentUser?.username || "ANONYMOUS";

    // Standard Reset: Verification input only shows when a restore is ready
    if (vBox) vBox.style.display = 'none';

    if (window.currentUser?.isAdmin) {
        /** CASE: ADMIN ENGINE (Ticket Management) **/
        container.innerHTML = `
            <h4 style="color:var(--gold); font-size:10px; margin-bottom:8px; letter-spacing:1px;">ADMIN_TICKET_QUEUE</h4>
            <div id="ticket-list" class="mini-terminal-list">SYNCHRONIZING...</div>
        `;
        
        try {
            const res = await fetch('/api/admin/tickets');
            const tickets = await res.json();
            const list = document.getElementById('ticket-list');
            
            if (list) {
                list.innerHTML = tickets.length ? '' : '<p style="font-size:10px; color:#555; text-align:center;">Queue empty.</p>';
                tickets.forEach(t => {
                    list.innerHTML += `
                        <div class="ticket-item" style="border-left: 2px solid var(--gold); padding-left:8px; margin-bottom:10px;">
                            <div style="display:flex; justify-content:space-between; font-size:10px;">
                                <strong style="color:var(--gold);">${t.username}</strong>
                                <span style="opacity:0.4; font-size:8px;">${new Date(t.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div style="font-size:9px; color:#aaa; overflow:hidden; text-overflow:ellipsis;">${t.filename}</div>
                        </div>`;
                });
            }
        } catch (e) {
            if (list) list.innerHTML = '<span style="color:#ff4d4d;">BRIDGE_OFFLINE</span>';
        }

    } else if (window.currentUser?.isGuest) {
        /** CASE: GUEST LOCK (Volatile Warning) **/
        container.innerHTML = `
            <div style="padding:10px; background:rgba(255,255,255,0.03); border-radius:5px;">
                <h4 style="font-size:10px; color:#777; margin:0;">PROTOCOL_RESTRICTED</h4>
                <p style="font-size:9px; color:#555; margin-top:8px; line-height:1.4;">
                    Volatile sessions cannot generate recovery tickets. Accept TAW terms via GitHub login for full extraction rights.
                </p>
            </div>
        `;
    } else {
        /** CASE: AUTHENTICATED USER (Standard Recovery) **/
        
        // Auto-show verification box if a key has already been granted by Admin
        if (window.currentUser?.newRestoreAvailable && vBox) {
            vBox.style.display = 'block';
        }

        container.innerHTML = `
            <h4 style="font-size:10px; color:var(--electric-green);">RECOVERY_TICKET</h4>
            <p style="font-size:9px; color:var(--text-muted); margin:5px 0;">Request asset extraction from the SECURED Vault.</p>
            <input type="text" id="req_file" placeholder="filename.c" class="mini-input" style="margin-bottom:5px;">
            <button onclick="submitRecovery()" class="btn-claim" style="background:var(--electric-green); color:#000;">
                SEND TO WAN234-SYS
            </button>
        `;
    }
}

/**
 * 3. TICKET TRANSMISSION
 */
async function submitRecovery() {
    const filenameInput = document.getElementById('req_file');
    const filename = filenameInput.value.trim();

    if (!filename || !filename.endsWith('.c')) {
        return alert("VALIDATION_ERROR: Target must be a .c source file.");
    }

    try {
        const res = await fetch('/api/admin/mail/send', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                username: window.currentUser.username, 
                filename: filename 
            })
        });

        if (res.ok) {
            alert("TRANSMISSION_SUCCESS: Ticket added to the Admin Service Queue.");
            const ui = document.getElementById('minibox-ui');
            if (ui) ui.style.display = 'none';
            filenameInput.value = '';
            if (window.playSuccessSound) window.playSuccessSound();
        } else {
            alert("BRIDGE_ERROR: Administrative bridge is currently unresponsive.");
        }
    } catch (e) {
        alert("PROTOCOL_CRITICAL: Sync failure.");
    }
}

/**
 * 4. KEY VERIFICATION HANDLER
 * Final step: Injects the high-entropy key to move files from Vault to Repository.
 */
async function verifyOwnership() {
    const input = document.getElementById('verify_key_input');
    const key = input.value.trim();

    if (!key) return alert("INPUT_NULL: Key required.");

    try {
        const res = await fetch('/api/user/verify-key', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: key })
        });

        if (res.ok) {
            alert("IDENTITY_VERIFIED: Asset reconstituted in community repository.");
            location.reload(); 
        } else {
            alert("VERIFICATION_FAILED: Key mismatch or sequence expired.");
        }
    } catch (e) {
        alert("FATAL_SYNC_ERROR: Handshake failed.");
    }
}