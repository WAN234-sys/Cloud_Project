/** SCE v1.0.1 [BETA] - GUEST PROTOCOL ENGINE **/

/**
 * --- 1. TAW LOGIC GATE ---
 * Sequence: TAW Checkbox dictates the Auth Pathway.
 * Logic: TAW Checked -> Secure Identity (GitHub) | TAW Unchecked -> Volatile Session (Guest)
 */
function setupTOSListener() {
    const tos = document.getElementById('tosAgree');
    const ghBtn = document.getElementById('ghBtn');
    const guestBtn = document.getElementById('guestBtn');

    if (!tos || !ghBtn || !guestBtn) return;

    // Initialization: Guest is the primary option until TAW is accepted
    console.log("[GUEST] Gateway Logic Primed.");
    guestBtn.classList.remove('disabled');
    guestBtn.style.opacity = "1";
    ghBtn.classList.add('disabled');
    ghBtn.style.opacity = "0.3";
    ghBtn.style.pointerEvents = "none";

    tos.onchange = (e) => {
        const isTawTicked = e.target.checked;

        if (isTawTicked) {
            // TAW ACCEPTED: Unlock Secure GitHub Auth (Identity Preservation On)
            ghBtn.classList.remove('disabled');
            ghBtn.style.pointerEvents = "auto";
            ghBtn.style.opacity = "1";

            // Disable Guest Path (Safety Protocol to prevent accidental data loss)
            guestBtn.classList.add('disabled');
            guestBtn.style.pointerEvents = "none";
            guestBtn.style.opacity = "0.2";
        } else {
            // TAW REJECTED: Lock GitHub Auth
            ghBtn.classList.add('disabled');
            ghBtn.style.pointerEvents = "none";
            ghBtn.style.opacity = "0.3";

            // Restore Guest Path (Volatile Exploration)
            guestBtn.classList.remove('disabled');
            guestBtn.style.pointerEvents = "auto";
            guestBtn.style.opacity = "1";
        }
    };
}

/**
 * --- 2. REDACTION PROTOCOL ---
 * Requirement: Volatile sessions (Guests) cannot view Community IP.
 * Logic: Blurs and renames assets for Guest accounts.
 */
function getSecureDisplayInfo(file) {
    if (window.currentUser && window.currentUser.isGuest) {
        return {
            name: "REDACTED_ASSET.c",
            owner: "HIDDEN_IDENTITY",
            isLocked: true,
            // Visual blurring for Guest sessions to protect asset privacy
            style: "filter: blur(4px); opacity: 0.5; user-select: none; pointer-events: none;"
        };
    }
    return {
        name: file.displayName || file.name,
        owner: file.owner,
        isLocked: false,
        style: ""
    };
}

/**
 * --- 3. UI RESTRICTION ENGINE ---
 * Requirement: Visually locks the interface to inform the guest of read-only state.
 */
function applyGuestRestrictions() {
    if (!window.currentUser || !window.currentUser.isGuest) return;

    console.log("[GUEST] Applying volatile session restrictions...");

    // 1. Redact Repository Headers
    const communityHeader = document.querySelector('.section-title');
    if (communityHeader) {
        communityHeader.innerHTML = 'COMMUNITY ARCHIVE <span class="badge-guest" style="background:#333; color:#777; font-size: 10px; padding: 2px 5px;">READ_ONLY</span>';
    }

    // 2. Disable Upload Interface (Transmission)
    const uploadSection = document.getElementById('drop-zone');
    const fileInput = document.getElementById('cfile');
    if (uploadSection) {
        uploadSection.style.opacity = "0.3";
        uploadSection.style.cursor = "not-allowed";
        uploadSection.onclick = (e) => {
            e.preventDefault();
            alert("GUEST_RESTRICTION: Establish Neural Link (GitHub) to transmit assets.");
        };
    }
    if (fileInput) fileInput.disabled = true;

    // 3. Inform the User via the prompt
    const fileLabel = document.getElementById('file-label-text');
    if (fileLabel) fileLabel.innerText = "IDENTITY UNVERIFIED - UPLOAD DISABLED";
}

// Global Initialization for Gateway Page
document.addEventListener('DOMContentLoaded', () => {
    // Only run if we are on the login/gateway page
    if (document.getElementById('tosAgree')) {
        setupTOSListener();
    }
});