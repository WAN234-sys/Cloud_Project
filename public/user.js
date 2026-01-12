/** SCE v1.0.1 [BETA] - IDENTITY & HANDSHAKE ENGINE **/

// Global User State
window.currentUser = {
    username: 'Guest',
    avatar: null,
    isAdmin: false,
    isGuest: true,
    authenticated: false,
    newRestoreAvailable: false
};

/**
 * 1. IDENTITY INITIALIZATION
 * Fetches session data and toggles between the Login Gateway and the Main HUD.
 */
async function initUserSession() {
    try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();

        if (data.authenticated) {
            window.currentUser = {
                ...data,
                newRestoreAvailable: false
            };
            
            // Transition to System UI
            const authSection = document.getElementById('auth-section');
            const mainUI = document.getElementById('main-ui');
            const minibox = document.getElementById('minibox-trigger');

            if (authSection) authSection.style.display = 'none';
            if (mainUI) mainUI.style.display = 'block';
            if (minibox) minibox.style.display = 'flex';
            
            renderProfile();
            
            // Start Background Handshake Protocol
            startRecoveryHandshake();
            
            // Trigger initial Cloud Asset Sync
            if (window.fetchFiles) window.fetchFiles();
        }
    } catch (err) {
        console.warn("SCE_SESSION: Standing by at Gateway. Authentication required.");
    }
}

/**
 * 2. PROFILE RENDERING
 * Injects the identity card into the Navigation Hub.
 */
function renderProfile() {
    const anchor = document.getElementById('profile-anchor');
    if (!anchor) return;

    const roleTag = window.currentUser.isAdmin ? '<span class="badge-admin">ADMIN</span>' : '';
    const sessionLabel = window.currentUser.isGuest ? 'VOLATILE_SESSION' : 'SECURED_VIA_TAW';

    anchor.innerHTML = `
        <div class="profile-card">
            <div class="profile-info">
                <span class="nav-username">${window.currentUser.username} ${roleTag}</span>
                <span class="nav-logout-wrap">
                    <span style="font-size:8px; color:var(--text-muted);">${sessionLabel}</span>
                    <a href="/api/auth/logout" class="nav-logout" title="Terminate Link"> // DISCONNECT</a>
                </span>
            </div>
            <img src="${window.currentUser.avatar || 'https://via.placeholder.com/32'}" class="nav-avatar">
        </div>
    `;
}

/**
 * 3. RECOVERY HANDSHAKE PROTOCOL
 * Periodically polls the server to see if an Admin reconstituted an asset.
 */
async function startRecoveryHandshake() {
    // Only authenticated, non-guest users participate in TAW recovery
    if (window.currentUser.isGuest || !window.currentUser.authenticated) return;

    const checkVault = async () => {
        try {
            const res = await fetch('/api/user/check-recovery');
            const data = await res.json();

            if (data.ready) {
                window.currentUser.newRestoreAvailable = true;
                
                // Trigger the Minibox Visual Notification (Red Dot)
                const dot = document.getElementById('notif-dot');
                if (dot) dot.style.display = 'block';
                
                // If NoA is online, log the event to her terminal
                if (window.logToNoA) {
                    window.logToNoA(`NOTIFICATION: Asset [${data.filename}] reconstituted. Key ready.`, "INFO");
                }

                // If the user currently has the Minibox UI open, refresh its content
                const miniboxUI = document.getElementById('minibox-ui');
                if (miniboxUI && miniboxUI.style.display === 'block') {
                    if (window.renderMiniboxContent) window.renderMiniboxContent();
                }
            }
        } catch (e) {
            console.error("SCE_HANDSHAKE: Signal lost. Retrying...");
        }
    };

    // Immediate check on boot, then every 45 seconds to minimize server load
    checkVault();
    setInterval(checkVault, 45000);
}

// Global initialization
document.addEventListener('DOMContentLoaded', initUserSession);