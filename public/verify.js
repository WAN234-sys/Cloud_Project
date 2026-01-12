/** SCE v1.0.1 [BETA] - NOTIFICATION & VERIFICATION ENGINE **/

/**
 * 1. ADMIN QUEUE SYNCHRONIZATION
 * Removes the processed ticket from the Admin's terminal to prevent 
 * duplicate reconstitutions once the user has claimed the asset.
 */
async function clearAdminTicket(claimKey) {
    console.log(`[VAULT_SYNC] Purging key: ${claimKey}`);
    
    try {
        const response = await fetch('/api/admin/clear-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: claimKey })
        });

        if (response.ok) {
            console.log("[VAULT_SYNC] Admin database synchronized.");
        }
    } catch (err) {
        console.warn("[VAULT_SYNC] Network failure during ticket purge.");
    }
}

/**
 * 2. PRIMARY VERIFICATION HANDSHAKE
 * Validates the user's input, updates the persistent global state, 
 * and triggers the final visual success sequence.
 */
async function verifyOwnership() {
    const input = document.getElementById('verify_key_input');
    const claimBtn = document.querySelector('#minibox-ui .btn-transmit');
    
    if (!input) return;
    const key = input.value.trim();

    // Field Validation
    if (!key) {
        if (window.logToNoA) window.logToNoA("HANDSHAKE_ERR: Key required for extraction.", "ERR");
        return;
    }

    // Phase 1: Interactive Feedback
    if (claimBtn) {
        claimBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> LINKING...';
        claimBtn.disabled = true;
    }

    try {
        // Phase 2: Security Handshake with Server
        const res = await fetch('/api/user/verify-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key })
        });

        if (res.ok) {
            // Phase 3: Global State Purge
            // Notify Admin Bridge to remove the entry
            await clearAdminTicket(key);
            
            // Clear the Red Notification Dot
            const dot = document.getElementById('notif-dot');
            if (dot) dot.style.display = 'none';

            // Update Global Identity Variable
            if (window.currentUser) {
                window.currentUser.newRestoreAvailable = false;
            }

            // Phase 4: Success Diagnostics
            if (window.logToNoA) {
                window.logToNoA(`VAULT_ACCESS: Key ${key} accepted. Asset released.`, "SYS");
            }
            
            // Phase 5: Success Modal Activation
            // Defined in success_modal.html logic
            if (typeof window.showClaimPopup === 'function') {
                window.showClaimPopup(key);
            }

            // Phase 6: Refresh Repository
            // The file will now appear with the 'recovered' class (Gold Star)
            if (window.fetchFiles) window.fetchFiles();

            // Clear input for security
            input.value = '';

        } else {
            // Phase 7: Rejection Logic
            if (window.logToNoA) window.logToNoA(`REJECTED: ${key} not found in vault.`, "ERR");
            
            // Reset Button for Retry
            if (claimBtn) {
                claimBtn.innerText = "CLAIM ASSET";
                claimBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error("[CRITICAL] Verification protocol timeout.", err);
        if (window.logToNoA) window.logToNoA("SYS_ERR: Vault link severed.", "ERR");
        
        if (claimBtn) {
            claimBtn.innerText = "RETRY_LINK";
            claimBtn.disabled = false;
        }
    }
}

// Global Export for Minibox/NoA UI bindings
window.verifyOwnership = verifyOwnership;