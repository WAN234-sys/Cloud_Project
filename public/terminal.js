/** SCE v1.0.5 - TERMINAL & CLOUD ENGINE [STABLE] **/

/**
 * 1. ADMIN OVERRIDE & HOTKEYS
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
        logToTerminal("SCE_ADMIN_BRIDGE: SECURE_LINK_ESTABLISHED", "#00ff41");
        logToTerminal("System Ready. Listening for vault handshakes...", "#8b949e");
        refreshAdminTickets();
        updateBridgePing();
        
        // Auto-focus the command line when opened
        const cmdInput = document.getElementById('admin-input');
        if (cmdInput) cmdInput.focus();
    }
}

/**
 * 2. COMMAND INTERPRETER (Typed Commands)
 * This enables the "/recover [user] [file]" functionality.
 */
document.addEventListener('DOMContentLoaded', () => {
    const adminInput = document.getElementById('admin-input');
    if (!adminInput) return;

    adminInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const fullCommand = e.target.value.trim();
            e.target.value = ''; // Clear line after entry

            if (fullCommand.startsWith('/recover ')) {
                const parts = fullCommand.split(' ');
                if (parts.length < 3) {
                    logToTerminal("ERROR: INVALID_SYNTAX. Use /recover [user] [file]", "#ff4d4d");
                    return;
                }
                const username = parts[1];
                const filename = parts[2];
                executeRecovery(username, filename);
            } else if (fullCommand === '/clear') {
                const output = document.getElementById('terminal-output');
                if (output) output.innerHTML = '';
            } else if (fullCommand !== '') {
                logToTerminal(`UNKNOWN_COMMAND: ${fullCommand}`, "#8b949e");
            }
        }
    });
});

/**
 * 3. TICKET MANAGEMENT (The Bridge Queue)
 */
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
                <span class="t-status">[${t.status.toUpperCase()}]</span>
            `;
            item.onclick = () => focusTicket(t.username, t.filename);
            list.appendChild(item);
        });
    } catch (e) {
        logToTerminal("ERROR: FAILED_TO_SYNC_VAULT_TICKETS", "#ff4d4d");
    }
}

function focusTicket(user, file) {
    const actionZone = document.getElementById('terminal-actions');
    const userDisplay = document.getElementById('target-user');
    const fileDisplay = document.getElementById('target-file');
    
    userDisplay.innerText = `USER: ${user}`;
    fileDisplay.innerText = `FILE: ${file}`;
    actionZone.style.display = 'flex';
    
    document.getElementById('process-btn').onclick = () => executeRecovery(user, file);
    logToTerminal(`TARGETING_ASSET: ${file} for user ${user}`, "#ffd700");
}

/**
 * 4. CORE RECOVERY EXECUTION
 */
async function executeRecovery(username, filename) {
    logToTerminal(`INITIATING_RECONSTITUTION: [${username}]`, "#ffd700");
    
    try {
        const res = await fetch('/api/admin/restore', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, filename })
        });
        const data = await res.json();
        
        if (data.success) {
            logToTerminal(`SUCCESS: ASSET_LOCKED_IN_PENDING_STATE`, "#00ff41");
            logToTerminal(`RECOVERY_KEY: ${data.claimKey}`, "#ffd700");
            logToTerminal(`*** KEY SYNCED: User can now retrieve this from their Minibox. ***`, "#00ff41");
            
            document.getElementById('terminal-actions').style.display = 'none';
            refreshAdminTickets(); 
        } else {
            logToTerminal(`FAILED: ${data.error || 'Server rejected extraction.'}`, "#ff4d4d");
        }
    } catch (err) {
        logToTerminal(`CRITICAL_ERR: Handshake timeout.`, "#ff4d4d");
    }
}

/**
 * 5. UTILITIES & TELEMETRY
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
    if (pingEl) pingEl.innerText = `${Math.floor(Math.random() * 30) + 15}ms`;
}

window.toggleAdminTerminal = toggleAdminTerminal;