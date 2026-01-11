/** SCE v0.2.11 - MAIN CLIENT ENTRY **/

function setupActionListeners() {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (uploadBtn) {
        uploadBtn.onclick = async () => {
            if (!fileInput.files[0]) return alert("Select a .c file first.");
            
            const fd = new FormData();
            fd.append('cfile', fileInput.files[0]);
            
            uploadBtn.disabled = true;
            uploadBtn.innerText = "TRANSMITTING...";
            
            const res = await fetch('/api/cloud/upload', { method: 'POST', body: fd });
            
            if (res.ok) {
                playSuccessSound();
                uploadBtn.style.background = "#fff";
                setTimeout(() => {
                    uploadBtn.style.background = "var(--electric-green)";
                    uploadBtn.innerText = "TRANSMIT TO CLOUD";
                    uploadBtn.disabled = false;
                    fetchFiles();
                }, 1500);
            } else {
                alert("Upload Failed: Check connection.");
                uploadBtn.innerText = "TRANSMIT TO CLOUD";
                uploadBtn.disabled = false;
            }
        };
    }
}

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

function setupTOSListener() {
    const tos = document.getElementById('tosAgree');
    const gh = document.getElementById('ghBtn');
    if(tos) {
        tos.onchange = (e) => {
            gh.style.opacity = e.target.checked ? "1" : "0.3";
            gh.style.pointerEvents = e.target.checked ? "auto" : "none";
        };
    }
}

async function deleteFile(name) {
    if (confirm("Permanently delete primary asset?")) {
        await fetch(`/api/cloud/files/${name}`, { method: 'DELETE' });
        fetchFiles();
    }
}

function closeClaimPopup() {
    document.getElementById('claim-popup').style.display = 'none';
}

// BOOT SEQUENCE
init();