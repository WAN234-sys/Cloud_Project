/** SCE v0.3.1 - TERMINAL & CLOUD ENGINE **/

// --- 1. ADMIN OVERRIDE LISTENER ---
window.addEventListener('keydown', (e) => {
    // Open/Close Terminal: Shift + Enter (Only for Admin: WAN234-sys)
    if (e.shiftKey && e.key === 'Enter' && currentUser?.isAdmin) {
        e.preventDefault();
        const term = document.getElementById('admin-terminal');
        const isHidden = term.style.display === 'none' || term.style.display === '';
        term.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            document.getElementById('term-input').focus();
            logToTerminal("System Ready. Waiting for Recovery Command...", "var(--text-muted)");
        }
    }
});

// --- 2. COMMAND INTERPRETER ---
document.getElementById('term-input')?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const input = e.target.value.trim();
        const output = document.getElementById('term-output');
        
        // Command Requirement: /recover [username]_[filename].c
        if (input.startsWith('/recover ')) {
            const rawParam = input.replace('/recover ', '').trim();
            const separator = rawParam.indexOf('_');
            
            if (separator === -1 || !rawParam.endsWith('.c')) {
                logToTerminal(`ERROR: Invalid format. Use /recover [user]_[file].c`, "var(--danger-red)");
            } else {
                const user = rawParam.substring(0, separator);
                const file = rawParam.substring(separator + 1);

                logToTerminal(`> INITIALIZING PROTOCOL: Target [${user}] Asset [${file}]...`, "var(--gold)");
                
                try {
                    const res = await fetch('/api/admin/restore', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ username: user, filename: file })
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        logToTerminal(`> SUCCESS: Asset moved to Primary Bucket.`, "var(--electric-green)");
                        logToTerminal(`> CLAIM KEY ISSUED: [${data.claimKey}]`, "var(--gold)");
                        fetchFiles(); // Refresh Global List
                    } else {
                        logToTerminal(`> FAILED: Admin authorization rejected or file not found.`, "var(--danger-red)");
                    }
                } catch (err) {
                    logToTerminal(`> CRITICAL ERROR: Handshake Timeout.`, "var(--danger-red)");
                }
            }
        } else if (input === 'clear') {
            output.innerHTML = 'SCE ARCHIVE TOOLS [v0.3.1]...';
        } else {
            logToTerminal(`> Unknown Command: ${input}`, "#555");
        }

        e.target.value = '';
        output.scrollTop = output.scrollHeight;
    }
});

function logToTerminal(text, color) {
    const output = document.getElementById('term-output');
    output.innerHTML += `<div style="color:${color}; margin-bottom:4px;">${text}</div>`;
}

// --- 3. CLOUD FILE EXPLORER (v0.3.1) ---
async function fetchFiles() {
    console.log("FETCH: Syncing Shared Code Repositories...");
    try {
        const res = await fetch('/api/cloud/files');
        const files = await res.json();
        
        const my = document.getElementById('my-file-list');
        const others = document.getElementById('others-file-list');
        
        if (!my || !others) return;
        my.innerHTML = ''; 
        others.innerHTML = '';

        files.forEach(f => {
            // Requirement: MB display calculation
            const sizeMB = f.sizeBytes ? (f.sizeBytes / (1024 * 1024)).toFixed(2) : "0.00";
            
            const row = document.createElement('div');
            row.className = `file-row ${f.isRecovered ? 'recovered-glow' : ''}`;
            
            // Build Row HTML based on requirements:
            // 1. Remove VIEW button function
            // 2. Add MB size
            // 3. Block guest permissions
            row.innerHTML = `
                <div class="file-info">
                    <div style="font-family:'Fira Code'; font-size:14px; color:white;">
                        ${f.displayName} ${f.isRecovered ? '⭐' : ''}
                    </div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                        Owner: ${f.owner} | SECURED (${sizeMB} MB)
                    </div>
                </div>
                <div class="file-actions" style="display:flex; gap:10px; align-items:center;">
                    ${currentUser.isGuest ? 
                        '<span style="font-size:9px; color:#444; border:1px solid #222; padding:2px 5px;">LOCKED</span>' : 
                        `<a href="${f.url}" download style="color:var(--electric-green); font-size:11px; text-decoration:none; font-weight:bold;">GET</a>`
                    }
                    ${f.canManage && !currentUser.isGuest ? 
                        `<button onclick="deleteFile('${f.name}')" style="background:transparent; border:1px solid var(--danger-red); color:var(--danger-red); padding:2px 6px; border-radius:3px; cursor:pointer; font-size:10px;">DEL</button>` : 
                        ''
                    }
                </div>`;

            // Append to "Your Shared Code" or "Community Shared Code"
            if (f.owner === currentUser.username && !currentUser.isGuest) {
                my.appendChild(row);
            } else {
                others.appendChild(row);
            }
        });
    } catch (err) {
        console.error("CLOUD: Failed to sync file lists.", err);
    }
}

window.fetchFiles = fetchFiles;