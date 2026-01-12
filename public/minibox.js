/** SCE v1.0.4 - MINIBOX & VERIFICATION ENGINE [STABLE] **/

let mbClicks = 0;
let mbTimer;

/**
 * 1. TRIPLE-CLICK TRIGGER (HEADER ONLY)
 */
function handleMiniboxClick() {
    mbClicks++;
    clearTimeout(mbTimer);
    mbTimer = setTimeout(() => mbClicks = 0, 800);

    if (mbClicks === 3) {
        const container = document.getElementById('minibox-container');
        if (!container) return;

        const isHidden = container.style.display === 'none' || container.style.display === '';
        container.style.display = isHidden ? 'flex' : 'none';
        
        if (isHidden) {
            renderMiniboxContent();
            const dot = document.getElementById('minibox-pulse');
            if (dot) dot.style.background = "#00ff41"; 
        }
        mbClicks = 0;
    }
}

/**
 * 2. DYNAMIC CONTENT RENDERING
 */
async function renderMiniboxContent() {
    const vBox = document.getElementById('verify-box'); 
    const userDisplay = document.getElementById('mini-user-display');
    const user = window.currentUser?.user;
    
    if (userDisplay) {
        userDisplay.innerText = user?.username || "UNVERIFIED";
        userDisplay.style.color = user?.isAdmin ? "#ffd700" : "#00ff41";
    }

    if (user?.isAdmin) {
        vBox.innerHTML = `
            <h4 class="section-label">ADMIN_TICKET_QUEUE</h4>
            <div id="ticket-list" style="font-size:9px; color:#8b949e; max-height:150px; overflow-y:auto; padding-top:10px;">
                <i class="fas fa-sync fa-spin"></i> Syncing Encrypted Requests...
            </div>`;
        fetchTicketQueue();
    } 
    else {
        try {
            const res = await fetch('/api/vault/check-recovery'); 
            const data = await res.json();

            if (data.pending) {
                vBox.innerHTML = `
                    <h4 class="section-label" style="color:#ffd700;">6-6-6-6_CODE_RECEIVED</h4>
                    <p class="section-desc">Key issued for: <b>${data.filename}</b></p>
                    <div id="display-gold-key" style="background:#000; border:1px solid #ffd700; color:#ffd700; padding:10px; font-family:'Fira Code'; text-align:center; margin-bottom:10px; font-size:11px; letter-spacing:1px; font-weight:bold; word-break: break-all;">
                        ${data.key}
                    </div>
                    <button onclick="verifyOwnership('${data.key}')" class="btn-claim" style="background:#00ff41;">
                        INITIALIZE_RECONSTITUTION
                    </button>
                `;
            } else {
                vBox.innerHTML = `<p class="section-desc">No active recovery protocols detected.</p>`;
            }
        } catch (e) {
            vBox.innerHTML = `<p class="section-desc" style="color:#ff4d4d;">VAULT_CONNECTION_LOST</p>`;
        }
    }
}

/**
 * 3. KEY VERIFICATION
 * Updated for 6-6-6-6 Format (27 total characters)
 */
async function verifyOwnership(providedKey) {
    const key = providedKey || document.getElementById('recovery-key-input')?.value.trim();

    // 24 chars + 3 dashes = 27
    if (!key || key.length < 27) {
        console.error("[SYS] Handshake Failed: Key does not meet 6-6-6-6 requirements.");
        alert("INVALID_KEY_FORMAT: Protocol requires 24-bit high entropy.");
        return;
    }

    try {
        const res = await fetch('/api/vault/verify-reconstitution', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: key })
        });

        const data = await res.json();

        if (res.ok) {
            alert(`VAULT_DECRYPTED: ${data.message}`);
            location.reload(); 
        } else {
            alert(`DENIED: ${data.error}`);
        }
    } catch (e) {
        alert("CRITICAL_FAILURE: Handshake timeout.");
    }
}

/**
 * 4. AUTO-FORMATTER FOR 6-6-6-6
 */
document.addEventListener('input', (e) => {
    if (e.target.id === 'recovery-key-input') {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        let blocks = [];
        for (let i = 0; i < val.length && i < 24; i += 6) {
            blocks.push(val.substring(i, i + 6));
        }
        e.target.value = blocks.join('-');
    }
});

/**
 * 5. ADMIN HANDLERS (QUEUE & RESTORE)
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
                item.style.cssText = "border-bottom:1px solid #21262d; padding:8px 0; display:flex; justify-content:space-between; align-items:center;";
                item.innerHTML = `
                    <span><b style="color:#00ff41;">${t.username}</b><br><small style="font-size:8px; color:#8b949e;">${t.filename}</small></span>
                    <button onclick="executeRestore('${t.username}', '${t.filename}')" style="font-size:9px; background:#ffd700; color:#000; border:none; padding:4px 10px; cursor:pointer; font-weight:bold; border-radius:2px;">APPROVE</button>
                `;
                list.appendChild(item);
            });
        }
    } catch (e) { if (list) list.innerHTML = "OFFLINE"; }
}

async function executeRestore(username, filename) {
    if(!confirm(`Authorize 6-6-6-6 recovery for ${username}?`)) return;
    try {
        const res = await fetch('/api/admin/restore', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, filename })
        });
        if(res.ok) fetchTicketQueue();
    } catch (err) { console.error(err); }
}

// Global Event Listener
document.addEventListener('click', (e) => {
    if (e.target.closest('.minibox-header')) {
        handleMiniboxClick();
    }
});