let currentUser = null;
let shieldClicks = 0;
let shieldTimer;

/**
 * --- IDENTITY HANDSHAKE ---
 */
async function init() {
    console.log("Initiating Identity Handshake...");
    try {
        const res = await fetch('/api/auth/user');
        currentUser = await res.json();
        
        if (currentUser.authenticated) {
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('main-ui').style.display = 'block';
            
            const recoveryPanel = document.getElementById('recovery-panel');
            if (recoveryPanel) recoveryPanel.style.display = 'block';

            renderProfile();
            setupActionListeners();

            if (currentUser.newRestoreAvailable) {
                document.getElementById('recovery-shield').classList.add('glow');
            }

            fetchFiles();
        } else {
            setupTOSListener();
        }
    } catch (err) {
        console.error("Critical Handshake Error:", err);
    }
}

/**
 * --- FUNNY AUDIO FEEDBACK ---
 * Synthesizes a 1.5s "Digital Whoop" using a square wave.
 */
function playSuccessSound() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.type = 'square'; 
    osc.frequency.setValueAtTime(100, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 1.2);
    
    gain.gain.setValueAtTime(0.05, context.currentTime); 
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.start();
    osc.stop(context.currentTime + 1.5);
}

/**
 * --- TOS TOGGLE LOGIC ---
 */
function setupTOSListener() {
    const tosAgree = document.getElementById('tosAgree');
    const ghBtn = document.getElementById('ghBtn');
    const guestBtn = document.getElementById('guestBtn');

    if (tosAgree) {
        tosAgree.onchange = (e) => {
            const isChecked = e.target.checked;
            if (ghBtn) {
                ghBtn.style.pointerEvents = isChecked ? "auto" : "none";
                ghBtn.style.opacity = isChecked ? "1" : "0.3";
                isChecked ? ghBtn.classList.remove('disabled') : ghBtn.classList.add('disabled');
            }
            if (guestBtn) {
                guestBtn.style.pointerEvents = isChecked ? "none" : "auto";
                guestBtn.style.opacity = isChecked ? "0.3" : "1";
                isChecked ? guestBtn.classList.add('disabled') : guestBtn.classList.remove('disabled');
            }
        };
    }
}

/**
 * --- UPLOAD LOGIC WITH PROGRESS, SPEED & FLASH ---
 */
function setupActionListeners() {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (uploadBtn) {
        uploadBtn.onclick = () => {
            if (!fileInput.files[0]) return alert("Select a .c file first.");

            const file = fileInput.files[0];
            const fd = new FormData();
            fd.append('cfile', file);

            uploadBtn.disabled = true;
            uploadBtn.style.opacity = "0.5";
            
            const xhr = new XMLHttpRequest();
            const startTime = Date.now();

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = (event.loaded / (1024 * 1024) / elapsed).toFixed(2);
                    uploadBtn.innerText = `TRANSMITTING: ${percent}% (${speed} MB/s)`;
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    // Visual Flash Handshake
                    uploadBtn.style.background = "#fff";
                    uploadBtn.style.boxShadow = "0 0 30px #fff";
                    playSuccessSound();

                    setTimeout(() => {
                        uploadBtn.style.background = "var(--electric-green)";
                        uploadBtn.style.boxShadow = "none";
                        uploadBtn.innerText = "TRANSMIT TO CLOUD";
                        fileInput.value = '';
                        document.getElementById('file-label-text').innerText = "CHOOSE .C PROJECT";
                        fetchFiles();
                    }, 1500); // Sync with 1.5s sound
                } else {
                    alert("Cloud Error: " + xhr.responseText);
                    uploadBtn.innerText = "TRANSMIT TO CLOUD";
                }
                uploadBtn.disabled = false;
                uploadBtn.style.opacity = "1";
            };

            xhr.open('POST', '/api/cloud/upload', true);
            xhr.send(fd);
        };
    }
}

/**
 * --- PROFILE RENDER ---
 */
function renderProfile() {
    const profileAnchor = document.getElementById('profile-anchor');
    if (profileAnchor) {
        profileAnchor.style.display = 'block';
        profileAnchor.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
                <div class="user-icon" style="color:var(--electric-green); border:1px solid #333; padding:6px 10px; border-radius:4px; background:#0d1117;">
                    <i class="fas fa-code"></i>
                </div>
                <div>
                    <div style="font-weight:bold; color:${currentUser.isAdmin ? 'var(--gold)' : 'white'}">
                        ${currentUser.username} 
                        ${currentUser.isAdmin ? '<span style="font-size:9px; background:var(--gold); color:black; padding:2px 4px; border-radius:3px; margin-left:5px;">ADMIN</span>' : ''}
                    </div>
                    <a href="/api/auth/logout" style="font-size:10px; color:var(--text-muted); text-decoration:none;">LOGOUT</a>
                </div>
            </div>`;
    }
}

/**
 * --- CLOUD FILE FETCHING ---
 */
async function fetchFiles() {
    try {
        const res = await fetch('/api/cloud/files');
        const files = await res.json();
        const my = document.getElementById('my-file-list');
        const others = document.getElementById('others-file-list');
        
        my.innerHTML = ''; 
        others.innerHTML = '';

        files.forEach(file => {
            const isMine = file.name.includes(`_${currentUser.username}_`);
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            
            const row = document.createElement('div');
            row.className = 'file-row';
            row.innerHTML = `
                <div>
                    <div style="font-family:'Fira Code'; font-size:14px;">${file.displayName}</div>
                    <div style="font-size:10px; color:var(--text-muted);">
                        ${sizeMB} MB | ${file.isBackedUp ? '<span style="color:var(--electric-green)">[PROTECTED BY WARRANTY]</span>' : '[UNPROTECTED]'}
                    </div>
                </div>
                <div style="display:flex; gap:15px; align-items:center;">
                    <a href="${file.url}" target="_blank" style="color:var(--text-muted); text-decoration:none; font-size:12px;">View</a>
                    ${file.canManage ? `<button onclick="deleteFile('${file.name}')" style="background:var(--danger-red); border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:11px;">Delete</button>` : ''}
                </div>`;
            
            if(isMine) my.appendChild(row); 
            else others.appendChild(row);
        });
    } catch (err) {
        console.error("Cloud fetch failed:", err);
    }
}

async function deleteFile(name) {
    if (confirm("Permanently delete from primary? (Backup copy remains safe)")) {
        await fetch(`/api/cloud/files/${name}`, { method: 'DELETE' });
        fetchFiles();
    }
}

/**
 * --- RECOVERY SYSTEM ---
 */
function handleShieldClick() {
    if (currentUser?.isAdmin) return;
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

/**
 * --- ADMIN TERMINAL ---
 */
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.altKey && e.code === 'KeyR' && currentUser?.isAdmin) {
        const term = document.getElementById('admin-terminal');
        const isHidden = term.style.display === 'none' || term.style.display === '';
        term.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) document.getElementById('term-input').focus();
    }
});

const termInput = document.getElementById('term-input');
if (termInput) {
    termInput.addEventListener('keypress', async (e) => {
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
                const resultText = await res.text();
                out.innerHTML += `<div style="color:var(--gold)">> ${resultText}</div>`;
                fetchFiles();
            }
            e.target.value = '';
            out.scrollTop = out.scrollHeight;
        }
    });
}

init();