/** SCE v0.3.41 [BETA] - TERMINAL & CLOUD ENGINE **/

// --- 1. ADMIN OVERRIDE LISTENER ---
// Sequence: Shift + Enter toggles the Command Line Interface (CLI)
window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'Enter' && window.currentUser?.isAdmin) {
        e.preventDefault();
        const term = document.getElementById('admin-terminal');
        if (!term) return;

        const isHidden = term.style.display === 'none' || term.style.display === '';
        term.style.display = isHidden ? 'flex' : 'none';
        
        if (isHidden) {
            const input = document.getElementById('term-input');
            if (input) input.focus();
            logToTerminal("SCE COMMAND INTERFACE v0.3.41 [BETA]...", "var(--text-muted)");
            logToTerminal("System Ready. Use /recover [user]_[file].c to issue claim keys.", "var(--text-muted)");
        }
    }
});

// --- 2. COMMAND INTERPRETER ---
document.getElementById('term-input')?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const input = e.target.value.trim();
        const output = document.getElementById('term-output');
        
        // Command Protocol: /recover [username]_[filename].c
        if (input.startsWith('/recover ')) {
            const rawParam = input.replace('/recover ', '').trim();
            const separator = rawParam.indexOf('_');
            
            if (separator === -1 || !rawParam.endsWith('.c')) {
                logToTerminal(`ERROR: Syntax invalid. Protocol: /recover [user]_[file].c`, "var(--danger-red)");
            } else {
                const user = rawParam.substring(0, separator);
                const file = rawParam.substring(separator + 1);

                logToTerminal(`> INITIATING VAULT EXTRACTION: [${user}] -> [${file}]`, "var(--gold)");
                
                try {
                    const res = await fetch('/api/admin/restore', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ username: user, filename: file })
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        logToTerminal(`> SUCCESS: Asset relocated to Primary Cloud.`, "var(--electric-green)");
                        logToTerminal(`> CLAIM KEY GENERATED: [${data.claimKey}]`, "var(--gold)");
                        // Update UI globally
                        if (window.fetchFiles) fetchFiles(); 
                    } else {
                        logToTerminal(`> FAILED: Recovery rejected by server.`, "var(--danger-red)");
                    }
                } catch (err) {
                    logToTerminal(`> CRITICAL: Handshake Timeout. Check connection.`, "var(--danger-red)");
                }
            }
        } else if (input === 'clear') {
            if (output) output.innerHTML = 'SCE ARCHIVE TOOLS [v0.3.41]...';
        } else if (input === 'help') {
            logToTerminal("COMMANDS: /recover, /clear, /exit", "var(--gold)");
        } else {
            logToTerminal(`> ERR: Unknown Command [${input}]`, "#555");
        }

        e.target.value = '';
        if (output) output.scrollTop = output.scrollHeight;
    }
});

function logToTerminal(text, color) {
    const output = document.getElementById('term-output');
    if (output) {
        output.innerHTML += `<div style="color:${color}; margin-bottom:4px; font-family:'Fira Code'; font-size:11px;">${text}</div>`;
    }
}

// --- 3. CLOUD FILE EXPLORER (v0.3.41) ---
// Features: Redaction for Guests, Recovery Glow, and MB size conversion.
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
            // Size Calculation: Bytes -> MB
            const sizeMB = f.sizeBytes ? (f.sizeBytes / (1024 * 1024)).toFixed(2) : "0.00";
            
            // Guest Logic via guest.js helper
            const secureInfo = (typeof getSecureDisplayInfo === 'function') 
                ? getSecureDisplayInfo(f) 
                : { name: f.displayName, owner: f.owner, isLocked: false, style: "" };

            const row = document.createElement('div');
            // Apply Golden Glow if file was recently restored via claim key
            row.className = `file-row ${f.isRecovered ? 'recovered' : ''}`;
            row.style = secureInfo.style;
            
            row.innerHTML = `
                <div class="file-info">
                    <div style="font-family:'Fira Code'; font-size:14px; color:var(--text-main); font-weight:600;">
                        ${secureInfo.name} ${f.isRecovered ? '<span title="Recovered Asset">⭐</span>' : ''}
                    </div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                        Owner: ${secureInfo.owner} | ${sizeMB} MB | SECURED
                    </div>
                </div>
                <div class="file-actions" style="display:flex; gap:10px; align-items:center;">
                    ${window.currentUser.isGuest ? 
                        '<span class="badge-locked">RESTRICTED</span>' : 
                        `<a href="${f.url}" download class="btn-get" style="color:var(--electric-green); font-size:11px; text-decoration:none; font-weight:800;">DOWNLOAD</a>`
                    }
                    ${f.canManage && !window.currentUser.isGuest ? 
                        `<button onclick="deleteFile('${f.name}')" class="btn-del" style="background:transparent; border:1px solid var(--danger-red); color:var(--danger-red); padding:4px 8px; border-radius:4px; cursor:pointer; font-size:10px;">DEL</button>` : 
                        ''
                    }
                </div>`;

            // Logic: Your assets vs. Community assets
            if (f.owner === window.currentUser.username && !window.currentUser.isGuest) {
                myContainer.appendChild(row);
            } else {
                othersContainer.appendChild(row);
            }
        });
        
        // Final UI cleanup for Guests
        if (window.currentUser.isGuest && typeof renderGuestRestrictedUI === 'function') {
            renderGuestRestrictedUI();
        }
        
    } catch (err) {
        console.error("CLOUD: Failed to sync lists.", err);
    }
}

// Global Export
window.fetchFiles = fetchFiles;