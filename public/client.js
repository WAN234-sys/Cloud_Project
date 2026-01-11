/** SCE v0.3.41 [BETA] - CORE CLIENT LOGIC **/

// --- 1. BOOT INITIALIZATION ---
async function init() {
    console.log("SCE v0.3.41: Systems Online [BETA]");
    
    // Sync User Identity first
    await syncUserSession(); 
    
    setupTOSListener();
    setupActionListeners();
    setupTitleSecret();
    setupDragAndDrop(); 
    
    // Initial file pull if authenticated
    if (currentUser.authenticated) {
        fetchFiles();
    }
}

// --- 2. IDENTITY HANDSHAKE ---
let currentUser = { authenticated: false, isGuest: true };

async function syncUserSession() {
    try {
        const res = await fetch('/api/auth/user');
        currentUser = await res.json();
        
        if (currentUser.authenticated) {
            document.body.classList.add('user-logged-in');
            // Notify if a restore key is waiting in recoveryData
            if (currentUser.newRestoreAvailable) {
                const dot = document.getElementById('notif-dot');
                if (dot) {
                    dot.style.display = 'block';
                    playNotificationSound();
                }
            }
        }
    } catch (e) {
        console.error("SCE Handshake Failed: Offline Mode active.");
    }
}

// --- 3. UI & TERMS LOGIC (v0.3.41 Checkbox Protocol) ---
function setupTOSListener() {
    const tos = document.getElementById('tosAgree');
    const ghBtn = document.getElementById('ghBtn');
    const guestBtn = document.getElementById('guestBtn');

    if (tos) {
        tos.onchange = (e) => {
            const isChecked = e.target.checked;
            
            // GitHub Access: Enabled only when TOS is checked
            if (ghBtn) {
                ghBtn.classList.toggle('disabled', !isChecked);
                ghBtn.style.pointerEvents = isChecked ? "auto" : "none";
            }

            // Guest Access: Enabled only when TOS is NOT checked
            if (guestBtn) {
                guestBtn.classList.toggle('disabled', isChecked);
                guestBtn.style.pointerEvents = !isChecked ? "auto" : "none";
            }
        };
    }
}

// --- 4. DRAG AND DROP (v0.3.41 .c Validation) ---
function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone) return;

    ['dragover', 'dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.endsWith('.c')) {
            fileInput.files = files;
            document.getElementById('file-label-text').innerText = files[0].name;
            playClickSound();
        } else {
            alert("Protocol Error: Only .c source files accepted.");
        }
    });
}

// --- 5. CLOUD TRANSMISSION ---
function setupActionListeners() {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (uploadBtn) {
        uploadBtn.onclick = async () => {
            if (currentUser.isGuest) return alert("Unauthorized: Guests cannot transmit to Cloud.");
            if (!fileInput.files[0]) return alert("Please select a .c file first.");
            
            const fd = new FormData();
            fd.append('cfile', fileInput.files[0]);
            
            uploadBtn.disabled = true;
            uploadBtn.innerText = "UPLOADING...";
            
            try {
                const res = await fetch('/api/cloud/upload', { method: 'POST', body: fd });
                if (res.ok) {
                    playSuccessSound();
                    uploadBtn.innerText = "TRANSMISSION SUCCESS";
                    setTimeout(() => {
                        uploadBtn.innerText = "INITIALIZE TRANSMISSION";
                        uploadBtn.disabled = false;
                        fetchFiles();
                    }, 1500);
                }
            } catch (e) {
                alert("Cloud Sync Failure.");
                uploadBtn.disabled = false;
            }
        };
    }
}

// --- 6. ASSET RENDERING (KB Logic & Guest Redaction) ---
function renderFileRow(file) {
    // Standardize size to KB
    const sizeKB = file.sizeBytes ? (file.sizeBytes / 1024).toFixed(2) : "0.00";
    
    // Safety Redaction for Guest Sessions
    const displayName = currentUser.isGuest ? "REDACTED_ASSET.c" : file.displayName;
    const displayOwner = currentUser.isGuest ? "HIDDEN_USER" : file.owner;

    const actionHtml = currentUser.isGuest ? 
        `<span class="view-only-tag"><i class="fas fa-eye"></i> READ ONLY</span>` : 
        `<button class="btn-transmit" onclick="window.open('${file.url}')">GET</button>
         ${file.canManage ? `<button class="btn-del" onclick="deleteFile('${file.name}')">DEL</button>` : ''}`;

    return `
        <div class="file-row ${file.isRecovered ? 'recovered-glow' : ''}">
            <div class="file-info">
                <strong style="${currentUser.isGuest ? 'filter: blur(4px);' : ''}">${displayName}</strong>
                <p>Owner: ${displayOwner} | ${sizeKB} KB</p>
            </div>
            <div class="file-actions">
                ${actionHtml}
            </div>
        </div>`;
}

// --- 7. AUDIO ENGINE (Synthesized Feedback) ---
function playSuccessSound() { playSound(440, 880, 'square', 0.1); }
function playClickSound() { playSound(200, 150, 'sine', 0.1); }
function playNotificationSound() { playSound(660, 660, 'triangle', 0.1, 0.4); }

function playSound(startFreq, endFreq, type, vol, duration = 0.2) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
}

// --- 8. SYSTEM SECRETS ---
function setupTitleSecret() {
    let clicks = 0;
    const title = document.getElementById('app-title');
    if (title) {
        title.onclick = () => {
            clicks++;
            if (clicks === 5) {
                alert("SCE Protocol: Access granted to developer WAN234-sys logs.");
                clicks = 0;
            }
        };
    }
}

init();