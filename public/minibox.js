/** SCE v1.0.4 - MINIBOX & VERIFICATION ENGINE [STABLE] **/
let mbClicks = 0;
let mbTimer;

/**
 * 1. TRIPLE-CLICK TRIGGER
 */
function handleMiniboxClick() {
    mbClicks++;
    clearTimeout(mbTimer);
    mbTimer = setTimeout(() => mbClicks = 0, 800);

    if (mbClicks === 3) {
        const container = document.getElementById('minibox-container');
        if (!container) return;

        const isHidden = container.style.display === 'none' || container.style.display === '';
        container.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
            renderMiniboxContent();
            const dot = document.getElementById('minibox-pulse');
            if (dot) dot.classList.remove('pulse-red');
        }
        mbClicks = 0;
    }
}

/**
 * 2. DYNAMIC CONTENT RENDERING
 * Automated to fetch the key for the user once Admin approves.
 */
async function renderMiniboxContent() {
    const vBox = document.getElementById('verify-box'); 
    const userDisplay = document.getElementById('mini-user-display');
    const user = window.currentUser?.user;
    
    if (userDisplay) {
        userDisplay.innerText = user?.username || "UNVERIFIED";
        userDisplay.style.color = user?.isAdmin ? "#ffd700" : "#00ff41";
    }

    // A. ADMIN VIEW: Manage incoming requests
    if (user?.isAdmin) {
        vBox.innerHTML = `
            <h4 class="section-label">ADMIN_TICKET_QUEUE</h4>
            <div id="ticket-list" style="font-size:9px; color:#8b949e; max-height:150px; overflow-y:auto;">
                Syncing Encrypted Requests...
            </div>`;
        fetchTicketQueue();
    } 
    
    // B. USER VIEW: Automatically retrieve the 6-6-6-6 key from the vault
    else {
        try {
            // Updated to check for pending keys assigned to this user
            const res = await fetch('/api/vault/check-recovery'); 
            const data = await res.json();

            if (data.pending) {
                vBox.innerHTML = `
                    <h4 class="section-label" style="color:#ffd700;">RECOVERY_CODE_RECEIVED</h4>
                    <p class="section-desc">Your key for <b>${data.filename}</b> has been issued:</p>
                    <div id="display-gold-key" style="background:#0d1117; border:1px solid #00ff41; color:#00ff41; padding:10px; font-family:monospace; text-align:center; margin-bottom:10px; font-size:11px; letter-spacing:1px;">
                        ${data.key}
                    </div>
                    <button onclick="verifyOwnership('${data.key}')" style="width:100%; background:#00ff41; color:#000; border:none; padding:8px; cursor:pointer; font-weight:bold; font-size:10px;">INITIALIZE_RECONSTITUTION</button>
                `;
            } else {
                vBox.innerHTML = `<p class="section-desc">No active recovery protocols detected.</p>`;
            }
        } catch (e) {
            vBox.innerHTML = `<p class="section-desc" style="color:#ff4d4d;">VAULT_OFFLINE</p>`;
        }
    }
}

/**
 * 3. KEY VERIFICATION (User Side)
 * Now accepts the key directly from the auto-display logic.
 */
async function verifyOwnership(providedKey) {
    const key = providedKey || document.getElementById('verify_key_input')?.value.trim();

    if (!key || key.length < 24) return alert("INVALID_KEY: Protocol handshake failed.");

    try {
        const res = await fetch('/api/vault/verify-reconstitution', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: key })
        });

        const data = await res.json();

        if (res.ok) {
            alert(`SUCCESS: ${data.message}`);
            location.reload(); 
        } else {
            alert(`FAILED: ${data.error}`);
        }
    } catch (e) {
        alert("PROTOCOL_CRITICAL: Handshake failed.");
    }
}

/**
 * 4. ADMIN: FETCH TICKET QUEUE
 */
async function fetchTicketQueue() {
    const list = document.getElementById('ticket-list');
    try {
        const res = await fetch('/api/admin/tickets'); 
        const tickets = await res.json();
        
        if (list) {
            list.innerHTML = tickets.length > 0 ? '' : 'QUEUE_EMPTY';
            tickets.forEach(t => {
                const item = document.createElement('div');
                item.style.cssText = "border-bottom:1px solid #30363d; padding:6px 0; display:flex; justify-content:space-between; align-items:center;";
                item.innerHTML = `
                    <span><b style="color:#ffd700;">${t.username}</b> <br> <i style="font-size:8px;">${t.filename}</i></span>
                    <button onclick="executeRestore('${t.username}', '${t.filename}')" style="font-size:8px; background:#00ff41; color:#000; border:none; padding:4px 8px; cursor:pointer;">RECOVER</button>
                `;
                list.appendChild(item);
            });
        }
    } catch (e) {
        if (list) list.innerHTML = "OFFLINE";
    }
}

/**
 * 5. ADMIN RESTORE EXECUTION
 * Removed the key alert. The key is now handled silently via database sync.
 */
async function executeRestore(username, filename) {
    if(!confirm(`Authorize recovery for ${username}?`)) return;
    
    try {
        const res = await fetch('/api/admin/restore', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, filename })
        });
        
        const data = await res.json();
        if(data.success) {
            // No key alert here anymore—just a status update
            console.log(`[ADMIN] Recovery approved for ${username}. Key synced to vault.`);
            fetchTicketQueue();
        }
    } catch (err) {
        console.error("ADMIN_RESTORE_ERR:", err);
    }
}

// Global Event Delegation
document.addEventListener('click', (e) => {
    if (e.target.closest('.status-text') || e.target.closest('.minibox-header')) {
        handleMiniboxClick();
    }
});