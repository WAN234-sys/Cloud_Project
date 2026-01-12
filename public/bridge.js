/** SCE v1.0.3 [BETA] - CENTRAL BRIDGE & COMPONENT LOADER **/

const SYSTEM_COMPONENTS = [
    { mountId: 'modal-mount', file: 'success_modal.html' },
    { mountId: 'terminal-mount', file: 'terminal.html' }
];

/**
 * 1. NEURAL COMPONENT LOADER
 */
async function mountSystemComponents() {
    for (const component of SYSTEM_COMPONENTS) {
        try {
            const response = await fetch(component.file);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const html = await response.text();
            document.getElementById(component.mountId).innerHTML = html;
            console.log(`[BRIDGE] Component Mounted: ${component.file}`);
        } catch (err) {
            console.error(`[BRIDGE_ERR] Failed to mount ${component.file}:`, err);
        }
    }
}

/**
 * 2. MODAL ACTIVATION (The Reward Phase)
 * This function is called by user.js when the Admin releases a key.
 */
function prepareClaimModal(claimKey, filename) {
    const popup = document.getElementById('claim-popup');
    const keyDisplay = document.getElementById('claim-key-display');
    const titleDisplay = document.querySelector('.modal-title');

    if (!popup || !keyDisplay) {
        console.error("[BRIDGE] Modal components not found in DOM.");
        return;
    }

    // Inject real-time data into the modal
    keyDisplay.innerText = claimKey;
    titleDisplay.innerText = "ASSET_RECONSTITUTED: " + filename.toUpperCase();

    // Trigger visual reveal
    popup.style.display = 'flex';
    
    // Clear notifications since the user has seen the asset
    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = 'none';
}

/**
 * 3. ASSET RECOVERY REQUEST (The Request Phase)
 */
async function submitRecoveryRequest() {
    const filenameInput = document.getElementById('recover-filename');
    const filename = filenameInput ? filenameInput.value.trim() : null;

    if (!filename) return;

    try {
        const res = await fetch('/api/recovery-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });

        if (res.ok) {
            document.getElementById('recovery-mini-box').style.display = 'none';
            // Show the "pending" pulse on the shield
            const shieldNotif = document.getElementById('shield-notif');
            if (shieldNotif) shieldNotif.style.display = 'block';
            filenameInput.value = '';
        }
    } catch (err) {
        console.error("[BRIDGE] Recovery request failed:", err);
    }
}

/**
 * 4. UI INTERACTION LOGIC
 */
function handleShieldClick() {
    const minibox = document.getElementById('recovery-mini-box');
    if (minibox) {
        minibox.style.display = minibox.style.display === 'none' ? 'block' : 'none';
    }
}

function toggleProfileMenu() {
    const menu = document.getElementById('profile-ext');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', mountSystemComponents);

// Export to Global Window
window.prepareClaimModal = prepareClaimModal;
window.submitRecoveryRequest = submitRecoveryRequest;
window.handleShieldClick = handleShieldClick;
window.toggleProfileMenu = toggleProfileMenu;