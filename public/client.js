/** SCE v0.3.1 - STABLE CLIENT ENTRY **/

// --- 1. BOOT INITIALIZATION ---
async function init() {
    console.log("SCE v0.3.1: Systems Online");
    setupTOSListener();
    setupActionListeners();
    setupTitleSecret();
}

// --- 2. UI & TERMS LOGIC ---
function setupTOSListener() {
    const tos = document.getElementById('tosAgree');
    const ghBtn = document.getElementById('ghBtn');
    const guestBtn = document.getElementById('guestBtn');

    if (tos) {
        tos.onchange = (e) => {
            const isChecked = e.target.checked;
            // Enable/Disable buttons based on TOC
            [ghBtn, guestBtn].forEach(btn => {
                if (btn) {
                    btn.style.opacity = isChecked ? "1" : "0.3";
                    btn.style.pointerEvents = isChecked ? "auto" : "none";
                    btn.classList.toggle('disabled', !isChecked);
                }
            });
        };
    }
}

// --- 3. DEVELOPER SECRET (5-Click Protocol) ---
function setupTitleSecret() {
    let titleClicks = 0;
    const title = document.getElementById('app-title');
    if (title) {
        title.onclick = () => {
            titleClicks++;
            if (titleClicks === 5) {
                alert("Developer: WAN234-sys");
                titleClicks = 0;
            }
        };
    }
}

// --- 4. CLOUD TRANSMISSION ---
function setupActionListeners() {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (uploadBtn) {
        uploadBtn.onclick = async () => {
            // Guest Restriction
            if (currentUser.isGuest) {
                return alert("Access Denied: Guest accounts cannot transmit assets.");
            }

            if (!fileInput.files[0]) return alert("Select a .c file first.");
            
            const fd = new FormData();
            fd.append('cfile', fileInput.files[0]);
            
            uploadBtn.disabled = true;
            uploadBtn.innerText = "TRANSMITTING...";
            
            try {
                const res = await fetch('/api/cloud/upload', { method: 'POST', body: fd });
                if (res.ok) {
                    playSuccessSound();
                    uploadBtn.style.background = "#fff";
                    setTimeout(() => {
                        uploadBtn.style.background = "var(--electric-green)";
                        uploadBtn.innerText = "TRANSMIT TO CLOUD";
                        uploadBtn.disabled = false;
                        // Refresh lists from minibox.js/core.js logic
                        if (window.fetchFiles) fetchFiles();
                    }, 1500);
                } else {
                    const errText = await res.text();
                    alert(`Upload Failed: ${errText}`);
                    uploadBtn.innerText = "TRANSMIT TO CLOUD";
                    uploadBtn.disabled = false;
                }
            } catch (e) {
                alert("Transmission Error: Check server status.");
                uploadBtn.disabled = false;
            }
        };
    }
}

// --- 5. ASSET MANAGEMENT ---
async function deleteFile(name) {
    if (currentUser.isGuest) return; // Locked for guests
    
    if (confirm("Permanently delete primary asset? (Warranty Backup will remain available for Admin)")) {
        const res = await fetch(`/api/cloud/files/${name}`, { method: 'DELETE' });
        if (res.ok && window.fetchFiles) fetchFiles();
    }
}

// --- 6. FILE ROW GENERATOR (v0.3.1) ---
// Note: This matches the requirement to show Owner | SECURED (MB)
function renderFileRow(file) {
    // Convert bytes to MB for display
    const sizeMB = file.size ? (file.size / (1024 * 1024)).toFixed(2) : "0.00";
    
    // Guest Restriction: No 'GET' (Download) or 'VIEW' buttons
    const actions = currentUser.isGuest ? 
        `<span class="view-only-tag">VIEW ONLY</span>` : 
        `<button class="btn-get" onclick="window.open('${file.url}')">GET</button>
         ${file.canManage ? `<button class="btn-del" onclick="deleteFile('${file.name}')">DEL</button>` : ''}`;

    return `
        <div class="file-row ${file.isRecovered ? 'recovered-glow' : ''}">
            <div class="file-info">
                <strong>${file.displayName}</strong>
                <p>Owner: ${file.owner} | SECURED (${sizeMB} MB)</p>
            </div>
            <div class="file-actions">
                ${actions}
            </div>
        </div>`;
}

// --- 7. AUDIO FEEDBACK ---
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

// --- 8. UI OVERLAYS ---
function closeClaimPopup() {
    const popup = document.getElementById('claim-popup');
    if (popup) popup.style.display = 'none';
}

// Execute on load
init();