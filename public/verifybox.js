/** SCE v1.0.4 [STABLE] - UI VERIFICATION & MODAL ENGINE **/

/**
 * 1. MODAL VISIBILITY CONTROL
 * FIXED: Function renamed to match verify.js (Phase 4)
 */
function prepareClaimModal(key, filename = "ASSET.c") {
    const popup = document.getElementById('claim-popup');
    const keyDisplay = document.getElementById('claim-key-display');
    const fileTarget = document.getElementById('claim-filename-display'); // Optional target for UX
    
    if (popup && keyDisplay) {
        keyDisplay.innerText = key;
        if (fileTarget) fileTarget.innerText = filename;
        
        popup.style.display = 'flex';
        
        // FIXED: Aligned with NoA v1.0.4 Standard
        if (window.NoA && typeof window.NoA.log === 'function') {
            window.NoA.log(`UI_ALERT: Reconstitution Modal deployed for ${filename}`, "SYS");
        }
        
        console.log(`[UI] Modal active. Asset key: ${key}`);
    } else {
        console.error("[UI] Error: Modal elements (claim-popup/key-display) not found in DOM.");
    }
}

/**
 * 2. CLIPBOARD PROTOCOL
 */
async function copyKeyToClipboard() {
    const keyDisplay = document.getElementById('claim-key-display');
    const label = document.querySelector('.key-container small');
    const successTip = document.getElementById('copy-success-tip');
    
    if (!keyDisplay) return;
    const keyText = keyDisplay.innerText;

    try {
        await navigator.clipboard.writeText(keyText);
        
        if (label) {
            const originalText = label.innerText;
            label.innerText = "SYSTEM_CLIPBOARD_LINKED";
            label.style.color = "#00ff41"; // Hex fallback for --electric-green
            
            if (successTip) successTip.style.display = 'block';

            setTimeout(() => {
                label.innerText = originalText;
                label.style.color = "#ffd700"; // Hex fallback for --gold
                if (successTip) successTip.style.display = 'none';
            }, 3000);
        }
    } catch (err) {
        if (window.NoA) window.NoA.log("ERR: Clipboard permission denied by OS.", "ERR");
    }
}

/**
 * 3. MODAL DISMISSAL
 */
function closeClaimPopup() {
    const popup = document.getElementById('claim-popup');
    if (popup) popup.style.display = 'none';

    // FIXED: Integrated with SCE Repository refresh
    if (window.Repo && typeof window.Repo.refreshVault === 'function') {
        window.Repo.refreshVault();
    } else if (typeof window.fetchFiles === 'function') {
        window.fetchFiles();
    }
}

/**
 * 4. SYSTEM ACCESSIBILITY
 */
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const popup = document.getElementById('claim-popup');
        if (popup && popup.style.display === 'flex') {
            closeClaimPopup();
        }
    }
});

// Global Exports
window.prepareClaimModal = prepareClaimModal;
window.copyKeyToClipboard = copyKeyToClipboard;
window.closeClaimPopup = closeClaimPopup;