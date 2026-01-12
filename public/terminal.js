/** SCE v1.0.1 [BETA] - TERMINAL & CLOUD ENGINE **/

/**
 * 1. ADMIN OVERRIDE & HOTKEYS
 * Shortcut: [Shift + Enter] toggles the CLI.
 * Only functional if Identity Handshake confirms Admin status.
 */
window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'Enter' && window.currentUser?.isAdmin) {
        e.preventDefault();
        toggleAdminTerminal();
    }
});

function toggleAdminTerminal() {
    const term = document.getElementById('admin-terminal-overlay') || document.getElementById('admin-terminal');
    if (!term) return;

    const isHidden = term.style.display === 'none' || term.style.display === '';
    term.style.display = isHidden ? 'flex' : 'none';
    
    if (isHidden) {
        const input = document.getElementById('term-input');
        if (input) input.focus();
        
        logToTerminal("SCE_ADMIN_BRIDGE: SECURE_LINK_ESTABLISHED", "var(--electric-green)");
        logToTerminal("System Ready. Use /recover [user]_[file].c or use the sidebar.", "var(--text-muted)");
        refreshAdminTickets();
    }
}

/**
 * 2. COMMAND INTERPRETER & TICKET MANAGEMENT
 */
document.getElementById('term-input')?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const input = e.target.value.trim();
        const output = document.getElementById('term-output') || document.getElementById('terminal-output');
        
        if (input.startsWith('/recover ')) {
            const rawParam = input.replace('/recover ', '').trim();
            const separator = rawParam.indexOf('_');
            
            if (separator === -1 || !rawParam.endsWith('.c')) {
                logToTerminal(`ERROR: Syntax invalid. Protocol: /recover [user]_[file].c`, "var(--danger-red)");
            } else {
                const user = rawParam.substring(0, separator);
                const file = rawParam.substring(separator + 1);
                executeRecovery(user, file);
            }
        } else if (input === 'clear') {
            if (output) output.innerHTML = '<div class="log-line">SCE ARCHIVE TOOLS [v1.0.1]...</div>';
        } else if (input === 'help') {
            logToTerminal("COMMANDS: /recover, /clear, help", "var(--gold)");
        } else {
            logToTerminal(`> ERR: Unknown Command [${input}]`, "#555");
        }

        e.target.value = '';
        if (output) output.scrollTop = output.scrollHeight;
    }
});

// Sidebar Ticket Loader
async function refreshAdminTickets() {
    const list = document.getElementById('admin-ticket-list');
    if (!list) return;

    try {
        const res = await fetch('/api/admin/tickets');
        const tickets = await res.json();
        
        list.innerHTML = tickets.length ? '' : '<div class="log-line info" style="font-size:10px; padding:10px;">QUEUE_EMPTY</div>';
        
        tickets.forEach(t => {
            const item = document.createElement('div');
            item.className = 'admin-ticket-item';
            item.style = "padding:8px; border-bottom:1px solid #222; cursor:pointer;";
            item.innerHTML = `
                <div style="color:var(--gold); font-size:11px; font-weight:bold;">${t.username}</div>
                <div style="font-size:9px; color:#888;">${t.filename}</div>
            `;
            item.onclick = () => {
                logToTerminal(`FOCUS: ${t.username} // ${t.filename}`, "var(--gold)");
                executeRecovery(t.username, t.filename);
            };
            list.appendChild(item);
        });
    } catch (e) {
        logToTerminal("ERROR: FAILED_TO_SYNC_TICKETS", "var(--danger-red)");
    }
}

// Core Recovery Logic
async function executeRecovery(username, filename) {
    logToTerminal(`> INITIATING VAULT EXTRACTION: [${username}] -> [${filename}]`, "var(--gold)");
    
    try {
        const res = await fetch('/api/admin/restore', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, filename })
        });
        const data = await res.json();
        
        if (data.success) {
            logToTerminal(`> SUCCESS: Asset relocated to Primary Cloud.`, "var(--electric-green)");
            logToTerminal(`> CLAIM KEY GENERATED: [${data.claimKey}]`, "var(--gold)");
            if (window.fetchFiles) fetchFiles(); 
            refreshAdminTickets();
        } else {
            logToTerminal(`> FAILED: Recovery rejected by server.`, "var(--danger-red)");
        }
    } catch (err) {
        logToTerminal(`> CRITICAL: Handshake Timeout. Check connection.`, "var(--danger-red)");
    }
}

/**
 * 3. CLOUD FILE EXPLORER
 */
async function fetchFiles() {
    console.log("CLOUD: Syncing Repositories...");
    try {
        const res = await fetch('/api/cloud/files');
        const files = await res.json();
        
        const myContainer = document.getElementById('my-file-list');
        const othersContainer = document.getElementById('others-file-list');
        
        if (!myContainer || !othersContainer) return;
        myContainer.innerHTML = ''; 
        othersContainer.innerHTML = '';

        files.forEach(f => {
            const sizeMB = f.sizeBytes ? (f.sizeBytes / (1024 * 1024)).toFixed(2) : "0.00";
            const isGuest = window.currentUser?.isGuest;
            
            // Guest/Secure Info Logic
            const displayName = isGuest ? "REDACTED.c" : (f.displayName || f.name);
            const displayOwner = isGuest ? "---" : f.owner;

            const row = document.createElement('div');
            row.className = `file-row ${f.isRecovered ? 'recovered' : ''}`;
            
            row.innerHTML = `
                <div class="file-info">
                    <div style="font-family:'Fira Code'; font-size:13px; color:var(--text-main); font-weight:600;">
                        ${displayName} ${f.isRecovered ? '<span title="Recovered Asset" style="color:var(--gold)">★</span>' : ''}
                    </div>
                    <div style="font-size:10px; color:var(--text-muted); margin-top:4px;">
                        Owner: ${displayOwner} | ${sizeMB} MB | SECURED
                    </div>
                </div>
                <div class="file-actions" style="display:flex; gap:10px; align-items:center;">
                    ${isGuest ? 
                        '<span class="badge-locked" style="font-size:10px; opacity:0.6;">RESTRICTED</span>' : 
                        `<a href="${f.url}" download class="btn-get" style="color:var(--electric-green); font-size:11px; text-decoration:none; font-weight:800;">DOWNLOAD</a>`
                    }
                    ${f.canManage && !isGuest ? 
                        `<button onclick="deleteFile('${f.name}')" class="btn-del" style="background:transparent; border:1px solid var(--danger-red); color:var(--danger-red); padding:4px 8px; border-radius:4px; cursor:pointer; font-size:10px;">DEL</button>` : 
                        ''
                    }
                </div>`;

            if (!isGuest && f.owner === window.currentUser.username) {
                myContainer.appendChild(row);
            } else {
                othersContainer.appendChild(row);
            }
        });

        // Sync counts for UI
        if (document.getElementById('my-count')) document.getElementById('my-count').innerText = myContainer.children.length;
        if (document.getElementById('others-count')) document.getElementById('others-count').innerText = othersContainer.children.length;
        
    } catch (err) {
        console.error("CLOUD: Failed to sync lists.", err);
    }
}

function logToTerminal(text, color) {
    const output = document.getElementById('term-output') || document.getElementById('terminal-output');
    if (output) {
        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        output.innerHTML += `<div class="log-line" style="color:${color}; margin-bottom:4px; font-family:'Fira Code'; font-size:11px;">[${time}] ${text}</div>`;
        output.scrollTop = output.scrollHeight;
    }
}

// Global Export
window.fetchFiles = fetchFiles;
window.toggleAdminTerminal = toggleAdminTerminal;