/** SCE v1.0.1 [BETA] - GUEST PROTOCOL ENGINE **/

/**
 * --- 1. TAW LOGIC GATE (Gateway Page) ---
 * TAW Checked -> Enable GitHub (Identity Preservation)
 * TAW Unchecked -> Enable Guest (Volatile Session)
 */
function setupTOSListener() {
    const tos = document.getElementById('tosAgree');
    const ghBtn = document.getElementById('ghBtn');
    const guestBtn = document.getElementById('guestBtn');

    if (!tos || !ghBtn || !guestBtn) return;

    // Default: Guest mode is the gateway entry until TAW (Terms) is accepted
    console.log("[GUEST] Gateway Security Protocol Primed.");
    guestBtn.classList.remove('disabled');
    guestBtn.style.opacity = "1";
    ghBtn.classList.add('disabled');
    ghBtn.style.opacity = "0.3";
    ghBtn.style.pointerEvents = "none";

    tos.onchange = (e) => {
        const isTawTicked = e.target.checked;

        if (isTawTicked) {
            // UNLOCK GITHUB: Neural Link Authorized
            ghBtn.classList.remove('disabled');
            ghBtn.style.pointerEvents = "auto";
            ghBtn.style.opacity = "1";

            // LOCK GUEST: Prevent accidental volatile login
            guestBtn.classList.add('disabled');
            guestBtn.style.pointerEvents = "none";
            guestBtn.style.opacity = "0.2";
        } else {
            // LOCK GITHUB: Identity Verification Declined
            ghBtn.classList.add('disabled');
            ghBtn.style.pointerEvents = "none";
            ghBtn.style.opacity = "0.3";

            // UNLOCK GUEST: Allow Read-Only Exploration
            guestBtn.classList.remove('disabled');
            guestBtn.style.pointerEvents = "auto";
            guestBtn.style.opacity = "1";
        }
    };
}

/**
 * --- 2. ASSET REDACTION ---
 * Logic: Blurs and renames all files if the user is a Guest.
 */
function getSecureDisplayInfo(file) {
    if (window.currentUser && (window.currentUser.isGuest || window.currentUser.username === 'Guest')) {
        return {
            name: "ENCRYPTED_ASSET.bin",
            owner: "REDACTED",
            isLocked: true,
            // Strict visual blocking for guests
            style: "filter: blur(12px) grayscale(1); opacity: 0.4; user-select: none; pointer-events: none;"
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
 * --- 3. UI LOCKDOWN ENGINE ---
 * Requirement: "make guest cant interact anything in the website"
 */
function applyGuestRestrictions() {
    if (!window.currentUser || !window.currentUser.isGuest) return;

    console.warn("[GUEST] Lockdown Protocol: INTERACTION_DISABLED");

    // 1. Branding Sync
    const scTitle = document.querySelector('.main-header h1');
    if (scTitle) {
        scTitle.innerText = "SC EXPLORER";
        scTitle.style.fontSize = "3.5rem";
    }

    // 2. Disable Search & Terminal Interaction
    const searchBar = document.getElementById('search-input');
    const termInput = document.getElementById('term-input');
    
    if (searchBar) {
        searchBar.disabled = true;
        searchBar.placeholder = "SEARCH_DISABLED: LOGIN_REQUIRED";
    }
    if (termInput) {
        termInput.disabled = true;
        termInput.placeholder = "TERMINAL_LOCKED";
    }

    // 3. Disable Upload (Transmission)
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        dropZone.style.filter = "blur(5px)";
        dropZone.style.pointerEvents = "none";
        dropZone.innerHTML = "<h4>TRANSMISSION_LOCKED</h4><p>Authenticate via GitHub to Archive Assets</p>";
    }

    // 4. Visual Blur Overlay (Final Security Layer)
    const repoBody = document.getElementById('repo-container');
    if (repoBody) {
        repoBody.style.pointerEvents = "none";
        repoBody.style.userSelect = "none";
    }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tosAgree')) {
        setupTOSListener();
    }
    
    // Auto-apply restrictions if current user is already a guest
    setTimeout(() => {
        if (window.currentUser && window.currentUser.isGuest) {
            applyGuestRestrictions();
        }
    }, 500); // Slight delay to ensure identity sync is finished
});