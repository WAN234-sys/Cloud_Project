/** SCE v1.0.1 [BETA] - UI VERIFICATION & MODAL ENGINE **/

/**
 * 1. MODAL VISIBILITY CONTROL
 * Triggers the success popup. Injected by verify.js upon valid handshake.
 */
function showClaimPopup(key) {
    const popup = document.getElementById('claim-popup');
    const keyDisplay = document.getElementById('claim-key-display');
    
    if (popup && keyDisplay) {
        // Inject verified key into the modal
        keyDisplay.innerText = key;
        
        // Deployment: Uses Flex for center-screen focus
        popup.style.display = 'flex';
        
        // Log to NoA Interface for narrative continuity
        if (window.logToNoA) {
            window.logToNoA("UI_ALERT: Success Modal deployed.", "SYS");
        }
        
        // Sound Engine Hook (Optional SCE Sound Kit)
        if (window.playSuccessSound) window.playSuccessSound();
        
        console.log(`[UI] Reconstitution successful. Modal active for: ${key}`);
    } else {
        console.error("[UI] Critical Error: Success modal elements missing from DOM.");
    }
}

/**
 * 2. CLIPBOARD PROTOCOL
 * Handles high-entropy key copying with visual feedback.
 */
async function copyKeyToClipboard() {
    const keyDisplay = document.getElementById('claim-key-display');
    const feedbackLabel = document.querySelector('.key-container small');
    
    if (!keyDisplay) return;

    const keyText = keyDisplay.innerText;

    try {
        await navigator.clipboard.writeText(keyText);
        
        // Visual confirmation transition
        if (feedbackLabel) {
            const originalText = feedbackLabel.innerText;
            feedbackLabel.innerText = "COPIED TO SYSTEM CLIPBOARD";
            feedbackLabel.style.color = "var(--electric-green)";
            feedbackLabel.style.fontWeight = "bold";
            
            // Revert state after delay
            setTimeout(() => {
                feedbackLabel.innerText = originalText;
                feedbackLabel.style.color = "var(--gold)";
                feedbackLabel.style.fontWeight = "normal";
            }, 2500);
        }
    } catch (err) {
        console.warn("[UI] Clipboard access denied. Manual selection required.");
        // NoA fallback log
        if (window.logToNoA) window.logToNoA("WARN: Clipboard link blocked by browser.", "ERR");
    }
}

/**
 * 3. MODAL DISMISSAL & RECOGNITION
 * Closes the view and ensures the 'Recovered' status is visible in the list.
 */
function closeClaimPopup() {
    const popup = document.getElementById('claim-popup');
    if (popup) {
        popup.style.display = 'none';
    }

    console.log("[UI] Modal dismissed. Syncing file archive...");

    // Refresh the repository to show the '⭐' Recovered icon
    if (typeof window.fetchFiles === 'function') {
        window.fetchFiles();
    } else {
        // Fallback for fragmented loads
        window.location.reload();
    }
}

/**
 * 4. SYSTEM ACCESSIBILITY
 * Shortcut: [ESC] key terminates the modal view.
 */
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const popup = document.getElementById('claim-popup');
        if (popup && popup.style.display === 'flex') {
            closeClaimPopup();
        }
    }
});

// Global export for verify.js and minibox.html
window.showClaimPopup = showClaimPopup;
window.copyKeyToClipboard = copyKeyToClipboard;
window.closeClaimPopup = closeClaimPopup;