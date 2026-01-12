/** SCE v1.0.1 [BETA] - UI VERIFICATION & MODAL ENGINE **/

/**
 * 1. MODAL VISIBILITY CONTROL
 * Triggers the high-fidelity success popup. 
 * Injected by verify.js upon a valid server-side handshake.
 */
function showClaimPopup(key) {
    const popup = document.getElementById('claim-popup');
    const keyDisplay = document.getElementById('claim-key-display');
    
    if (popup && keyDisplay) {
        // Inject verified key into the modal
        keyDisplay.innerText = key;
        
        // Deployment: Uses Flex for center-screen focus and activation of blur
        popup.style.display = 'flex';
        
        // Log to NoA Interface for narrative continuity
        if (window.logToNoA) {
            window.logToNoA("UI_ALERT: Success Modal deployed. Asset freed.", "SYS");
        }
        
        // Visual trigger for CSS animations (pulseGold)
        console.log(`[UI] Reconstitution sequence complete. Target: ${key}`);
    } else {
        console.error("[UI] Critical Error: Success modal elements missing from DOM.");
    }
}

/**
 * 2. CLIPBOARD PROTOCOL
 * Handles secure key copying with reactive visual feedback in the modal.
 */
async function copyKeyToClipboard() {
    const keyDisplay = document.getElementById('claim-key-display');
    const label = document.querySelector('.key-container small');
    const successTip = document.getElementById('copy-success-tip');
    
    if (!keyDisplay) return;

    const keyText = keyDisplay.innerText;

    try {
        await navigator.clipboard.writeText(keyText);
        
        // Transition: Indicate success inside the UI
        if (label) {
            const originalText = label.innerText;
            label.innerText = "SYSTEM_CLIPBOARD_LINKED";
            label.style.color = "var(--electric-green)";
            
            if (successTip) successTip.style.display = 'block';

            // Revert state after delay
            setTimeout(() => {
                label.innerText = originalText;
                label.style.color = "var(--gold)";
                if (successTip) successTip.style.display = 'none';
            }, 3000);
        }
    } catch (err) {
        console.warn("[UI] Clipboard link severed by browser policy.");
        if (window.logToNoA) window.logToNoA("WARN: Clipboard permission denied.", "ERR");
    }
}

/**
 * 3. MODAL DISMISSAL & RECOGNITION
 * Closes the view and ensures the 'Recovered' status is visible in the file list.
 */
function closeClaimPopup() {
    const popup = document.getElementById('claim-popup');
    if (popup) {
        popup.style.display = 'none';
    }

    console.log("[UI] Modal dismissed. Executing archive re-sync...");

    // Refresh the repository list to display the ★ Gold Star status
    if (typeof window.fetchFiles === 'function') {
        window.fetchFiles();
    } else {
        // Fallback to full reload if cloud logic is detached
        window.location.reload();
    }
}

/**
 * 4. SYSTEM ACCESSIBILITY
 * Global listener for [ESC] to terminate the modal overlay.
 */
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const popup = document.getElementById('claim-popup');
        if (popup && popup.style.display === 'flex') {
            closeClaimPopup();
        }
    }
});

// Explicit Global Export
window.showClaimPopup = showClaimPopup;
window.copyKeyToClipboard = copyKeyToClipboard;
window.closeClaimPopup = closeClaimPopup;