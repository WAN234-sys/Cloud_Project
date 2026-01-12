/** SCE v1.0.4 [STABLE] - MASTER BRIDGE & IDENTITY CORE **/

const SYSTEM_COMPONENTS = [
    { mountId: 'modal-mount', file: 'success_modal.html' },
    { mountId: 'terminal-mount', file: 'terminal.html' }
];

let currentUser = null;
let recoveryCheckInterval = null;

/**
 * 1. INITIALIZATION FLOW
 * This sequence ensures components exist BEFORE identity logic runs.
 */
async function bootstrap() {
    console.log("%c[SYSTEM] Initiating Neural Handshake...", "color: #00ff41; font-weight: bold;");
    
    // Step A: Load HTML Components (Modals/Terminals)
    await mountSystemComponents();
    
    // Step B: Sync User Identity
    await syncIdentity();
}

/**
 * 2. COMPONENT LOADER
 */
async function mountSystemComponents() {
    const promises = SYSTEM_COMPONENTS.map(async (component) => {
        try {
            const response = await fetch(component.file);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const html = await response.text();
            
            const mountPoint = document.getElementById(component.mountId);
            if (mountPoint) {
                mountPoint.innerHTML = html;
                console.log(`[BRIDGE] Mounted: ${component.file}`);
            }
        } catch (err) {
            console.error(`[BRIDGE_ERR] Failed to mount ${component.file}:`, err);
        }
    });
    return Promise.all(promises);
}

/**
 * 3. IDENTITY SYNC (Formerly core.js)
 */
async function syncIdentity() {
    try {
        const res = await fetch('/api/auth/status');
        currentUser = await res.json();
        window.currentUser = currentUser;

        if (currentUser.authenticated) {
            document.getElementById('auth-session').style.display = 'none';
            document.getElementById('main-ui').style.display = 'block';

            // Set Avatar
            const avatar = document.getElementById('user-avatar');
            if (avatar) avatar.src = currentUser.user.avatar || "/assets/default.png";

            // Hide shield if Admin
            const shield = document.getElementById('recovery-shield-trigger');
            if (currentUser.user.isAdmin && shield) {
                shield.style.display = 'none';
            }

            // Start polling for keys if user isn't Admin
            if (!currentUser.user.isAdmin) startRecoveryPolling();
            
            // Apply lockdown if Guest
            if (currentUser.user.isGuest) {
                const ui = document.getElementById('main-ui');
                ui.style.filter = 'grayscale(1)';
                ui.style.pointerEvents = 'none';
            }
        }
    } catch (err) {
        console.error("[CORE] Handshake Failed.");
    }
}

/**
 * 4. RECOVERY POLLING
 */
function startRecoveryPolling() {
    if (recoveryCheckInterval) clearInterval(recoveryCheckInterval);
    recoveryCheckInterval = setInterval(async () => {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        if (data.recoveryReady) {
            const dot = document.getElementById('shield-notif');
            if (dot) dot.style.display = 'block';
            clearInterval(recoveryCheckInterval); // Stop once found
        }
    }, 15000);
}

/**
 * 5. EXPORTED UTILITIES
 */
function toggleProfileMenu() {
    const menu = document.getElementById('profile-ext');
    if (menu) {
        const isHidden = menu.style.display === 'none' || menu.style.display === '';
        menu.style.display = isHidden ? 'block' : 'none';
    }
}

async function submitRecoveryRequest() {
    const input = document.getElementById('recover-filename');
    const filename = input ? input.value.trim() : null;
    if (!filename) return;

    const res = await fetch('/api/admin/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
    });

    if (res.ok) {
        document.getElementById('recovery-mini-box').style.display = 'none';
        document.getElementById('shield-notif').style.display = 'block';
        input.value = '';
    }
}

// Global Triggers
document.addEventListener('DOMContentLoaded', bootstrap);
window.toggleProfileMenu = toggleProfileMenu;
window.submitRecoveryRequest = submitRecoveryRequest;