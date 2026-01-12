/** SCE v1.0.4 [STABLE] - NOTIFICATION & VERIFICATION ENGINE **/

/**
 * 1. ADMIN QUEUE SYNCHRONIZATION
 */
async function clearAdminTicket(claimKey) {
    try {
        // FIXED: Endpoint aligned with SCE v1.0.5 Backend
        await fetch('/api/admin/clear-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: claimKey })
        });
    } catch (err) {
        console.warn("[VAULT_SYNC] Admin terminal state sync pending retry.");
    }
}

/**
 * 2. PRIMARY VERIFICATION HANDSHAKE
 */
async function verifyOwnership() {
    // FIXED: Common ID check for hyphen or underscore
    const input = document.getElementById('verify-key-input') || document.getElementById('verify_key_input');
    const claimBtn = document.querySelector('#minibox-ui .btn-transmit');
    
    if (!input) return;
    const key = input.value.trim();

    if (!key) {
        alert("INPUT_REQUIRED: Enter the Gold Recovery Key.");
        return;
    }

    if (claimBtn) {
        claimBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> LINKING...';
        claimBtn.disabled = true;
    }

    try {
        // FIXED: Aligned with v1.0.5 Backend Endpoint
        const res = await fetch('/api/vault/verify-reconstitution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            // Logic: Purge Admin sidebar (Non-blocking)
            clearAdminTicket(key);
            
            // UI Cleanup
            const dots = ['notif-dot', 'shield-notif'];
            dots.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            if (window.currentUser) window.currentUser.newRestoreAvailable = false;

            // Phase 3: NoA System Log
            if (window.NoA) {
                window.NoA.log(`Asset ${data.filename || ''} successfully reconstituted.`, "SYS");
            }

            // Phase 4: Success Modal Activation
            if (typeof window.prepareClaimModal === 'function') {
                window.prepareClaimModal(key, data.filename || "RECONSTITUTED_ASSET.c");
            }

            // Phase 5: Refresh Repo (SCE standard refresh)
            if (window.Repo && typeof window.Repo.refreshVault === 'function') {
                window.Repo.refreshVault();
            } else if (window.fetchFiles) {
                window.fetchFiles();
            }

            input.value = '';

        } else {
            alert(data.error || "REJECTED: Invalid or Expired Key.");
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

window.verifyOwnership = verifyOwnership;