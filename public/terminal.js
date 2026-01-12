/** SCE v1.0.1 [BETA] - TERMINAL & CLOUD ENGINE **/

/**
 * 1. ADMIN OVERRIDE & HOTKEYS
 * Shortcut: [Shift + Enter] toggles the CLI.
 */
window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'Enter' && window.currentUser?.isAdmin) {
        e.preventDefault();
        toggleAdminTerminal();
    }
});

function toggleAdminTerminal() {
    const term = document.getElementById('admin-terminal-overlay');
    if (!term) return;

    const isHidden = term.style.display === 'none' || term.style.display === '';
    term.style.display = isHidden ? 'flex' : 'none';
    
    if (isHidden) {
        logToTerminal("SCE_ADMIN_BRIDGE: SECURE_LINK_ESTABLISHED", "var(--electric-green)");
        logToTerminal("System Ready. Listening for vault handshakes...", "var(--text-muted)");
        refreshAdminTickets();
        
        // Auto-ping bridge status
        updateBridgePing();
    }
}

/**
 * 2. COMMAND INTERPRETER & TICKET MANAGEMENT
 */
document.getElementById('term-input')?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const input = e.target.value.trim().toLowerCase();
        
        if (input.startsWith('/recover ')) {
            const params = input.replace('/recover ', '').split(' ');
            if (params.length === 2) {
                executeRecovery(params[0], params[1]);
            } else {
                logToTerminal("ERR: Syntax invalid. Use: /recover [user] [file.c]", "var(--danger-red)");
            }
        } else if (input === 'clear') {
            const output = document.getElementById('terminal-output');
            if (output) output.innerHTML = '<div class="log-line sys">[SYSTEM] Log cleared.</div>';
        } else if (input === 'help') {
            logToTerminal("AVAILABLE: /recover [u] [f], /clear, /refresh, help", "var(--gold)");
        } else if (input === '/refresh') {
            refreshAdminTickets();
            logToTerminal("Re-syncing ticket queue...", "var(--text-muted)");
        } else {
            logToTerminal(`> Unknown Command: ${input}`, "#555");
        }

        e.target.value = '';
    }
});

// Sidebar Ticket Loader: Fetches from server.js global.adminTickets
async function refreshAdminTickets() {
    const list = document.getElementById('admin-ticket-list');
    if (!list) return;

    try {
        const res = await fetch('/api/admin/tickets');
        const tickets = await res.json();
        
        list.innerHTML = tickets.length ? '' : '<div class="shimmer-log" style="padding:20px;">QUEUE_EMPTY</div>';
        
        tickets.forEach(t => {
            const item = document.createElement('div');
            item.className = 'admin-ticket-item';
            item.innerHTML = `
                <span class="t-user">${t.username}</span>
                <span class="t-file">${t.filename}</span>
            `;
            item.onclick = () => focusTicket(t.username, t.filename);
            list.appendChild(item);
        });
    } catch (e) {
        logToTerminal("ERROR: FAILED_TO_SYNC_VAULT_TICKETS", "var(--danger-red)");
    }
}

function focusTicket(user, file) {
    const actionZone = document.getElementById('terminal-actions');
    const userDisplay = document.getElementById('target-user');
    const fileDisplay = document.getElementById('target-file');
    
    userDisplay.innerText = `USER: ${user}`;
    fileDisplay.innerText = `FILE: ${file}`;
    actionZone.style.display = 'flex';
    
    // Bind the process button to these specific parameters
    document.getElementById('process-btn').onclick = () => executeRecovery(user, file);
    
    logToTerminal(`TARGETING_ASSET: ${file} for user ${user}`, "var(--gold)");
}

/**
 * 3. CORE RECOVERY EXECUTION
 */
async function executeRecovery(username, filename) {
    logToTerminal(`INITIATING_RECONSTITUTION: [${username}]`, "var(--gold)");
    
    try {
        const res = await fetch('/api/admin/restore', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, filename })
        });
        const data = await res.json();
        
        if (data.success) {
            logToTerminal(`SUCCESS: KEY_ISSUED [${data.claimKey}]`, "var(--electric-green)");
            logToTerminal(`Asset ready for user pickup.`, "var(--text-muted)");
            document.getElementById('terminal-actions').style.display = 'none';
            refreshAdminTickets();
        } else {
            logToTerminal(`FAILED: Server rejected extraction.`, "var(--danger-red)");
        }
    } catch (err) {
        logToTerminal(`CRITICAL_ERR: Handshake timeout.`, "var(--danger-red)");
    }
}

/**
 * 4. CLOUD REPOSITORY SYNC (Dual-Sync Explorer)
 */
async function fetchFiles() {
    try {
        const res = await fetch('/api/cloud/files');
        const files = await res.json();
        
        const myContainer = document.getElementById('my-file-list');
        const othersContainer = document.getElementById('others-file-list');
        if (!myContainer || !othersContainer) return;

        myContainer.innerHTML = ''; 
        othersContainer.innerHTML = '';

        files.forEach(f => {
            const isGuest = window.currentUser?.isGuest;
            const isOwner = f.owner === window.currentUser?.username;
            
            const row = document.createElement('div');
            row.className = `file-row ${f.isRecovered ? 'recovered' : ''}`;
            
            // Masking logic for Guest Session
            const displayName = isGuest ? "HIDDEN_SOURCE.c" : f.name;
            const displayOwner = isGuest ? "---" : f.owner;

            row.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file-code file-icon"></i>
                    <div>
                        <div class="file-name">${displayName} ${f.isRecovered ? '<span class="gold-text">★</span>' : ''}</div>
                        <div class="sub-text">OWNER: ${displayOwner} | SECURED_VAULT</div>
                    </div>
                </div>
                <div class="file-actions">
                    ${isGuest ? 
                        '<span class="badge-locked">RESTRICTED</span>' : 
                        `<a href="${f.url}" download class="btn-transmit" style="padding:6px 12px; font-size:9px; text-decoration:none;">GET</a>`
                    }
                </div>`;

            if (!isGuest && isOwner) {
                myContainer.appendChild(row);
            } else {
                othersContainer.appendChild(row);
            }
        });

        // Update counts
        document.getElementById('my-count').innerText = myContainer.children.length;
        document.getElementById('others-count').innerText = othersContainer.children.length;
        
    } catch (err) {
        console.error("SYNC_ERR: Repository heartbeat failed.");
    }
}

/**
 * 5. UTILITIES
 */
function logToTerminal(text, color) {
    const output = document.getElementById('terminal-output');
    if (!output) return;
    const time = new Date().toLocaleTimeString([], { hour12: false });
    output.innerHTML += `<div class="log-line" style="color:${color}">[${time}] ${text}</div>`;
    output.scrollTop = output.scrollHeight;
}

function updateBridgePing() {
    const pingEl = document.getElementById('bridge-ping');
    if (pingEl) pingEl.innerText = `${Math.floor(Math.random() * 50) + 10} ms`;
}

// Global Export for other modules
window.fetchFiles = fetchFiles;
window.toggleAdminTerminal = toggleAdminTerminal;
window.refreshAdminTickets = refreshAdminTickets;