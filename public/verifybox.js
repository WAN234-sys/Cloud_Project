/** SCE v0.3.41 [BETA] - UI VERIFICATION & MODAL ENGINE **/

/**
 * 1. MODAL VISIBILITY CONTROL
 * Handles the display of the success popup after a valid handshake.
 */
function showClaimPopup(key) {
    const popup = document.getElementById('claim-popup');
    const keyDisplay = document.getElementById('claim-key-display');
    
    if (popup && keyDisplay) {
        // Inject the verified key into the UI
        keyDisplay.innerText = key;
        
        // Use flex for center alignment (defined in index.html)
        popup.style.display = 'flex';
        
        // Play system success chime if sound engine is active
        if (window.playSuccessSound) playSuccessSound();
        
        console.log(`[UI] Success Modal deployed for key: ${key}`);
    } else {
        console.error("[UI] Critical Error: Claim modal elements missing from DOM.");
    }
}

/**
 * 2. CLIPBOARD PROTOCOL
 * Securely copies the claim key to the user's clipboard.
 */
async function copyKeyToClipboard() {
    const keyDisplay = document.getElementById('claim-key-display');
    if (!keyDisplay) return;

    const keyText = keyDisplay.innerText;
    const feedbackLabel = document.querySelector('.key-container small');

    try {
        await navigator.clipboard.writeText(keyText);
        
        // Visual confirmation feedback
        if (feedbackLabel) {
            const originalText = feedbackLabel.innerText;
            feedbackLabel.innerText = "COPIED TO SYSTEM CLIPBOARD";
            feedbackLabel.style.color = "var(--electric-green)";
            
            // Revert feedback after delay
            setTimeout(() => {
                feedbackLabel.innerText = originalText;
                feedbackLabel.style.color = "var(--gold)";
            }, 2500);
        }
    } catch (err) {
        console.warn("[UI] Clipboard write failed. Fallback to manual selection.");
        alert("Please manually copy the key: " + keyText);
    }
}

/**
 * 3. MODAL DISMISSAL & SYNC
 * Closes the view and refreshes the repository to show the '⭐' Recovered icon.
 */
function closeClaimPopup() {
    const popup = document.getElementById('claim-popup');
    if (popup) {
        popup.style.display = 'none';
    }

    console.log("[UI] Modal dismissed. Initializing repository refresh...");

    // Trigger terminal.js sync if available, else hard reload
    if (typeof window.fetchFiles === 'function') {
        window.fetchFiles();
    } else {
        location.reload();
    }
}

/**
 * 4. EVENT BINDING: ESC KEY
 * Accessibility shortcut to close the modal.
 */
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const popup = document.getElementById('claim-popup');
        if (popup && popup.style.display === 'flex') {
            closeClaimPopup();
        }
    }
});