/** SCE v1.0.1 [BETA] - IDENTITY & HANDSHAKE ENGINE **/

// Global User State - Synchronized with Server Session
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
 * Bridges the Gateway (Login) and the Main UI.
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
            
            // Transition Logic: Hide Gateway, Reveal Dashboard
            const gateway = document.getElementById('auth-section');
            const dashboard = document.getElementById('main-ui');
            const miniboxTrigger = document.getElementById('minibox-trigger');

            if (gateway) gateway.style.display = 'none';
            if (dashboard) dashboard.style.display = 'block';
            if (miniboxTrigger) miniboxTrigger.style.display = 'flex';
            
            renderProfile();
            
            // Activate High-Level Handshakes
            startRecoveryHandshake();
            
            // Trigger Cloud Asset Fetch
            if (window.fetchFiles) window.fetchFiles();
            
            console.log(`[SYS] Identity Verified: ${window.currentUser.username}`);
        }
    } catch (err) {
        console.warn("SCE_SESSION: Gateway active. Waiting for Auth handshake.");
    }
}

/**
 * 2. PROFILE RENDERING
 * Injects verified credentials into the Navigation Hub.
 */
function renderProfile() {
    const anchor = document.getElementById('profile-anchor');
    if (!anchor) return;

    const isAdmin = window.currentUser.isAdmin;
    const isGuest = window.currentUser.isGuest;
    
    const roleBadge = isAdmin ? '<span class="badge-admin">ADMIN_LINK</span>' : '';
    const sessionType = isGuest ? 'VOLATILE_GUEST' : 'SECURED_ID';

    anchor.innerHTML = `
        <div class="profile-card">
            <div class="profile-info">
                <div class="nav-username">${window.currentUser.username} ${roleBadge}</div>
                <div class="nav-meta">
                    <span class="status-indicator">ONLINE</span>
                    <span class="session-label">${sessionType}</span>
                    <a href="/api/auth/logout" class="nav-logout"> // TERMINATE</a>
                </div>
            </div>
            <img src="${window.currentUser.avatar || 'assets/default-avatar.png'}" class="nav-avatar">
        </div>
    `;
}

/**
 * 3. RECOVERY HANDSHAKE PROTOCOL
 * Asynchronous polling to check for Admin-released keys in the Vault.
 */
async function startRecoveryHandshake() {
    // Guests do not have Vault access
    if (window.currentUser.isGuest || !window.currentUser.authenticated) return;

    const checkVault = async () => {
        try {
            const res = await fetch('/api/user/check-recovery');
            const data = await res.json();

            if (data.ready) {
                window.currentUser.newRestoreAvailable = true;
                
                // 1. Visual Notification Dot
                const dot = document.getElementById('notif-dot');
                if (dot) dot.style.display = 'block';
                
                // 2. NoA Terminal Injection
                if (window.noa && typeof window.noa.log === 'function') {
                    window.noa.log("CRITICAL: Reconstitution protocol authorized for " + data.filename, "WARN");
                }

                // 3. Dynamic Minibox Refresh
                if (window.renderMiniboxContent) {
                    window.renderMiniboxContent();
                }
            }
        } catch (e) {
            console.error("[SYS] Handshake Signal Interrupted.");
        }
    };

    // Initial check + 45s interval for performance optimization
    checkVault();
    setInterval(checkVault, 45000);
}

// Global initialization on DOM Ready
document.addEventListener('DOMContentLoaded', initUserSession);