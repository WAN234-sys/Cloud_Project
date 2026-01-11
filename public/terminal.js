/** SCE v0.2.11 - TERMINAL & CLOUD **/

window.addEventListener('keydown', (e) => {
    // Admin Override: Shift + Enter
    if (e.shiftKey && e.key === 'Enter' && currentUser?.isAdmin) {
        e.preventDefault();
        const term = document.getElementById('admin-terminal');
        const isHidden = term.style.display === 'none' || term.style.display === '';
        term.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) document.getElementById('term-input').focus();
    }
});

document.getElementById('term-input')?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const input = e.target.value.trim();
        const output = document.getElementById('term-output');
        
        if (input.startsWith('/recover')) {
            const [_, user, file] = input.split(' ');
            output.innerHTML += `<div style="color:var(--gold)">> Initializing protocol for ${user}...</div>`;
            
            const res = await fetch('/api/admin/restore', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username: user, filename: file })
            });
            const data = await res.json();
            output.innerHTML += `<div style="color:var(--electric-green)">> SUCCESS: Asset restored. Key [${data.claimKey}] issued.</div>`;
            fetchFiles();
        }
        e.target.value = '';
        output.scrollTop = output.scrollHeight;
    }
});

async function fetchFiles() {
    const res = await fetch('/api/cloud/files');
    const files = await res.json();
    const my = document.getElementById('my-file-list');
    const others = document.getElementById('others-file-list');
    my.innerHTML = ''; others.innerHTML = '';

    files.forEach(f => {
        const row = document.createElement('div');
        row.className = `file-row ${f.isRecovered ? 'recovered-glow' : ''}`;
        row.innerHTML = `
            <div>
                <div style="font-family:'Fira Code'; font-size:14px;">${f.displayName} ${f.isRecovered ? '⭐' : ''}</div>
                <div style="font-size:10px; color:var(--text-muted);">
                    Owner: ${f.owner} | ${f.isBackedUp ? '<span style="color:var(--electric-green)">SECURED</span>' : 'UNPROTECTED'}
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                <a href="${f.url}" target="_blank" style="color:var(--text-muted); font-size:12px;">VIEW</a>
                ${f.canManage ? `<button onclick="deleteFile('${f.name}')" class="btn-delete" style="background:var(--danger-red); border:none; color:white; padding:3px 7px; border-radius:3px; cursor:pointer;">DEL</button>` : ''}
            </div>`;
        (f.owner === currentUser.username ? my : others).appendChild(row);
    });
}