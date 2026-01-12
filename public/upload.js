/** SCE v1.0.4 - TRANSMISSION ENGINE [STABLE] **/

// Fixed IDs to match your latest HTML
const dropZone = document.getElementById('upload-zone'); 
const fileInput = document.getElementById('cfile');
const uploadBtn = document.getElementById('uploadBtn') || document.createElement('button'); // Safety fallback
const progressContainer = document.getElementById('upload-progress-container');
const progressFill = document.getElementById('progress-fill');
const statusText = document.getElementById('upload-status');
const fileLabelText = document.getElementById('file-label-text');

/**
 * 1. DRAG & DROP HANDLERS
 */
if (dropZone) {
    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    dropZone.addEventListener('dragover', () => {
        dropZone.style.borderColor = '#00ff41'; // Use literal if CSS var fails
        dropZone.style.background = 'rgba(0, 255, 65, 0.05)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#30363d';
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file && file.name.toLowerCase().endsWith('.c')) {
            handleFileSelection(file);
        } else {
            if(window.NoA) NoA.log("REJECTION: Archive only accepts .C source files.", "WARN");
            alert("ERROR: INVALID_FORMAT.");
        }
    });
}

fileInput?.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileSelection(e.target.files[0]);
});

function handleFileSelection(file) {
    window.selectedFile = file;
    fileLabelText.innerText = file.name.toUpperCase();
    fileLabelText.style.color = '#00ff41';
    
    // Only show button once file is valid
    if (uploadBtn) uploadBtn.style.display = 'inline-block';
}

/**
 * 2. TRANSMISSION EXECUTION (Dual-Sync to Malaysia Vault)
 */

async function startTransmission() {
    if (!window.selectedFile) return;

    // Reset UI
    if (uploadBtn) uploadBtn.style.display = 'none';
    progressContainer.style.display = 'block';
    
    updateProgress(10, "INITIALIZING_HANDSHAKE...");

    const formData = new FormData();
    formData.append('file', window.selectedFile);

    try {
        // Step 1: Simulated Handshake 
        await new Promise(r => setTimeout(r, 600));
        updateProgress(30, "ESTABLISHING_VAULT_LINK...");

        // Step 2: ACTUAL UPLOAD (Fixed Endpoint)
        const response = await fetch('/api/vault/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            updateProgress(70, "DUAL_SYNC_IN_PROGRESS...");
            await new Promise(r => setTimeout(r, 800));
            
            updateProgress(100, "TRANSMISSION_COMPLETE");
            
            if (window.NoA) NoA.log(`Asset ${window.selectedFile.name} secured in Vault.`, "SYS");

            setTimeout(() => {
                resetUploadZone();
                // Refresh both local Repo and the Admin list if active
                if (window.Repo) Repo.refreshVault(); 
            }, 1000);
        } else {
            throw new Error("VAULT_REJECTION");
        }
    } catch (error) {
        console.error(error);
        statusText.innerText = "CRITICAL_ERR: SYNC_FAILED";
        statusText.style.color = "#ff4d4d";
        setTimeout(resetUploadZone, 3000);
    }
}

// Attach listener if button exists
uploadBtn?.addEventListener('click', startTransmission);

/**
 * 3. RECONSTITUTION CLAIM
 */
async function copyKeyToClipboard() {
    const display = document.getElementById('claim-key-display');
    if (!display) return;
    
    const keyText = display.innerText;
    try {
        await navigator.clipboard.writeText(keyText);
        const tip = document.getElementById('copy-success-tip');
        if (tip) {
            tip.style.display = 'block';
            setTimeout(() => tip.style.display = 'none', 2000);
        }
    } catch (err) {
        console.error('Failed to copy token');
    }
}

function closeClaimPopup() {
    const modal = document.getElementById('claim-popup');
    if (!modal) return;
    
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '1';
    }, 300);
}

/**
 * 4. UTILITIES
 */
function updateProgress(percent, message) {
    if (progressFill) progressFill.style.width = percent + '%';
    if (statusText) statusText.innerText = message;
}

function resetUploadZone() {
    progressContainer.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
    fileLabelText.innerText = "SELECT C SOURCE";
    fileLabelText.style.color = ""; // Revert to CSS default
    window.selectedFile = null;
    if (uploadBtn) uploadBtn.style.display = 'none'; // Keep hidden until next selection
}

// Global Exports
window.copyKeyToClipboard = copyKeyToClipboard;
window.closeClaimPopup = closeClaimPopup;
window.handleFileSelection = handleFileSelection;