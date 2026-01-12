/** SCE v1.0.4 [STABLE] - IDENTITY & HANDSHAKE ENGINE **/

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
 */
async function initUserSession() {
    try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();

        if (data.authenticated) {
            // FIXED: Explicit mapping to prevent undefined states
            window.currentUser = {
                username: data.username || 'Unknown_User',
                avatar: data.avatar || null,
                isAdmin: !!data.isAdmin,
                isGuest: !!data.isGuest,
                authenticated: true,
                newRestoreAvailable: false
            };
            
            // FIXED: Updated IDs to match v1.0.4 HTML
            const gateway = document.getElementById('auth-session'); // Was auth-section
            const dashboard = document.getElementById('main-ui');
            const miniboxTrigger = document.getElementById('minibox-trigger');
            const avatarImg = document.getElementById('user-avatar');

            if (gateway) gateway.style.display = 'none';
            if (dashboard) dashboard.style.display = 'block';
            if (miniboxTrigger) miniboxTrigger.style.display = 'flex';
            
            // Update Avatar in Nav
            if (avatarImg && window.currentUser.avatar) {
                avatarImg.src = window.currentUser.avatar;
            }
            
            renderProfile();
            startRecoveryHandshake();
            
            // Link to Repo logic
            if (window.Repo && typeof window.Repo.refreshVault === 'function') {
                window.Repo.refreshVault();
            }
            
            console.log(`[SYS] Identity Verified: ${window.currentUser.username}`);
        }
    } catch (err) {
        console.warn("SCE_SESSION: Gateway active. Waiting for Auth handshake.");
    }
}

/**
 * 2. PROFILE RENDERING
 */
function renderProfile() {
    // FIXED: Corrected ID to pfp-anchor based on your nav hub
    const anchor = document.getElementById('pfp-anchor') || document.getElementById('profile-anchor');
    if (!anchor) return;

    // Note: We update the existing elements rather than overwriting innerHTML 
    // to preserve event listeners on the PFP.
    const nameDisplay = document.querySelector('.nav-username');
    if (nameDisplay) {
        const roleBadge = window.currentUser.isAdmin ? '<span class="badge-admin" style="color:#ffd700; font-size:9px;">[ADMIN_LINK]</span>' : '';
        nameDisplay.innerHTML = `${window.currentUser.username} ${roleBadge}`;
    }
}

/**
 * 3. RECOVERY HANDSHAKE PROTOCOL
 */
async function startRecoveryHandshake() {
    if (window.currentUser.isGuest || !window.currentUser.authenticated) return;

    const checkVault = async () => {
        try {
            const res = await fetch('/api/user/check-recovery');
            const data = await res.json();

            if (data.ready) {
                window.currentUser.newRestoreAvailable = true;
                
                // FIXED: Shield/Notif dot logic
                const dot = document.getElementById('shield-notif') || document.getElementById('notif-dot');
                if (dot) dot.style.display = 'block';
                
                // FIXED: Corrected Case-Sensitivity for NoA
                if (window.NoA && typeof window.NoA.log === 'function') {
                    window.NoA.log("RECONSTITUTION_AUTH: Claim token ready for " + data.filename, "WARN");
                }

                // Trigger popup if defined in repo.js
                if (window.Repo && window.Repo.displayClaimPopup && data.claimKey) {
                    window.Repo.displayClaimPopup(data.claimKey);
                }
            }
        } catch (e) {
            console.error("[SYS] Handshake Signal Interrupted.");
        }
    };

    checkVault();
    setInterval(checkVault, 45000);
}

document.addEventListener('DOMContentLoaded', initUserSession);