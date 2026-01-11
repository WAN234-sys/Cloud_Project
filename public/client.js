let currentUser = null;
let shieldClicks = 0;
let shieldTimer;

// --- IDENTITY HANDSHAKE ---
async function init() {
    const res = await fetch('/api/auth/user');
    currentUser = await res.json();
    
    if (currentUser.authenticated) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('main-ui').style.display = 'block';
        
        // Render Profile Area
        document.getElementById('profile-anchor').innerHTML = `
            <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:20px;">
                <img src="${currentUser.avatar}" style="width:32px; border-radius:6px; border:1px solid var(--gh-border);">
                <div>
                    <div style="font-weight:bold; color:${currentUser.isAdmin ? 'var(--gold)' : 'white'}">
                        ${currentUser.username} 
                        ${currentUser.isAdmin ? '<span style="font-size:9px; background:var(--gold); color:black; padding:2px 4px; border-radius:3px; margin-left:5px;">ADMIN</span>' : ''}
                    </div>
                    <a href="/api/auth/logout" style="font-size:10px; color:var(--text-muted); text-decoration:none;">LOGOUT</a>
                </div>
            </div>`;
        
        if (currentUser.newRestoreAvailable) {
            document.getElementById('recovery-shield').classList.add('glow');
        }
        fetchFiles();
    }
}

// --- CLOUD FILE FETCHING ---
async function fetchFiles() {
    const res = await fetch('/api/cloud/files');
    const files = await res.json();
    const my = document.getElementById('my-file-list');
    const others = document.getElementById('others-file-list');
    my.innerHTML = ''; others.innerHTML = '';

    files.forEach(file => {
        const isMine = file.name.includes(`_${currentUser.username}_`);
        const row = document.createElement('div');
        row.className = 'file-row';
        row.innerHTML = `
            <div>
                <div style="font-family:'Fira Code'; font-size:14px;">${file.displayName}</div>
                <div style="font-size:10px; color:${file.isBackedUp ? 'var(--electric-green)' : '#444'}">
                    ${file.isBackedUp ? '[PROTECTED BY WARRANTY]' : '[UNPROTECTED]'}
                </div>
            </div>
            <div style="display:flex; gap:15px; align-items:center;">
                <a href="${file.url}" target="_blank" style="color:var(--text-muted); text-decoration:none; font-size:12px;">View</a>
                ${file.canManage ? `<button onclick="deleteFile('${file.name}')" style="background:var(--danger-red); border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:11px;">Delete</button>` : ''}
            </div>`;
        if(isMine) my.appendChild(row); else others.appendChild(row);
    });
}

// --- UPLOAD LOGIC ---
document.getElementById('uploadBtn').addEventListener('click', async () => {
    const fi = document.getElementById('fileInput');
    if (!fi.files[0]) return;

    const fd = new FormData();
    fd.append('cfile', fi.files[0]);

    const res = await fetch('/api/cloud/upload', { method: 'POST', body: fd });
    if (res.status === 409) {
        alert(await res.text());
    } else {
        fi.value = '';
        fetchFiles();
    }
});

// --- DELETE LOGIC ---
async function deleteFile(name) {
    if (confirm("Permanently delete from primary? (Backup copy remains safe)")) {
        await fetch(`/api/cloud/files/${name}`, { method: 'DELETE' });
        fetchFiles();
    }
}

// --- RECOVERY PANEL (TRIPLE CLICK) ---
function handleShieldClick() {
    if (currentUser?.isAdmin) return; // Admins use terminal instead
    shieldClicks++;
    clearTimeout(shieldTimer);
    shieldTimer = setTimeout(() => shieldClicks = 0, 800);
    if (shieldClicks === 3) {
        document.getElementById('recovery-panel').classList.toggle('open');
        document.getElementById('recovery-shield').classList.remove('glow');
        shieldClicks = 0;
    }
}

async function submitRecovery() {
    const f = document.getElementById('req_file').value;
    if(!f) return alert("Enter filename");
    await fetch('/api/admin/mail/send', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: currentUser.username, filename: f })
    });
    alert("Recovery ticket sent to Admin logs.");
    document.getElementById('recovery-panel').classList.remove('open');
}

// --- ADMIN TERMINAL LOGIC ---
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'R' && currentUser?.isAdmin) {
        const term = document.getElementById('admin-terminal');
        term.style.display = term.style.display === 'flex' ? 'none' : 'flex';
        if(term.style.display === 'flex') document.getElementById('term-input').focus();
    }
});

document.getElementById('term-input').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const cmd = e.target.value.trim();
        const out = document.getElementById('term-output');
        if (cmd.startsWith('/Recovery')) {
            const parts = cmd.split(' ');
            const res = await fetch('/api/admin/restore', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username: parts[1], filename: parts[2] })
            });
            out.innerHTML += `<div>> ${await res.text()}</div>`;
            fetchFiles();
        }
        e.target.value = '';
    }
});

// --- TOS TOGGLE ---
document.getElementById('tosAgree').addEventListener('change', (e) => {
    document.querySelectorAll('.auth-btn').forEach(btn => {
        btn.classList.toggle('disabled', !e.target.checked);
    });
});

// RUN INIT ON LOAD
init();