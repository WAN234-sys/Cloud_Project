/** SCE v1.0.4 [STABLE] - GUEST PROTOCOL ENGINE **/

const GuestProtocol = {
    /**
     * 1. LOGIN GATE LOGIC
     * Manages button states on the Login Page.
     */
    setupGateway: () => {
        const tos = document.getElementById('taw-check');
        const ghBtn = document.querySelector('.btn-github');
        const guestBtn = document.querySelector('.btn-guest');

        if (!tos || !ghBtn || !guestBtn) return;

        // Initialize state
        GuestProtocol.toggleButtons(tos.checked, ghBtn, guestBtn);

        tos.addEventListener('change', (e) => {
            GuestProtocol.toggleButtons(e.target.checked, ghBtn, guestBtn);
        });
    },

    toggleButtons: (isTawChecked, ghBtn, guestBtn) => {
        if (isTawChecked) {
            ghBtn.style.pointerEvents = "auto";
            ghBtn.style.opacity = "1";
            guestBtn.style.pointerEvents = "none";
            guestBtn.style.opacity = "0.2";
        } else {
            ghBtn.style.pointerEvents = "none";
            ghBtn.style.opacity = "0.3";
            guestBtn.style.pointerEvents = "auto";
            guestBtn.style.opacity = "1";
        }
    },

    /**
     * 2. SYSTEM LOCKDOWN (Mechanical & Visual)
     */
    applyLockdown: () => {
        const isGuest = window.currentUser?.user?.isGuest;
        if (!isGuest) return;

        console.warn("[GUEST] System Lockdown Protocol: ENGAGED.");

        // A. Disable Upload Zone
        const zone = document.getElementById('upload-zone');
        if (zone) {
            zone.style.pointerEvents = "none";
            zone.style.filter = "grayscale(1) contrast(0.5)";
            zone.innerHTML = `
                <i class='fas fa-lock' style="color: #555;"></i>
                <p style="color: #555;">ENCRYPTED: AUTHORIZATION REQUIRED</p>
            `;
        }

        // B. Disable Terminal Input
        // Note: Check for both potential IDs used in terminal.html
        const termInput = document.getElementById('terminal-input') || document.querySelector('.terminal-prompt input');
        if (termInput) {
            termInput.disabled = true;
            termInput.value = "";
            termInput.placeholder = "GUEST_SESSION_RESTRICTED";
            termInput.parentElement.style.opacity = "0.5";
        }

        // C. Visual Redaction of Archive
        const archiveGrid = document.getElementById('file-list-container');
        if (archiveGrid) {
            archiveGrid.style.filter = "blur(4px)";
            archiveGrid.style.pointerEvents = "none";
            archiveGrid.style.userSelect = "none";
        }
        
        // D. Hide Secret Shield
        const shield = document.getElementById('recovery-shield-trigger');
        if (shield) shield.style.display = 'none';
    }
};

/**
 * 3. EXECUTION HANDLER
 * Waits for the Bridge to finish its work before applying locks.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup the Login Gate (for Login Page)
    GuestProtocol.setupGateway();
});

// 2. Setup the Lockdown (for Dashboard) - Triggers after Bridge Identity Sync
document.addEventListener('SCE_COMPONENTS_READY', () => {
    // Small delay to ensure syncIdentity finished updating window.currentUser
    setTimeout(GuestProtocol.applyLockdown, 100);
});