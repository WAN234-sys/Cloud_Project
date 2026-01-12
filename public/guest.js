/** SCE v1.0.3 [BETA] - GUEST PROTOCOL ENGINE **/

const GuestProtocol = {
    /**
     * --- 1. LOGIN GATE LOGIC (TAW Handshake) ---
     * TAW Checked -> Enable GitHub
     * TAW Unchecked -> Enable Guest Only
     */
    setupGateway: () => {
        const tos = document.getElementById('taw-check');
        const ghBtn = document.querySelector('.btn-github');
        const guestBtn = document.querySelector('.btn-guest');

        if (!tos || !ghBtn || !guestBtn) return;

        // Default State: Only Guest is active until TAW is accepted
        ghBtn.style.pointerEvents = "none";
        ghBtn.style.opacity = "0.3";
        guestBtn.style.pointerEvents = "auto";
        guestBtn.style.opacity = "1";

        tos.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Unlock Secure GitHub Link
                ghBtn.style.pointerEvents = "auto";
                ghBtn.style.opacity = "1";
                // Lock Guest to prevent accidental volatile session
                guestBtn.style.pointerEvents = "none";
                guestBtn.style.opacity = "0.2";
            } else {
                ghBtn.style.pointerEvents = "none";
                ghBtn.style.opacity = "0.3";
                guestBtn.style.pointerEvents = "auto";
                guestBtn.style.opacity = "1";
            }
        });
    },

    /**
     * --- 2. ASSET REDACTION ---
     * Blurs and renames all files if the user is a Guest.
     */
    getSecureDisplayInfo: (file) => {
        const isGuest = window.currentUser?.isGuest || window.currentUser?.username?.includes('Guest');
        
        if (isGuest) {
            return {
                name: "ENCRYPTED_ASSET.bin",
                owner: "REDACTED",
                isLocked: true,
                style: "filter: blur(8px) grayscale(1); opacity: 0.5; pointer-events: none;"
            };
        }
        return {
            name: file.name,
            owner: "Authorized User",
            isLocked: false,
            style: ""
        };
    },

    /**
     * --- 3. SYSTEM LOCKDOWN ---
     * "make guest cant interact anything in the website".
     */
    applyLockdown: () => {
        const isGuest = window.currentUser?.isGuest;
        if (!isGuest) return;

        console.warn("[GUEST] System Lockdown Active.");

        // Disable "upload project"
        const zone = document.getElementById('upload-zone');
        if (zone) {
            zone.style.pointerEvents = "none";
            zone.style.filter = "grayscale(1) opacity(0.5)";
            zone.innerHTML = "<p><i class='fas fa-lock'></i> LOGIN REQUIRED TO UPLOAD</p>";
        }

        // Disable Terminal Interaction
        const termInput = document.getElementById('terminal-input');
        if (termInput) {
            termInput.disabled = true;
            termInput.placeholder = "TERMINAL_LOCKED";
        }

        // Apply visual blur to the Archive Module
        const archive = document.querySelector('.archive-module');
        if (archive) {
            archive.style.userSelect = "none";
        }
    }
};

// Initialize listeners
document.addEventListener('DOMContentLoaded', () => {
    GuestProtocol.setupGateway();
    
    // Check status after Core.js finishes identity handshake
    setTimeout(() => {
        GuestProtocol.applyLockdown();
    }, 600);
});