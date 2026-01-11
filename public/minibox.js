/** SCE v0.3.1 - MINIBOX & RECOVERY ENGINE **/
let mbClicks = 0;
let mbTimer;

/**
 * Handle Triple-Click Trigger
 * Opens the Minibox UI to show tickets (Admin) or request form (User)
 */
function handleMiniboxClick() {
    mbClicks++;
    clearTimeout(mbTimer);
    mbTimer = setTimeout(() => mbClicks = 0, 800);

    if (mbClicks === 3) {
        const ui = document.getElementById('minibox-ui');
        const isHidden = ui.style.display === 'none' || ui.style.display === '';
        
        ui.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
            renderMiniboxContent();
            // Clear the notification dot upon viewing
            const dot = document.getElementById('notif-dot');
            if (dot) dot.style.display = 'none';
        }
        mbClicks = 0;
    }
}

/**
 * Render Content based on User Role
 * Admin: Sees incoming recovery requests
 * User: Sees file recovery request form
 * Guest: View-only restriction
 */
async function renderMiniboxContent() {
    const container = document.getElementById('minibox-content');
    if (!container) return;

    if (currentUser.isAdmin) {
        // ADMIN VIEW: Sync with global.adminTickets
        container.innerHTML = `
            <h4 style="color:var(--gold); font-size:11px; margin-bottom:10px;">INCOMING TICKETS</h4>
            <div id="ticket-list" style="max-height:200px; overflow-y:auto;">Syncing...</div>
        `;
        
        try {
            const res = await fetch('/api/admin/tickets');
            const tickets = await res.json();
            const list = document.getElementById('ticket-list');
            
            list.innerHTML = tickets.length ? '' : '<p style="font-size:10px; color:#555;">No pending requests in queue.</p>';
            
            tickets.forEach(t => {
                list.innerHTML += `
                    <div class="ticket-item" style="border-bottom:1px solid #222; padding:8px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="color:var(--gold); font-size:10px;">${t.username}</strong>
                            <span style="font-size:9px; color:#555;">${t.timestamp}</span>
                        </div>
                        <div style="font-size:10px; color:#aaa; margin-top:2px;">FILE: ${t.filename}</div>
                    </div>`;
            });
        } catch (e) {
            document.getElementById('ticket-list').innerHTML = '<span style="color:red; font-size:10px;">Sync Error</span>';
        }

    } else if (currentUser.isGuest) {
        // GUEST VIEW: Restrictions applied
        container.innerHTML = `
            <h4 style="font-size:11px; color:var(--text-muted);">MINIBOX</h4>
            <p style="font-size:10px; color:#555; margin-top:10px;">Recovery tools disabled for Guest accounts. Connect with GitHub to enable Warranty.</p>
        `;
    } else {
        // USER VIEW: Recovery Request Form
        container.innerHTML = `
            <h4 style="font-size:11px;">RECOVERY TICKET</h4>
            <p style="font-size:9px; color:var(--text-muted); margin:5px 0;">Request an asset restore from Warranty Vault.</p>
            <input type="text" id="req_file" placeholder="filename.c" 
                style="width:100%; background:#000; border:1px solid #333; color:white; margin:10px 0; padding:8px; font-size:11px; border-radius:4px;">
            <button onclick="submitRecovery()" class="btn-transmit" style="width:100%; font-size:10px; padding:8px;">SEND TO ADMIN</button>
        `;
    }
}

/**
 * Submit Recovery Ticket to Admin
 * Syncs with app.post('/api/admin/mail/send')
 */
async function submitRecovery() {
    const filenameInput = document.getElementById('req_file');
    const filename = filenameInput.value.trim();

    if (!filename) return alert("Please specify the missing file name.");
    if (!filename.endsWith('.c')) return alert("Only .c source files can be recovered.");

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
            alert("Transmission Successful. Admin has been notified.");
            document.getElementById('minibox-ui').style.display = 'none';
            filenameInput.value = '';
        } else {
            alert("Transmission Failed. Server busy.");
        }
    } catch (e) {
        console.error("MINIBOX ERROR:", e);
        alert("Protocol Error: Unable to reach Admin.");
    }
}

/**
 * Background Key Listener
 * Polling for claim keys issued by Admin via /restore
 */
function startRecoveryPolling() {
    // Prevent duplicate intervals
    if (window.recoveryCheckInterval) clearInterval(window.recoveryCheckInterval);

    window.recoveryCheckInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/user/check-recovery');
            if (res.status === 401) return clearInterval(window.recoveryCheckInterval);
            
            const data = await res.json();
            
            if (data.ready) {
                // 1. Show Red Dot Notification
                const dot = document.getElementById('notif-dot');
                if (dot) dot.style.display = 'block';
                
                // 2. Populate and show Claim Modal
                const keyDisplay = document.getElementById('claim-key-display');
                const popup = document.getElementById('claim-popup');
                
                if (keyDisplay && popup && popup.style.display !== 'flex') {
                    keyDisplay.innerText = data.key;
                    popup.style.display = 'flex';
                    // Stop polling once the key is delivered to the UI
                    clearInterval(window.recoveryCheckInterval);
                }
            }
        } catch (e) {
            console.warn("RECOVERY POLLING: Connection intermittent.");
        }
    }, 15000); // Poll every 15 seconds to maintain performance
}