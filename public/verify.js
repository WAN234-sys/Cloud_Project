/** SCE v0.3.41 [BETA] - NOTIFICATION INTERCEPTOR **/

/**
 * 1. ADMIN NOTIFICATION PURGE
 * Logic: Sends a background signal to the server to remove the 
 * ticket from the Admin Queue once the key is validated.
 */
async function clearAdminTicket(claimKey) {
    console.log(`[PROTOCOL] Requesting ticket purge for: ${claimKey}`);
    
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
        console.warn("[VAULT] Background sync failed. Admin may require manual clear.");
    }
}

/**
 * 2. PRIMARY VERIFICATION WRAPPER
 * Overrides the standard verification to include the purge sequence.
 */
async function verifyOwnership() {
    const input = document.getElementById('verify_key_input');
    const key = input.value.trim();

    if (!key) {
        alert("SYSTEM ERROR: Claim Key field is empty.");
        return;
    }

    // Visual feedback: Start transmission
    const claimBtn = document.querySelector('#verify-box .btn-transmit');
    if (claimBtn) {
        claimBtn.innerText = "LINKING...";
        claimBtn.disabled = true;
    }

    try {
        // 1. Validate the key with the Security Vault
        const res = await fetch('/api/user/verify-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key })
        });

        if (res.ok) {
            // 2. SUCCESS: Trigger the background notification removal for Admin
            await clearAdminTicket(key);
            
            // 3. Clear the local notification dot
            const dot = document.getElementById('notif-dot');
            if (dot) dot.style.display = 'none';

            // 4. Update local state and trigger Success UI (via verifybox.js)
            if (window.currentUser) window.currentUser.newRestoreAvailable = false;
            
            if (typeof showClaimPopup === 'function') {
                showClaimPopup(key);
            }

            console.log(`[SUCCESS] File recovered via ${key}. Admin notified.`);
        } else {
            alert("VERIFICATION FAILED: Invalid or expired key.");
            if (claimBtn) {
                claimBtn.innerText = "CLAIM ASSET";
                claimBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error("CRITICAL: Verification Link Failure.", err);
        alert("CRITICAL: Server sync timeout.");
    }
}

// Attach to global scope for minibox.js accessibility
window.verifyOwnership = verifyOwnership;