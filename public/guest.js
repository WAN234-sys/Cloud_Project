/** SCE v0.3.41 [BETA] - GUEST PROTOCOL ENGINE **/

/**
 * 1. TAW LOGIC GATE
 * Sequence: TAW Checkbox dictates which Auth Pathway is available.
 * Logic: TAW Checked -> GitHub (Protection On) | TAW Unchecked -> Guest (Volatile)
 */
function setupTOSListener() {
    const tos = document.getElementById('tosAgree');
    const ghBtn = document.getElementById('ghBtn');
    const guestBtn = document.getElementById('guestBtn');

    if (!tos || !ghBtn || !guestBtn) return;

    // Default v0.3.41 State: Guest is primary option until TAW is accepted
    guestBtn.classList.remove('disabled');
    guestBtn.style.opacity = "1";
    ghBtn.classList.add('disabled');
    ghBtn.style.opacity = "0.3";

    tos.onchange = (e) => {
        const isTawTicked = e.target.checked;

        if (isTawTicked) {
            // TAW ACCEPTED: Unlock Secure GitHub Auth
            ghBtn.classList.remove('disabled');
            ghBtn.style.pointerEvents = "auto";
            ghBtn.style.opacity = "1";

            // Disable Guest Path (Safety Protocol)
            guestBtn.classList.add('disabled');
            guestBtn.style.pointerEvents = "none";
            guestBtn.style.opacity = "0.2";
        } else {
            // TAW REJECTED: Lock GitHub Auth
            ghBtn.classList.add('disabled');
            ghBtn.style.pointerEvents = "none";
            ghBtn.style.opacity = "0.3";

            // Restore Guest Path
            guestBtn.classList.remove('disabled');
            guestBtn.style.pointerEvents = "auto";
            guestBtn.style.opacity = "1";
        }
    };
}

/**
 * 2. REDACTION PROTOCOL (v0.3.41)
 * Requirement: Volatile sessions cannot see community IP.
 * Applied to: File List and Terminal Outputs.
 */
function getSecureDisplayInfo(file) {
    if (window.currentUser && window.currentUser.isGuest) {
        return {
            name: "REDACTED_ASSET.c",
            owner: "HIDDEN_IDENTITY",
            isLocked: true,
            // Visual blurring for Guest sessions
            style: "filter: blur(5px); opacity: 0.6; user-select: none; pointer-events: none;"
        };
    }
    return {
        name: file.displayName,
        owner: file.owner,
        isLocked: false,
        style: ""
    };
}

/**
 * 3. GUEST REPOSITORY VIEW ADAPTATION
 * Requirement: Inform the guest they are in a restricted read-only environment.
 */
function renderGuestRestrictedUI() {
    if (!window.currentUser || !window.currentUser.isGuest) return;

    const communityHeader = document.querySelector('.section-title');
    if (communityHeader) {
        communityHeader.innerHTML = 'COMMUNITY ARCHIVE <span class="badge-admin" style="background:#444; color:#aaa;">LOCKED</span>';
    }

    // Block transmission UI
    const uploadSection = document.getElementById('drop-zone');
    if (uploadSection) {
        uploadSection.style.opacity = "0.2";
        uploadSection.style.cursor = "not-allowed";
        document.getElementById('file-label-text').innerText = "TRANSMISSION DISABLED FOR GUESTS";
    }
}

// Global Initialization for Login Screen
document.addEventListener('DOMContentLoaded', () => {
    setupTOSListener();
});