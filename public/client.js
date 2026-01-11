let currentUser = null;
let shieldClicks = 0;
let shieldTimer;

/**
 * --- IDENTITY HANDSHAKE ---
 * Checks session and initializes UI once server confirms identity.
 */
async function init() {
    console.log("Initiating Identity Handshake...");
    try {
        const res = await fetch('/api/auth/user');
        currentUser = await res.json();
        
        console.log("Handshake Result:", currentUser);

        if (currentUser.authenticated) {
            // 1. Switch UI visibility
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('main-ui').style.display = 'block';
            
            // 2. Render Profile
            renderProfile();

            // 3. Bind Action Listeners
            setupActionListeners();

            // 4. Recovery Shield Glow
            if (currentUser.newRestoreAvailable) {
                document.getElementById('recovery-shield').classList.add('glow');
            }

            fetchFiles();
        } else {
            // Bind the logic that handles the GitHub lock vs Guest unlock
            setupTOSListener();
        }
    } catch (err) {
        console.error("Critical Handshake Error:", err);
    }
}

/**
 * --- TOS TOGGLE LOGIC ---
 * Modified: GitHub requires agreement, Guest is always accessible.
 */
function setupTOSListener() {
    const tosAgree = document.getElementById('tosAgree');
    const ghBtn = document.getElementById('ghBtn');
    
    // Ensure Guest button is always active regardless of agreement
    const guestBtns = document.querySelectorAll('.auth-btn:not(#ghBtn)');
    guestBtns.forEach(btn => {
        btn.classList.remove('disabled');
        btn.style.pointerEvents = "auto";
        btn.style.opacity = "1";
    });

    if (tosAgree && ghBtn) {
        tosAgree.onchange = (e) => {
            const isChecked = e.target.checked;
            
            // Toggle GitHub button only
            ghBtn.style.pointerEvents = isChecked ? "auto" : "none";
            ghBtn.style.opacity = isChecked ? "1" : "0.3";
            
            if (isChecked) {
                ghBtn.classList.remove('disabled');
            } else {
                ghBtn.classList.add('disabled');
            }
        };
    }
}

/**
 * --- UI EFFECTS: RANDOM SEQUENCE GLOW ---
 */
function triggerSequenceGlow() {
    const words = Array.from(document.querySelectorAll('.glow-word'));
    if (words.length === 0) return;

    const shuffledWords = words.sort(() => Math.random() - 0.5);
    const delayBetweenWords = 400; 

    shuffledWords.forEach((word, index) => {
        setTimeout(() => {
            word.classList.add('active');
        }, index * delayBetweenWords);
    });

    const totalDisplayTime = (words.length * delayBetweenWords) + 2000; 
    
    setTimeout(() => {
        words.forEach(word => word.classList.remove('active'));
    }, totalDisplayTime);
}

/**
 * --- BUTTON BINDING LOGIC ---
 */
function setupActionListeners() {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (uploadBtn) {
        uploadBtn.onclick = async () => {
            if (!fileInput.files[0]) {
                alert("Select a .c file first.");
                return;
            }

            uploadBtn.innerText = "TRANSMITTING...";
            uploadBtn.style.opacity = "0.5";
            uploadBtn.disabled = true;

            const fd = new FormData();
            fd.append('cfile', fileInput.files[0]);

            try {
                const res = await fetch('/api/cloud/upload', { method: 'POST', body: fd });
                if (res.ok) {
                    fileInput.value = '';
                    document.getElementById('file-label-text').innerText = "CHOOSE .C PROJECT";
                    fetchFiles();
                } else {
                    const errText = await res.text();
                    alert("Cloud Error: " + errText);
                }
            } catch (err) {
                alert("Connection failed.");
            } finally {
                uploadBtn.innerText = "TRANSMIT TO CLOUD";
                uploadBtn.style.opacity = "1";
                uploadBtn.disabled = false;
            }
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
            <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:20px;">
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
    if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'R' && currentUser?.isAdmin) {
        const term = document.getElementById('admin-terminal');
        term.style.display = term.style.display === 'flex' ? 'none' : 'flex';
        if(term.style.display === 'flex') document.getElementById('term-input').focus();
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

// BOOTSTRAP
init();