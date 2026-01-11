/** SCE v0.3.41 [BETA] - MINIBOX & VERIFICATION ENGINE **/
let mbClicks = 0;
let mbTimer;

/**
 * 1. TRIPLE-CLICK TRIGGER
 * Sequence: 3 clicks within 800ms to toggle the diagnostic bridge.
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
            // Clear notification dot when viewed, unless a key is still pending
            const dot = document.getElementById('notif-dot');
            if (dot && !currentUser.newRestoreAvailable) {
                dot.style.display = 'none';
            }
        }
        mbClicks = 0;
        if (window.playClickSound) playClickSound();
    }
}

/**
 * 2. DYNAMIC CONTENT RENDERING
 * Logic: Pivots UI based on Identity Handshake (Admin vs User vs Guest)
 */
async function renderMiniboxContent() {
    const container = document.getElementById('minibox-content');
    const vBox = document.getElementById('verify-box'); 
    if (!container) return;

    // Default: Hide the verification input unless needed
    if (vBox) vBox.style.display = 'none';

    if (currentUser.isAdmin) {
        /** CASE: ADMIN ENGINE **/
        container.innerHTML = `
            <h4 style="color:var(--gold); font-size:11px; margin-bottom:10px; letter-spacing:1px;">ADMIN TICKET QUEUE</h4>
            <div id="ticket-list" class="mini-terminal-list">SYNCING...</div>
        `;
        
        try {
            const res = await fetch('/api/admin/tickets');
            const tickets = await res.json();
            const list = document.getElementById('ticket-list');
            
            list.innerHTML = tickets.length ? '' : '<p style="font-size:10px; color:#555; text-align:center;">No pending requests.</p>';
            
            tickets.forEach(t => {
                list.innerHTML += `
                    <div class="ticket-item">
                        <div style="display:flex; justify-content:space-between;">
                            <strong style="color:var(--gold);">${t.username}</strong>
                            <span style="font-size:8px; opacity:0.5;">${new Date(t.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div style="font-size:10px; color:#aaa; margin-top:4px;">FILE: ${t.filename}</div>
                    </div>`;
            });
        } catch (e) {
            list.innerHTML = '<span style="color:var(--del-red); font-size:10px;">Auth Handshake Failed</span>';
        }

    } else if (currentUser.isGuest) {
        /** CASE: GUEST LOCK **/
        container.innerHTML = `
            <h4 style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Protocol Restricted</h4>
            <p style="font-size:10px; color:#666; margin-top:10px; line-height:1.4;">
                Guest sessions are volatile. Recovery tickets and verification keys are locked for non-TAW explorers.
            </p>
        `;
    } else {
        /** CASE: STANDARD USER **/
        
        // Show Verification Box if Admin has already issued a key
        if (currentUser.newRestoreAvailable && vBox) {
            vBox.style.display = 'block';
        }

        container.innerHTML = `
            <h4 style="font-size:11px; letter-spacing:1px;">RECOVERY TICKET</h4>
            <p style="font-size:9px; color:var(--text-muted); margin:5px 0;">Request asset extraction from Warranty Vault.</p>
            <input type="text" id="req_file" placeholder="filename.c" class="mini-input">
            <button onclick="submitRecovery()" class="btn-transmit" style="width:100%; font-size:10px; margin-top:5px;">SUBMIT TO WAN234-SYS</button>
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
        return alert("Validation Error: Please specify a valid .c source file.");
    }

    try {
        const res = await fetch('/api/admin/mail/send', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                username: currentUser.username, 
                filename: filename 
            })
        });

        if (res.ok) {
            alert("Transmission Successful. Ticket added to the Admin Service Queue.");
            document.getElementById('minibox-ui').style.display = 'none';
            filenameInput.value = '';
            if (window.playSuccessSound) playSuccessSound();
        } else {
            alert("Transmission Error: Administrative bridge is busy.");
        }
    } catch (e) {
        alert("Protocol Error: Check identity link status.");
    }
}

/**
 * 4. KEY VERIFICATION HANDLER
 * Final step of the v0.3.41 Recovery Protocol.
 */
async function verifyOwnership() {
    const input = document.getElementById('verify_key_input');
    const key = input.value.trim();

    if (!key) return alert("System Error: Key field cannot be null.");

    try {
        const res = await fetch('/api/user/verify-key', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: key })
        });

        if (res.ok) {
            alert("VERIFICATION SUCCESS: Asset relocated to Primary Cloud.");
            location.reload(); 
        } else {
            alert("VERIFICATION FAILED: Key mismatch or expired token.");
        }
    } catch (e) {
        alert("Fatal Error: Sync failure during key injection.");
    }
}