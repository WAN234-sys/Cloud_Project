/** SCE v1.0.3 - TRANSMISSION ENGINE **/

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('cfile');
const uploadBtn = document.getElementById('uploadBtn');
const progressContainer = document.getElementById('upload-progress-container');
const progressFill = document.getElementById('progress-fill');
const statusText = document.getElementById('upload-status');
const fileLabelText = document.getElementById('file-label-text');

/**
 * 1. DRAG & DROP HANDLERS
 */
['dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
    });
});

dropZone.addEventListener('dragover', () => {
    dropZone.style.borderColor = 'var(--electric-green)';
    dropZone.style.background = 'rgba(0, 255, 65, 0.05)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--gh-border)';
    dropZone.style.background = 'transparent';
});

dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.c')) {
        handleFileSelection(file);
    } else {
        alert("ERROR: INVALID_FORMAT. ONLY .C FILES ACCEPTED.");
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileSelection(e.target.files[0]);
});

function handleFileSelection(file) {
    window.selectedFile = file;
    fileLabelText.innerText = file.name.toUpperCase();
    fileLabelText.style.color = 'var(--electric-green)';
    uploadBtn.style.display = 'inline-block';
}

/**
 * 2. TRANSMISSION EXECUTION (Dual-Sync to Malaysia Vault)
 */
uploadBtn.addEventListener('click', async () => {
    if (!window.selectedFile) return;

    // Reset UI for progress
    uploadBtn.style.display = 'none';
    progressContainer.style.display = 'block';
    updateProgress(10, "INITIALIZING_HANDSHAKE...");

    const formData = new FormData();
    formData.append('file', window.selectedFile);

    try {
        // Step 1: Simulated Handshake with Vault
        setTimeout(() => updateProgress(40, "ESTABLISHING_VAULT_LINK..."), 800);
        
        // Step 2: Actual Upload to Server
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            updateProgress(70, "DUAL_SYNC_IN_PROGRESS...");
            
            setTimeout(() => {
                updateProgress(100, "TRANSMISSION_COMPLETE");
                setTimeout(() => {
                    resetUploadZone();
                    if (window.fetchFiles) window.fetchFiles(); // Refresh Repo List
                }, 1000);
            }, 1200);
        } else {
            throw new Error("VAULT_REJECTION");
        }
    } catch (error) {
        statusText.innerText = "CRITICAL_ERR: SYNC_FAILED";
        statusText.style.color = "var(--danger-red)";
        setTimeout(resetUploadZone, 3000);
    }
});

/**
 * 3. RECONSTITUTION CLAIM (Success Modal Interaction)
 */
async function copyKeyToClipboard() {
    const keyText = document.getElementById('claim-key-display').innerText;
    try {
        await navigator.clipboard.writeText(keyText);
        const tip = document.getElementById('copy-success-tip');
        tip.style.display = 'block';
        setTimeout(() => tip.style.display = 'none', 2000);
    } catch (err) {
        console.error('Failed to copy token');
    }
}

function closeClaimPopup() {
    const modal = document.getElementById('claim-popup');
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
    progressFill.style.width = percent + '%';
    statusText.innerText = message;
}

function resetUploadZone() {
    progressContainer.style.display = 'none';
    progressFill.style.width = '0%';
    fileLabelText.innerText = "SELECT C SOURCE";
    fileLabelText.style.color = "var(--text-main)";
    window.selectedFile = null;
    uploadBtn.style.display = 'inline-block';
}

// Global Export
window.copyKeyToClipboard = copyKeyToClipboard;
window.closeClaimPopup = closeClaimPopup;