/** SCE v1.0.1 [BETA] - NOTIFICATION & VERIFICATION ENGINE **/

/**
 * 1. ADMIN QUEUE SYNCHRONIZATION
 * Clears the processed ticket from the Admin's view once the user 
 * has successfully entered the claim key.
 */
async function clearAdminTicket(claimKey) {
    console.log(`[PROTOCOL] Synchronizing Vault: Purging ${claimKey}`);
    
    try {
        const response = await fetch('/api/admin/clear-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: claimKey })
        });

        if (response.ok) {
            console.log("[VAULT] Admin queue synchronized. Ticket removed.");
        }
    } catch (err) {
        console.warn("[VAULT] Sync failed. Admin may require manual purge.");
    }
}

/**
 * 2. PRIMARY VERIFICATION HANDSHAKE
 * Validates the key with the server, clears UI indicators, and triggers
 * the success sequence for asset reconstitution.
 */
async function verifyOwnership() {
    const input = document.getElementById('verify_key_input');
    const claimBtn = document.querySelector('#minibox-ui .btn-transmit');
    
    if (!input) return;
    const key = input.value.trim();

    if (!key) {
        if (window.logToNoA) window.logToNoA("WARN: Empty claim key field.", "ERR");
        alert("REQUIRED: Enter High-Entropy Claim Key.");
        return;
    }

    // Phase 1: Visual Feedback
    if (claimBtn) {
        claimBtn.innerText = "LINKING...";
        claimBtn.disabled = true;
    }

    try {
        // Phase 2: Server-Side Validation
        const res = await fetch('/api/user/verify-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key })
        });

        if (res.ok) {
            // Phase 3: Post-Verification Purge
            await clearAdminTicket(key);
            
            // Phase 4: UI State Reset
            const dot = document.getElementById('notif-dot');
            if (dot) dot.style.display = 'none';

            if (window.currentUser) {
                window.currentUser.newRestoreAvailable = false;
            }

            // Phase 5: Success Trigger
            // Logs to NoA Terminal and opens the Success Modal
            if (window.logToNoA) {
                window.logToNoA(`SUCCESS: Asset reconstituted via ${key}.`, "SYS");
            }
            
            if (typeof showClaimPopup === 'function') {
                showClaimPopup(key);
            }

            // Phase 6: Sync Repository View
            if (window.fetchFiles) window.fetchFiles();

        } else {
            // Phase 7: Error Handling
            if (window.logToNoA) window.logToNoA(`REJECTED: Key ${key} is invalid.`, "ERR");
            alert("ACCESS DENIED: Verification Key invalid or expired.");
            
            if (claimBtn) {
                claimBtn.innerText = "CLAIM ASSET";
                claimBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error("CRITICAL: Verification Link Failure.", err);
        alert("CONNECTION ERROR: Security Vault unreachable.");
    }
}

// Attach to global scope for Minibox integration
window.verifyOwnership = verifyOwnership;