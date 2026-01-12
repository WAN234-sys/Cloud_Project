/** SCE v1.0.5 - TERMINAL & CLOUD ENGINE [STABLE] **/

/**
 * 1. ADMIN OVERRIDE & HOTKEYS
 */
window.addEventListener('keydown', (e) => {
    // FIXED: Ensure we check the correct session object from bridge.js
    const user = window.currentUser || (window.Bridge && Bridge.user);
    
    if (e.shiftKey && e.key === 'Enter' && user?.isAdmin) {
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
        
        // FIXED: Using the common ID 'noa-input' from the combined HTML
        const cmdInput = document.getElementById('admin-input') || document.getElementById('noa-input');
        if (cmdInput) setTimeout(() => cmdInput.focus(), 50); 
    }
}

/**
 * 2. COMMAND INTERPRETER
 */
document.addEventListener('DOMContentLoaded', () => {
    // FIXED: Handle both possible IDs for the admin input line
    const adminInput = document.getElementById('admin-input') || document.getElementById('noa-input');
    if (!adminInput) return;

    adminInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const fullCommand = e.target.value.trim();
            if (!fullCommand) return;

            e.target.value = ''; 

            // Log the command back to the terminal (User echo)
            logToTerminal(`ADMIN@SCE:~$ ${fullCommand}`, "#ffffff");

            if (fullCommand.startsWith('/recover ')) {
                const parts = fullCommand.split(' ');
                if (parts.length < 3) {
                    logToTerminal("ERROR: INVALID_SYNTAX. Use /recover [user] [file]", "#ff4d4d");
                    return;
                }
                executeRecovery(parts[1], parts[2]);
            } else if (fullCommand === '/clear') {
                const output = document.getElementById('terminal-output') || document.getElementById('noa-output');
                if (output) output.innerHTML = '';
            } else {
                logToTerminal(`UNKNOWN_COMMAND: ${fullCommand}`, "#8b949e");
            }
        }
    });
});

/**
 * 3. TICKET MANAGEMENT
 */
async function refreshAdminTickets() {
    const list = document.getElementById('admin-ticket-list');
    if (!list) return;

    try {
        const res = await fetch('/api/admin/tickets');
        const tickets = await res.json();
        list.innerHTML = tickets.length ? '' : '<div class="shimmer-log" style="padding:20px; font-size:10px;">QUEUE_EMPTY</div>';
        
        tickets.forEach(t => {
            const item = document.createElement('div');
            item.className = 'admin-ticket-item';
            item.style.cssText = "padding:8px; border-bottom:1px solid #1a1f26; cursor:pointer; font-size:11px;";
            item.innerHTML = `
                <div style="color:#ffd700">${t.username}</div>
                <div style="color:#8b949e; font-size:9px;">${t.filename}</div>
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
    if (!actionZone) return;

    document.getElementById('target-user').innerText = `USER: ${user}`;
    document.getElementById('target-file').innerText = `FILE: ${file}`;
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
            
            // Auto-hide actions and refresh
            const actionZone = document.getElementById('terminal-actions');
            if (actionZone) actionZone.style.display = 'none';
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
    // FIXED: Support both potential terminal IDs
    const output = document.getElementById('terminal-output') || document.getElementById('noa-output');
    if (!output) return;
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const line = document.createElement('div');
    line.className = 'log-line';
    line.style.color = color;
    line.style.fontSize = '11px';
    line.style.marginBottom = '4px';
    line.innerHTML = `<span style="color:#484f58; margin-right:8px;">[${time}]</span> ${text}`;
    
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function updateBridgePing() {
    const pingEl = document.getElementById('bridge-ping');
    if (pingEl) pingEl.innerText = `${Math.floor(Math.random() * 30) + 15}ms`;
}

window.toggleAdminTerminal = toggleAdminTerminal;
window.AdminTerminal = { issueKey: executeRecovery, toggle: toggleAdminTerminal };