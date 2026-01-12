/** SCE v1.0.3 [BETA] - NOTIFICATION & VERIFICATION ENGINE **/

/**
 * 1. ADMIN QUEUE SYNCHRONIZATION
 * Purges the processed ticket from the Admin's view.
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
            console.log("[VAULT_SYNC] Admin terminal state synchronized.");
        }
    } catch (err) {
        console.warn("[VAULT_SYNC] Network failure during ticket purge.");
    }
}

/**
 * 2. PRIMARY VERIFICATION HANDSHAKE
 * Validates the Gold Key and releases the asset.
 */
async function verifyOwnership() {
    const input = document.getElementById('verify_key_input');
    const claimBtn = document.querySelector('#minibox-ui .btn-transmit');
    
    if (!input) return;
    const key = input.value.trim();

    // Field Validation
    if (!key) {
        alert("INPUT_REQUIRED: Enter the Gold Recovery Key.");
        return;
    }

    // Phase 1: Interactive Feedback (Loading State)
    if (claimBtn) {
        claimBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> LINKING...';
        claimBtn.disabled = true;
    }

    try {
        // Phase 2: Security Handshake with Server (POST to verify-key)
        const res = await fetch('/api/user/verify-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key })
        });

        if (res.ok) {
            // Phase 3: Global Cleanup
            // Tell Admin Terminal to remove this request from the sidebar
            await clearAdminTicket(key);
            
            // Clear the Notification dots
            const dot = document.getElementById('notif-dot');
            const shieldNotif = document.getElementById('shield-notif');
            if (dot) dot.style.display = 'none';
            if (shieldNotif) shieldNotif.style.display = 'none';

            // Update local user state
            if (window.currentUser) {
                window.currentUser.newRestoreAvailable = false;
            }

            // Phase 4: Success Modal Activation
            // This triggers the gold popup built in success_modal.html
            if (typeof window.prepareClaimModal === 'function') {
                // We pass the key back to show the confirmation
                window.prepareClaimModal(key, "RECONSTITUTED_ASSET.c");
            }

            // Phase 5: Refresh Repository
            // This will re-fetch files and the target file will now have the 'recovered' star
            if (window.fetchFiles) window.fetchFiles();

            // Clear input for security
            input.value = '';

        } else {
            // Phase 6: Rejection Logic
            alert("REJECTED: Invalid or Expired Key.");
            
            // Reset Button for Retry
            if (claimBtn) {
                claimBtn.innerText = "CLAIM ASSET";
                claimBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error("[CRITICAL] Verification protocol timeout.", err);
        
        if (claimBtn) {
            claimBtn.innerText = "RETRY_LINK";
            claimBtn.disabled = false;
        }
    }
}

// Global Export
window.verifyOwnership = verifyOwnership;